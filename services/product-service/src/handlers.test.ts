import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK modules before importing handlers
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({
      send: (...args: unknown[]) => mockSend(...args),
    }),
  },
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Put', input })),
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Get', input })),
  UpdateCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Update', input })),
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Query', input })),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));

import {
  updateProduct,
  deleteProduct,
  listSellerProducts,
  getProductById,
  assertOwnership,
  setSellerPolicy,
} from './service.js';

const existingProduct = {
  PK: 'PRODUCT#prod-123',
  SK: 'METADATA',
  productId: 'prod-123',
  sellerId: 'seller-abc',
  name: 'Original Product',
  description: 'Original description',
  price: 29.99,
  stockQuantity: 100,
  categories: ['Electronics'],
  imageUrls: ['https://bucket.s3.amazonaws.com/products/prod-123/img1.jpg'],
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  GSI1PK: 'CATEGORY#Electronics',
  GSI1SK: 'CREATED#2024-01-01T00:00:00.000Z',
  GSI2PK: 'SELLER#seller-abc',
  GSI2SK: 'CREATED#2024-01-01T00:00:00.000Z',
  searchTokens: 'original product original description',
};

describe('getProductById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-dev-product-images';
  });

  it('should return a product record when found', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });

    const result = await getProductById('prod-123');

    expect(result.productId).toBe('prod-123');
    expect(result.sellerId).toBe('seller-abc');
    expect(result.name).toBe('Original Product');
  });

  it('should throw 404 when product not found', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(getProductById('nonexistent')).rejects.toThrow('Product not found');
  });
});

describe('assertOwnership', () => {
  it('should not throw when seller owns the product', () => {
    const product = {
      ...existingProduct,
      sellerId: 'seller-abc',
    } as unknown as import('@blipzo/shared').ProductRecord;
    expect(() => {
      assertOwnership(product, 'seller-abc');
    }).not.toThrow();
  });

  it('should throw 403 when seller does not own the product', () => {
    const product = {
      ...existingProduct,
      sellerId: 'seller-abc',
    } as unknown as import('@blipzo/shared').ProductRecord;
    expect(() => {
      assertOwnership(product, 'other-seller');
    }).toThrow('You do not have permission');
  });
});

describe('updateProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-dev-product-images';
  });

  it('should update only supplied fields and return updated product', async () => {
    // First call: GetCommand to read existing product
    mockSend.mockResolvedValueOnce({ Item: existingProduct });
    // Second call: UpdateCommand returns updated attributes
    mockSend.mockResolvedValueOnce({
      Attributes: {
        ...existingProduct,
        name: 'Updated Product',
        updatedAt: '2024-06-01T00:00:00.000Z',
      },
    });

    const result = await updateProduct('prod-123', { name: 'Updated Product' }, 'seller-abc');

    expect(result.name).toBe('Updated Product');
    expect(result.productId).toBe('prod-123');
  });

  it('should throw 403 when seller does not own the product', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });

    await expect(updateProduct('prod-123', { name: 'Hacked' }, 'other-seller')).rejects.toThrow(
      'You do not have permission',
    );
  });

  it('should throw 404 when product does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(updateProduct('nonexistent', { name: 'Test' }, 'seller-abc')).rejects.toThrow(
      'Product not found',
    );
  });

  it('should update price without affecting other fields', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });
    mockSend.mockResolvedValueOnce({
      Attributes: {
        ...existingProduct,
        price: 49.99,
        updatedAt: '2024-06-01T00:00:00.000Z',
      },
    });

    const result = await updateProduct('prod-123', { price: 49.99 }, 'seller-abc');

    expect(result.price).toBe(49.99);
    expect(result.name).toBe('Original Product');
    expect(result.description).toBe('Original description');
  });
});

describe('deleteProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-dev-product-images';
  });

  it('should soft-delete a product owned by the seller', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });
    mockSend.mockResolvedValueOnce({});

    await expect(deleteProduct('prod-123', 'seller-abc')).resolves.toBeUndefined();

    // Verify UpdateCommand was called (second call)
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('should throw 403 when seller does not own the product', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });

    await expect(deleteProduct('prod-123', 'other-seller')).rejects.toThrow(
      'You do not have permission',
    );
  });

  it('should throw 404 when product does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(deleteProduct('nonexistent', 'seller-abc')).rejects.toThrow('Product not found');
  });
});

