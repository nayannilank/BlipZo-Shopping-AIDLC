import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK - use vi.hoisted to make mockSend available at hoist time
const { mockSend } = vi.hoisted(() => {
  return { mockSend: vi.fn() };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({ send: mockSend }),
  },
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  BatchGetCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  BatchWriteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  TransactWriteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => ({})),
  InvokeCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

// Set environment variables before importing service
process.env['ORDERS_TABLE_NAME'] = 'blipzo-dev-orders';
process.env['CARTS_TABLE_NAME'] = 'blipzo-dev-carts';
process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
process.env['ADDRESSES_TABLE_NAME'] = 'blipzo-dev-addresses';
process.env['PAYMENT_FUNCTION_NAME'] = 'blipzo-dev-payment';

import { getOrderHistory, getOrderDetail } from './service.js';

describe('getOrderHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated order history sorted by timestamp descending', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          PK: 'ORDER#order-1',
          SK: 'METADATA',
          orderId: 'order-1',
          buyerId: 'buyer-123',
          orderTimestamp: '2024-06-15T10:00:00Z',
          deliveryAddressSnapshot: {
            addressId: 'addr-1',
            buyerId: 'buyer-123',
            fullName: 'John Doe',
            phone: '+919876543210',
            line1: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India',
            isDefault: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          items: [
            {
              productId: 'prod-1',
              name: 'Laptop',
              quantity: 1,
              priceAtPurchase: 999.99,
              subtotal: 999.99,
            },
          ],
          paymentMethod: 'UPI',
          paymentStatus: 'Paid',
          orderStatus: 'Confirmed',
          totalAmount: 999.99,
          transactionId: 'txn-abc',
          GSI1PK: 'BUYER#buyer-123',
          GSI1SK: 'ORDER#2024-06-15T10:00:00Z',
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await getOrderHistory('buyer-123', 20);

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.orderId).toBe('order-1');
    expect(result.orders[0]?.buyerId).toBe('buyer-123');
    expect(result.orders[0]?.orderStatus).toBe('Confirmed');
    expect(result.orders[0]?.totalAmount).toBe(999.99);
    expect(result.orders[0]?.transactionId).toBe('txn-abc');
    expect(result.nextCursor).toBeUndefined();
  });

  it('should return empty list when buyer has no orders', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    const result = await getOrderHistory('buyer-no-orders', 20);

    expect(result.orders).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should include nextCursor when LastEvaluatedKey is present', async () => {
    const lastKey = {
      PK: 'ORDER#order-20',
      SK: 'METADATA',
      GSI1PK: 'BUYER#buyer-123',
      GSI1SK: 'ORDER#2024-01-01T00:00:00Z',
    };

    mockSend.mockResolvedValueOnce({
      Items: [
        {
          orderId: 'order-20',
          buyerId: 'buyer-123',
          orderTimestamp: '2024-01-01T00:00:00Z',
          deliveryAddressSnapshot: {},
          items: [],
          paymentMethod: 'CashOnDelivery',
          paymentStatus: 'Pending',
          orderStatus: 'Confirmed',
          totalAmount: 50,
        },
      ],
      LastEvaluatedKey: lastKey,
    });

    const result = await getOrderHistory('buyer-123', 1);

    expect(result.nextCursor).toBeDefined();
    const decoded = JSON.parse(Buffer.from(result.nextCursor!, 'base64').toString('utf-8'));
    expect(decoded).toEqual(lastKey);
  });

  it('should decode and use cursor for pagination', async () => {
    const startKey = {
      PK: 'ORDER#order-5',
      SK: 'METADATA',
      GSI1PK: 'BUYER#buyer-123',
      GSI1SK: 'ORDER#2024-03-01T00:00:00Z',
    };
    const cursor = Buffer.from(JSON.stringify(startKey)).toString('base64');

    mockSend.mockResolvedValueOnce({
      Items: [
        {
          orderId: 'order-6',
          buyerId: 'buyer-123',
          orderTimestamp: '2024-02-15T00:00:00Z',
          deliveryAddressSnapshot: {},
          items: [],
          paymentMethod: 'UPI',
          paymentStatus: 'Paid',
          orderStatus: 'Delivered',
          totalAmount: 200,
          transactionId: 'txn-xyz',
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await getOrderHistory('buyer-123', 20, cursor);

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.orderId).toBe('order-6');
  });

  it('should clamp limit to maximum of 100', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await getOrderHistory('buyer-123', 200);

    const { QueryCommand: MockedQueryCommand } = await import('@aws-sdk/lib-dynamodb');
    expect(MockedQueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Limit: 100,
      }),
    );
  });

  it('should clamp limit to minimum of 1', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await getOrderHistory('buyer-123', 0);

    const { QueryCommand: MockedQueryCommand } = await import('@aws-sdk/lib-dynamodb');
    expect(MockedQueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Limit: 1,
      }),
    );
  });

  it('should use default limit of 20 when not specified', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await getOrderHistory('buyer-123');

    const { QueryCommand: MockedQueryCommand } = await import('@aws-sdk/lib-dynamodb');
    expect(MockedQueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Limit: 20,
      }),
    );
  });

  it('should query GSI1-BuyerOrders with ScanIndexForward=false', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await getOrderHistory('buyer-123', 20);

    const { QueryCommand: MockedQueryCommand } = await import('@aws-sdk/lib-dynamodb');
    expect(MockedQueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        IndexName: 'GSI1-BuyerOrders',
        ScanIndexForward: false,
        ExpressionAttributeValues: expect.objectContaining({
          ':gsi1pk': 'BUYER#buyer-123',
        }),
      }),
    );
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(getOrderHistory('buyer-123', 20)).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('should include refundStatus when present on order', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          orderId: 'order-cancelled',
          buyerId: 'buyer-123',
          orderTimestamp: '2024-05-01T00:00:00Z',
          deliveryAddressSnapshot: {},
          items: [],
          paymentMethod: 'CreditCard',
          paymentStatus: 'Refunded',
          orderStatus: 'Cancelled',
          totalAmount: 150,
          transactionId: 'txn-cancel',
          refundStatus: 'Completed',
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await getOrderHistory('buyer-123', 20);

    expect(result.orders[0]?.refundStatus).toBe('Completed');
  });
});

