import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK - use vi.hoisted to make mocks available at hoist time
const { mockSend, mockLambdaSend } = vi.hoisted(() => {
  return { mockSend: vi.fn(), mockLambdaSend: vi.fn() };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({ send: mockSend }),
  },
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'GetCommand' })),
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  BatchGetCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  BatchWriteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  TransactWriteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  UpdateCommand: vi
    .fn()
    .mockImplementation((input: unknown) => ({ input, _type: 'UpdateCommand' })),
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => ({ send: mockLambdaSend })),
  InvokeCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

// Set environment variables before importing service
process.env['ORDERS_TABLE_NAME'] = 'blipzo-dev-orders';
process.env['CARTS_TABLE_NAME'] = 'blipzo-dev-carts';
process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
process.env['ADDRESSES_TABLE_NAME'] = 'blipzo-dev-addresses';
process.env['PAYMENT_FUNCTION_NAME'] = 'blipzo-dev-payment';

import { cancelOrder } from './service.js';

describe('cancelOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseOrderItem = {
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
  };

  it('should cancel a Confirmed order and set refundStatus to Completed on successful refund', async () => {
    // GetCommand returns the order
    mockSend.mockResolvedValueOnce({ Item: { ...baseOrderItem } });
    // UpdateCommand for orderStatus = 'Cancelled'
    mockSend.mockResolvedValueOnce({});
    // UpdateCommand for refundStatus
    mockSend.mockResolvedValueOnce({});

    // Lambda refund invocation succeeds
    mockLambdaSend.mockResolvedValueOnce({
      Payload: new TextEncoder().encode(
        JSON.stringify({ success: true, paymentStatus: 'Paid', transactionId: 'refund-txn' }),
      ),
    });

    const result = await cancelOrder('order-1', 'buyer-123');

    expect(result.orderStatus).toBe('Cancelled');
    expect(result.refundStatus).toBe('Completed');
    expect(result.orderId).toBe('order-1');
    expect(result.buyerId).toBe('buyer-123');
  });

  it('should cancel a Processing order successfully', async () => {
    const processingOrder = { ...baseOrderItem, orderStatus: 'Processing' };
    mockSend.mockResolvedValueOnce({ Item: processingOrder });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    mockLambdaSend.mockResolvedValueOnce({
      Payload: new TextEncoder().encode(JSON.stringify({ success: true, paymentStatus: 'Paid' })),
    });

    const result = await cancelOrder('order-1', 'buyer-123');

    expect(result.orderStatus).toBe('Cancelled');
    expect(result.refundStatus).toBe('Completed');
  });

  it('should set refundStatus to Pending when refund Lambda returns success=false (Requirement 12.5)', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...baseOrderItem } });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    // Lambda refund returns failure
    mockLambdaSend.mockResolvedValueOnce({
      Payload: new TextEncoder().encode(
        JSON.stringify({ success: false, paymentStatus: 'Pending' }),
      ),
    });

    const result = await cancelOrder('order-1', 'buyer-123');

    expect(result.orderStatus).toBe('Cancelled');
    expect(result.refundStatus).toBe('Pending');
  });

  it('should set refundStatus to Pending when refund Lambda throws an error (Requirement 12.5)', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...baseOrderItem } });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    // Lambda invocation throws
    mockLambdaSend.mockRejectedValueOnce(new Error('Lambda timeout'));

    const result = await cancelOrder('order-1', 'buyer-123');

    expect(result.orderStatus).toBe('Cancelled');
    expect(result.refundStatus).toBe('Pending');
  });

  it('should set refundStatus to Pending when refund Lambda returns FunctionError (Requirement 12.5)', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...baseOrderItem } });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    // Lambda returns FunctionError
    mockLambdaSend.mockResolvedValueOnce({
      FunctionError: 'Unhandled',
      Payload: new TextEncoder().encode('{}'),
    });

    const result = await cancelOrder('order-1', 'buyer-123');

    expect(result.orderStatus).toBe('Cancelled');
    expect(result.refundStatus).toBe('Pending');
  });

  it('should NOT invoke refund for CashOnDelivery orders', async () => {
    const codOrder = {
      ...baseOrderItem,
      paymentMethod: 'CashOnDelivery',
      paymentStatus: 'Pending',
      transactionId: undefined,
    };
    mockSend.mockResolvedValueOnce({ Item: codOrder });
    mockSend.mockResolvedValueOnce({});

    const result = await cancelOrder('order-1', 'buyer-123');

    expect(result.orderStatus).toBe('Cancelled');
    expect(result.refundStatus).toBeUndefined();
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it('should return 400 INVALID_STATUS when order status is Shipped (Requirement 12.6)', async () => {
    const shippedOrder = { ...baseOrderItem, orderStatus: 'Shipped' };
    mockSend.mockResolvedValueOnce({ Item: shippedOrder });

    await expect(cancelOrder('order-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Shipped'),
    });
  });

  it('should return 400 INVALID_STATUS when order status is Delivered (Requirement 12.6)', async () => {
    const deliveredOrder = { ...baseOrderItem, orderStatus: 'Delivered' };
    mockSend.mockResolvedValueOnce({ Item: deliveredOrder });

    await expect(cancelOrder('order-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Delivered'),
    });
  });

  it('should return 400 INVALID_STATUS when order status is already Cancelled (Requirement 12.6)', async () => {
    const cancelledOrder = { ...baseOrderItem, orderStatus: 'Cancelled' };
    mockSend.mockResolvedValueOnce({ Item: cancelledOrder });

    await expect(cancelOrder('order-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Cancelled'),
    });
  });

  it('should return 404 when order does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(cancelOrder('nonexistent-order', 'buyer-123')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Order not found',
    });
  });

  it('should return 404 when buyer does not own the order (Requirement 12.3)', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...baseOrderItem } });

    // Different buyer tries to cancel
    await expect(cancelOrder('order-1', 'attacker-buyer')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Order not found',
    });
  });

  it('should throw 503 when DynamoDB is unavailable during order fetch', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(cancelOrder('order-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('should throw 503 when DynamoDB is unavailable during status update', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...baseOrderItem } });
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(cancelOrder('order-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('should still return Cancelled order even if refundStatus DynamoDB update fails', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...baseOrderItem } });
    // orderStatus update succeeds
    mockSend.mockResolvedValueOnce({});
    // refundStatus update fails (non-critical)
    mockSend.mockRejectedValueOnce(new Error('DynamoDB throttle'));

    // Lambda refund succeeds
    mockLambdaSend.mockResolvedValueOnce({
      Payload: new TextEncoder().encode(JSON.stringify({ success: true, paymentStatus: 'Paid' })),
    });

    const result = await cancelOrder('order-1', 'buyer-123');

    // Cancellation should still succeed
    expect(result.orderStatus).toBe('Cancelled');
    expect(result.refundStatus).toBe('Completed');
  });
});
