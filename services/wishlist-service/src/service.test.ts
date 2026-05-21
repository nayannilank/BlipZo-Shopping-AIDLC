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
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'Get' })),
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'Query' })),
  BatchGetCommand: vi.fn().mockImplementation((input: unknown) => ({ input, _type: 'BatchGet' })),
  TransactWriteCommand: vi
    .fn()
    .mockImplementation((input: unknown) => ({ input, _type: 'TransactWrite' })),
}));

// Set environment variables before importing service
process.env['WISHLISTS_TABLE_NAME'] = 'blipzo-dev-wishlists';
process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';

import { getWishlist, addToWishlist, removeFromWishlist } from './service.js';

describe('getWishlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty wishlist when no items exist', async () => {
    // QueryCommand returns no items
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await getWishlist('buyer-1');

    expect(result).toEqual({
      buyerId: 'buyer-1',
      items: [],
      count: 0,
    });
  });

  it('should return enriched wishlist items with product details', async () => {
    // QueryCommand returns wishlist items
    mockSend.mockResolvedValueOnce({
      Items: [
        { PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-1', addedAt: '2024-01-01T00:00:00Z' },
        { PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-2', addedAt: '2024-01-02T00:00:00Z' },
      ],
    });

    // BatchGetCommand returns product details
    mockSend.mockResolvedValueOnce({
      Responses: {
        'blipzo-dev-products': [
          {
            productId: 'prod-1',
            name: 'Laptop',
            price: 999.99,
            imageUrls: ['https://s3.amazonaws.com/img1.jpg'],
            isDeleted: false,
          },
          {
            productId: 'prod-2',
            name: 'Phone',
            price: 499.99,
            imageUrls: ['https://s3.amazonaws.com/img2.jpg'],
            isDeleted: false,
          },
        ],
      },
    });

    const result = await getWishlist('buyer-1');

    expect(result.buyerId).toBe('buyer-1');
    expect(result.count).toBe(2);
    expect(result.items).toEqual([
      {
        productId: 'prod-1',
        name: 'Laptop',
        price: 999.99,
        primaryImageUrl: 'https://s3.amazonaws.com/img1.jpg',
        isAvailable: true,
        addedAt: '2024-01-01T00:00:00Z',
      },
      {
        productId: 'prod-2',
        name: 'Phone',
        price: 499.99,
        primaryImageUrl: 'https://s3.amazonaws.com/img2.jpg',
        isAvailable: true,
        addedAt: '2024-01-02T00:00:00Z',
      },
    ]);
  });

  it('should mark deleted products as unavailable (Requirement 7.8)', async () => {
    // QueryCommand returns wishlist items
    mockSend.mockResolvedValueOnce({
      Items: [{ PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-1', addedAt: '2024-01-01T00:00:00Z' }],
    });

    // BatchGetCommand returns product with isDeleted = true
    mockSend.mockResolvedValueOnce({
      Responses: {
        'blipzo-dev-products': [
          {
            productId: 'prod-1',
            name: 'Deleted Product',
            price: 29.99,
            imageUrls: ['https://s3.amazonaws.com/deleted.jpg'],
            isDeleted: true,
          },
        ],
      },
    });

    const result = await getWishlist('buyer-1');

    expect(result.items[0]?.isAvailable).toBe(false);
    expect(result.items[0]?.name).toBe('Deleted Product');
  });

  it('should handle products not found in batch get (mark as unavailable)', async () => {
    // QueryCommand returns wishlist items
    mockSend.mockResolvedValueOnce({
      Items: [{ PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-missing', addedAt: '2024-01-01T00:00:00Z' }],
    });

    // BatchGetCommand returns empty (product no longer exists)
    mockSend.mockResolvedValueOnce({
      Responses: {
        'blipzo-dev-products': [],
      },
    });

    const result = await getWishlist('buyer-1');

    expect(result.items[0]?.isAvailable).toBe(false);
    expect(result.items[0]?.name).toBe('Unknown Product');
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(getWishlist('buyer-1')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('addToWishlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when product does not exist (Requirement 7.4)', async () => {
    // GetCommand for product check returns no item
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(addToWishlist('buyer-1', 'nonexistent-prod')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should return current wishlist when product already in wishlist (Requirement 7.3)', async () => {
    // GetCommand for product check — product exists
    mockSend.mockResolvedValueOnce({
      Item: { productId: 'prod-1', name: 'Laptop', isDeleted: false },
    });

    // GetCommand for existing wishlist item check — item already exists
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-1', addedAt: '2024-01-01T00:00:00Z' },
    });

    // getWishlist call: QueryCommand
    mockSend.mockResolvedValueOnce({
      Items: [{ PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-1', addedAt: '2024-01-01T00:00:00Z' }],
    });

    // getWishlist call: BatchGetCommand
    mockSend.mockResolvedValueOnce({
      Responses: {
        'blipzo-dev-products': [
          {
            productId: 'prod-1',
            name: 'Laptop',
            price: 999.99,
            imageUrls: ['https://s3.amazonaws.com/img1.jpg'],
            isDeleted: false,
          },
        ],
      },
    });

    const result = await addToWishlist('buyer-1', 'prod-1');

    expect(result.count).toBe(1);
    expect(result.items[0]?.productId).toBe('prod-1');
  });

  it('should add product to wishlist and return updated wishlist (Requirement 7.2)', async () => {
    // GetCommand for product check — product exists
    mockSend.mockResolvedValueOnce({
      Item: { productId: 'prod-1', name: 'Laptop', isDeleted: false },
    });

    // GetCommand for existing wishlist item check — item does not exist
    mockSend.mockResolvedValueOnce({ Item: undefined });

    // TransactWriteCommand succeeds
    mockSend.mockResolvedValueOnce({});

    // getWishlist call: QueryCommand
    mockSend.mockResolvedValueOnce({
      Items: [{ PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-1', addedAt: '2024-01-15T00:00:00Z' }],
    });

    // getWishlist call: BatchGetCommand
    mockSend.mockResolvedValueOnce({
      Responses: {
        'blipzo-dev-products': [
          {
            productId: 'prod-1',
            name: 'Laptop',
            price: 999.99,
            imageUrls: ['https://s3.amazonaws.com/img1.jpg'],
            isDeleted: false,
          },
        ],
      },
    });

    const result = await addToWishlist('buyer-1', 'prod-1');

    expect(result.buyerId).toBe('buyer-1');
    expect(result.count).toBe(1);
    expect(result.items[0]?.productId).toBe('prod-1');
    expect(result.items[0]?.isAvailable).toBe(true);
  });

  it('should throw capacity exceeded when wishlist is full (Requirement 7.1)', async () => {
    // GetCommand for product check — product exists
    mockSend.mockResolvedValueOnce({
      Item: { productId: 'prod-new', name: 'New Product', isDeleted: false },
    });

    // GetCommand for existing wishlist item check — item does not exist
    mockSend.mockResolvedValueOnce({ Item: undefined });

    // TransactWriteCommand fails with TransactionCanceledException (capacity exceeded)
    const transactionError = new Error(
      'Transaction cancelled, please refer cancellation reasons for specific reasons [ConditionalCheckFailed, None]',
    );
    transactionError.name = 'TransactionCanceledException';
    (transactionError as unknown as Record<string, unknown>)['CancellationReasons'] = [
      { Code: 'ConditionalCheckFailed' },
      { Code: 'None' },
    ];
    mockSend.mockRejectedValueOnce(transactionError);

    await expect(addToWishlist('buyer-1', 'prod-new')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('capacity'),
    });
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    // GetCommand for product check fails
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(addToWishlist('buyer-1', 'prod-1')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('removeFromWishlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current wishlist when item not in wishlist (Requirement 7.6)', async () => {
    // GetCommand for existing item check — item does not exist
    mockSend.mockResolvedValueOnce({ Item: undefined });

    // getWishlist call: QueryCommand
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await removeFromWishlist('buyer-1', 'nonexistent-prod');

    expect(result).toEqual({
      buyerId: 'buyer-1',
      items: [],
      count: 0,
    });
  });

  it('should remove item and return updated wishlist (Requirement 7.5)', async () => {
    // GetCommand for existing item check — item exists
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'BUYER#buyer-1', SK: 'PRODUCT#prod-1', addedAt: '2024-01-01T00:00:00Z' },
    });

    // TransactWriteCommand succeeds (delete + decrement counter)
    mockSend.mockResolvedValueOnce({});

    // getWishlist call: QueryCommand (now empty)
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await removeFromWishlist('buyer-1', 'prod-1');

    expect(result).toEqual({
      buyerId: 'buyer-1',
      items: [],
      count: 0,
    });
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(removeFromWishlist('buyer-1', 'prod-1')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
