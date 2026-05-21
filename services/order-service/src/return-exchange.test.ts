import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK - use vi.hoisted to make mocks available at hoist time
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
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'GetCommand' })),
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'PutCommand' })),
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  BatchGetCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  BatchWriteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  TransactWriteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  UpdateCommand: vi
    .fn()
    .mockImplementation((input: unknown) => ({ input, _type: 'UpdateCommand' })),
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  InvokeCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

// Set environment variables before importing service
process.env['ORDERS_TABLE_NAME'] = 'blipzo-dev-orders';
process.env['CARTS_TABLE_NAME'] = 'blipzo-dev-carts';
process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
process.env['ADDRESSES_TABLE_NAME'] = 'blipzo-dev-addresses';
process.env['PAYMENT_FUNCTION_NAME'] = 'blipzo-dev-payment';
process.env['RETURN_EXCHANGE_REQUESTS_TABLE_NAME'] = 'blipzo-dev-return-exchange-requests';

import { createReturnExchangeRequest, getReturnExchangeRequestDetail } from './service.js';

describe('createReturnExchangeRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const deliveredOrderItem = {
    PK: 'ORDER#order-1',
    SK: 'METADATA',
    orderId: 'order-1',
    buyerId: 'buyer-123',
    orderTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
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
    orderStatus: 'Delivered',
    totalAmount: 999.99,
    transactionId: 'txn-abc',
    GSI1PK: 'BUYER#buyer-123',
    GSI1SK: 'ORDER#2024-06-15T10:00:00Z',
  };

  const productWithPolicy = {
    PK: 'PRODUCT#prod-1',
    SK: 'METADATA',
    productId: 'prod-1',
    sellerId: 'seller-1',
    name: 'Laptop',
    price: 999.99,
    stockQuantity: 10,
    isDeleted: false,
    sellerPolicy: {
      returnWindowDays: 7,
      exchangeAllowed: true,
      conditions: 'Item must be unused',
      policyVersion: 'policy-v1-uuid',
      createdAt: '2024-01-01T00:00:00Z',
    },
  };

  it('should create a Pending return request for a delivered order within the return window (Requirement 13.1)', async () => {
    // GetCommand for order
    mockSend.mockResolvedValueOnce({ Item: { ...deliveredOrderItem } });
    // GetCommand for product
    mockSend.mockResolvedValueOnce({ Item: { ...productWithPolicy } });
    // PutCommand for return-exchange request
    mockSend.mockResolvedValueOnce({});

    const result = await createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' });

    expect(result.status).toBe('Pending');
    expect(result.type).toBe('Return');
    expect(result.orderId).toBe('order-1');
    expect(result.buyerId).toBe('buyer-123');
    expect(result.policyVersionAtRequest).toBe('policy-v1-uuid');
    expect(result.requestId).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it('should create a Pending exchange request for a delivered order within the return window (Requirement 13.1)', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...deliveredOrderItem } });
    mockSend.mockResolvedValueOnce({ Item: { ...productWithPolicy } });
    mockSend.mockResolvedValueOnce({});

    const result = await createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Exchange' });

    expect(result.status).toBe('Pending');
    expect(result.type).toBe('Exchange');
    expect(result.policyVersionAtRequest).toBe('policy-v1-uuid');
  });

  it('should return 400 when order is not delivered (Requirement 13.3)', async () => {
    const confirmedOrder = { ...deliveredOrderItem, orderStatus: 'Confirmed' };
    mockSend.mockResolvedValueOnce({ Item: confirmedOrder });

    await expect(
      createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('not eligible for return or exchange'),
    });
  });

  it('should return 400 when order is Shipped (Requirement 13.3)', async () => {
    const shippedOrder = { ...deliveredOrderItem, orderStatus: 'Shipped' };
    mockSend.mockResolvedValueOnce({ Item: shippedOrder });

    await expect(
      createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('should return 400 when returnWindowDays is 0 (Requirement 14.3)', async () => {
    const productNoReturn = {
      ...productWithPolicy,
      sellerPolicy: { ...productWithPolicy.sellerPolicy, returnWindowDays: 0 },
    };
    mockSend.mockResolvedValueOnce({ Item: { ...deliveredOrderItem } });
    mockSend.mockResolvedValueOnce({ Item: productNoReturn });

    await expect(
      createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('non-returnable'),
    });
  });

  it('should return 400 when request is outside the return window (Requirement 13.2)', async () => {
    // Order placed 30 days ago, return window is 7 days
    const oldOrder = {
      ...deliveredOrderItem,
      orderTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockSend.mockResolvedValueOnce({ Item: oldOrder });
    mockSend.mockResolvedValueOnce({ Item: { ...productWithPolicy } });

    await expect(
      createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Return window has expired'),
    });
  });

  it('should return 404 when order does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(
      createReturnExchangeRequest('nonexistent-order', 'buyer-123', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Order not found',
    });
  });

  it('should return 404 when buyer does not own the order', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...deliveredOrderItem } });

    await expect(
      createReturnExchangeRequest('order-1', 'attacker-buyer', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Order not found',
    });
  });

  it('should return 400 when product has no seller policy configured', async () => {
    const productNoPolicy = { ...productWithPolicy, sellerPolicy: undefined };
    mockSend.mockResolvedValueOnce({ Item: { ...deliveredOrderItem } });
    mockSend.mockResolvedValueOnce({ Item: productNoPolicy });

    await expect(
      createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('does not have a return/exchange policy'),
    });
  });

  it('should return 400 when exchange is not allowed by seller policy', async () => {
    const productNoExchange = {
      ...productWithPolicy,
      sellerPolicy: { ...productWithPolicy.sellerPolicy, exchangeAllowed: false },
    };
    mockSend.mockResolvedValueOnce({ Item: { ...deliveredOrderItem } });
    mockSend.mockResolvedValueOnce({ Item: productNoExchange });

    await expect(
      createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Exchange' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Exchanges are not allowed'),
    });
  });

  it('should snapshot policyVersionAtRequest for temporal consistency (Requirement 14.4)', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...deliveredOrderItem } });
    mockSend.mockResolvedValueOnce({ Item: { ...productWithPolicy } });
    mockSend.mockResolvedValueOnce({});

    const result = await createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' });

    // The policyVersionAtRequest should match the current policy version
    expect(result.policyVersionAtRequest).toBe('policy-v1-uuid');
  });

  it('should throw 503 when DynamoDB is unavailable during order fetch', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(
      createReturnExchangeRequest('order-1', 'buyer-123', { type: 'Return' }),
    ).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('getReturnExchangeRequestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const returnExchangeItem = {
    PK: 'REQUEST#req-1',
    SK: 'METADATA',
    requestId: 'req-1',
    orderId: 'order-1',
    buyerId: 'buyer-123',
    type: 'Return',
    status: 'Pending',
    policyVersionAtRequest: 'policy-v1-uuid',
    createdAt: '2024-06-17T10:00:00Z',
    GSI1PK: 'ORDER#order-1',
    GSI1SK: 'CREATED#2024-06-17T10:00:00Z',
  };

  it('should return the return/exchange request with current status (Requirement 13.4)', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...returnExchangeItem } });

    const result = await getReturnExchangeRequestDetail('req-1', 'buyer-123');

    expect(result.requestId).toBe('req-1');
    expect(result.orderId).toBe('order-1');
    expect(result.buyerId).toBe('buyer-123');
    expect(result.type).toBe('Return');
    expect(result.status).toBe('Pending');
    expect(result.policyVersionAtRequest).toBe('policy-v1-uuid');
    expect(result.createdAt).toBe('2024-06-17T10:00:00Z');
  });

  it('should include sellerNotes when present (Requirement 13.4)', async () => {
    const itemWithNotes = {
      ...returnExchangeItem,
      sellerNotes: 'Please ship the item back within 3 days.',
    };
    mockSend.mockResolvedValueOnce({ Item: itemWithNotes });

    const result = await getReturnExchangeRequestDetail('req-1', 'buyer-123');

    expect(result.sellerNotes).toBe('Please ship the item back within 3 days.');
  });

  it('should return 404 when request does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(
      getReturnExchangeRequestDetail('nonexistent-req', 'buyer-123'),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Return/exchange request not found',
    });
  });

  it('should return 404 when buyer does not own the request', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...returnExchangeItem } });

    await expect(getReturnExchangeRequestDetail('req-1', 'attacker-buyer')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Return/exchange request not found',
    });
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(getReturnExchangeRequestDetail('req-1', 'buyer-123')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