describe('getOrderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return full order record when buyer owns the order', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'ORDER#order-1',
        SK: 'METADATA',
        orderId: 'order-1',
        buyerId: 'buyer-123',
        orderTimestamp: '2024-06-15T10:00:00Z',
        deliveryAddressSnapshot: {
          addressId: 'addr-1',
          buyerId: 'buyer-123',
          fullName: 'John Doe',
          phone: '+919876543210',
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
          isDefault: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        items: [
          {
            productId: 'prod-1',
            name: 'Laptop',
            quantity: 1,
            priceAtPurchase: 999.99,
            subtotal: 999.99,
          },
          {
            productId: 'prod-2',
            name: 'Mouse',
            quantity: 2,
            priceAtPurchase: 29.99,
            subtotal: 59.98,
          },
        ],
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        orderStatus: 'Confirmed',
        totalAmount: 1059.97,
        transactionId: 'txn-abc',
        GSI1PK: 'BUYER#buyer-123',
        GSI1SK: 'ORDER#2024-06-15T10:00:00Z',
      },
    });

    const result = await getOrderDetail('order-1', 'buyer-123');

    expect(result.orderId).toBe('order-1');
    expect(result.buyerId).toBe('buyer-123');
    expect(result.items).toHaveLength(2);
    expect(result.totalAmount).toBe(1059.97);
    expect(result.paymentMethod).toBe('UPI');
    expect(result.paymentStatus).toBe('Paid');
    expect(result.orderStatus).toBe('Confirmed');
    expect(result.transactionId).toBe('txn-abc');
    expect(result.deliveryAddressSnapshot.fullName).toBe('John Doe');
  });

  it('should return 404 when order does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(getOrderDetail('nonexistent-order', 'buyer-123')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Order not found',
    });
  });

  it('should return 404 when buyer does not own the order (Requirement 12.3)', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'ORDER#order-1',
        SK: 'METADATA',
        orderId: 'order-1',
        buyerId: 'buyer-other',
        orderTimestamp: '2024-06-15T10:00:00Z',
        deliveryAddressSnapshot: {},
        items: [],
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        orderStatus: 'Confirmed',
        totalAmount: 100,
      },
    });

    // buyer-123 tries to access buyer-other's order
    await expect(getOrderDetail('order-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Order not found',
    });
  });

  it('should not reveal order existence when ownership check fails', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        PK: 'ORDER#secret-order',
        SK: 'METADATA',
        orderId: 'secret-order',
        buyerId: 'buyer-other',
        orderTimestamp: '2024-06-15T10:00:00Z',
        deliveryAddressSnapshot: {},
        items: [],
        paymentMethod: 'CreditCard',
        paymentStatus: 'Paid',
        orderStatus: 'Shipped',
        totalAmount: 500,
        transactionId: 'txn-secret',
      },
    });

    try {
      await getOrderDetail('secret-order', 'attacker-buyer');
    } catch (error: unknown) {
      const httpError = error as { statusCode: number; message: string };
      // Should return same 404 message as non-existent order
      expect(httpError.statusCode).toBe(404);
      expect(httpError.message).toBe('Order not found');
      // Should NOT contain any information about the actual order
      expect(httpError.message).not.toContain('buyer-other');
      expect(httpError.message).not.toContain('secret-order');
    }
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(getOrderDetail('order-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('should include refundStatus when present', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        orderId: 'order-cancelled',
        buyerId: 'buyer-123',
        orderTimestamp: '2024-05-01T00:00:00Z',
        deliveryAddressSnapshot: {},
        items: [],
        paymentMethod: 'CreditCard',
        paymentStatus: 'Refunded',
        orderStatus: 'Cancelled',
        totalAmount: 150,
        transactionId: 'txn-cancel',
        refundStatus: 'Completed',
      },
    });

    const result = await getOrderDetail('order-cancelled', 'buyer-123');

    expect(result.refundStatus).toBe('Completed');
    expect(result.orderStatus).toBe('Cancelled');
    expect(result.paymentStatus).toBe('Refunded');
  });

  it('should use GetItem with correct key structure', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        orderId: 'order-1',
        buyerId: 'buyer-123',
        orderTimestamp: '2024-06-15T10:00:00Z',
        deliveryAddressSnapshot: {},
        items: [],
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        orderStatus: 'Confirmed',
        totalAmount: 100,
      },
    });

    await getOrderDetail('order-1', 'buyer-123');

    const { GetCommand: MockedGetCommand } = await import('@aws-sdk/lib-dynamodb');
    expect(MockedGetCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'blipzo-dev-orders',
        Key: {
          PK: 'ORDER#order-1',
          SK: 'METADATA',
        },
      }),
    );
  });
});