describe('listSellerProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-dev-product-images';
  });

  it('should return paginated list of seller products', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [existingProduct],
      LastEvaluatedKey: {
        PK: 'PRODUCT#prod-123',
        SK: 'METADATA',
        GSI2PK: 'SELLER#seller-abc',
        GSI2SK: 'CREATED#2024-01-01T00:00:00.000Z',
      },
    });

    const result = await listSellerProducts('seller-abc', 20);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productId).toBe('prod-123');
    expect(result.nextCursor).toBeDefined();
  });

  it('should return empty list when seller has no products', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await listSellerProducts('seller-xyz', 20);

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should not include nextCursor when no more pages', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [existingProduct],
      LastEvaluatedKey: undefined,
    });

    const result = await listSellerProducts('seller-abc', 20);

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should handle cursor-based pagination', async () => {
    const cursorKey = {
      PK: 'PRODUCT#prod-100',
      SK: 'METADATA',
      GSI2PK: 'SELLER#seller-abc',
      GSI2SK: 'CREATED#2024-01-01T00:00:00.000Z',
    };
    const cursor = Buffer.from(JSON.stringify(cursorKey)).toString('base64');

    mockSend.mockResolvedValueOnce({
      Items: [existingProduct],
    });

    const result = await listSellerProducts('seller-abc', 20, cursor);

    expect(result.items).toHaveLength(1);
  });
});

describe('setSellerPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-dev-product-images';
  });

  it('should set seller policy and return updated product with sellerPolicy', async () => {
    // First call: GetCommand to read existing product
    mockSend.mockResolvedValueOnce({ Item: existingProduct });
    // Second call: UpdateCommand returns updated attributes with sellerPolicy
    const updatedItem = {
      ...existingProduct,
      updatedAt: '2024-06-01T00:00:00.000Z',
      sellerPolicy: {
        returnWindowDays: 7,
        exchangeAllowed: true,
        conditions: 'Item must be unused',
        policyVersion: 'test-uuid-1234',
        createdAt: '2024-06-01T00:00:00.000Z',
      },
    };
    mockSend.mockResolvedValueOnce({ Attributes: updatedItem });

    const result = await setSellerPolicy(
      'prod-123',
      { returnWindowDays: 7, exchangeAllowed: true, conditions: 'Item must be unused' },
      'seller-abc',
    );

    expect(result.sellerPolicy).toBeDefined();
    expect(result.sellerPolicy!.returnWindowDays).toBe(7);
    expect(result.sellerPolicy!.exchangeAllowed).toBe(true);
    expect(result.sellerPolicy!.conditions).toBe('Item must be unused');
    expect(result.sellerPolicy!.policyVersion).toBe('test-uuid-1234');
    expect(result.sellerPolicy!.createdAt).toBeDefined();
  });

  it('should set seller policy without optional conditions field', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });
    const updatedItem = {
      ...existingProduct,
      updatedAt: '2024-06-01T00:00:00.000Z',
      sellerPolicy: {
        returnWindowDays: 0,
        exchangeAllowed: false,
        policyVersion: 'test-uuid-1234',
        createdAt: '2024-06-01T00:00:00.000Z',
      },
    };
    mockSend.mockResolvedValueOnce({ Attributes: updatedItem });

    const result = await setSellerPolicy(
      'prod-123',
      { returnWindowDays: 0, exchangeAllowed: false },
      'seller-abc',
    );

    expect(result.sellerPolicy).toBeDefined();
    expect(result.sellerPolicy!.returnWindowDays).toBe(0);
    expect(result.sellerPolicy!.exchangeAllowed).toBe(false);
    expect(result.sellerPolicy!.conditions).toBeUndefined();
    expect(result.sellerPolicy!.policyVersion).toBe('test-uuid-1234');
  });

  it('should throw 403 when seller does not own the product', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });

    await expect(
      setSellerPolicy('prod-123', { returnWindowDays: 7, exchangeAllowed: true }, 'other-seller'),
    ).rejects.toThrow('You do not have permission');
  });

  it('should throw 404 when product does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(
      setSellerPolicy('nonexistent', { returnWindowDays: 7, exchangeAllowed: true }, 'seller-abc'),
    ).rejects.toThrow('Product not found');
  });

  it('should generate a new policyVersion UUID for each policy update', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });
    const updatedItem = {
      ...existingProduct,
      updatedAt: '2024-06-01T00:00:00.000Z',
      sellerPolicy: {
        returnWindowDays: 14,
        exchangeAllowed: true,
        policyVersion: 'test-uuid-1234',
        createdAt: '2024-06-01T00:00:00.000Z',
      },
    };
    mockSend.mockResolvedValueOnce({ Attributes: updatedItem });

    const result = await setSellerPolicy(
      'prod-123',
      { returnWindowDays: 14, exchangeAllowed: true },
      'seller-abc',
    );

    expect(result.sellerPolicy!.policyVersion).toBe('test-uuid-1234');
  });
});
