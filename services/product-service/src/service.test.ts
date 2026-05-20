import type { CreateProductRequest } from '@blipzo/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK modules before importing service
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({}),
    }),
  },
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
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

import { createProduct } from './service.js';

describe('createProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-dev-product-images';
  });

  const validInput: CreateProductRequest = {
    name: 'Test Product',
    description: 'A great product for testing purposes',
    price: 29.99,
    stockQuantity: 100,
    categories: ['Electronics', 'Gadgets'],
    images: [
      {
        filename: 'product-front.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1024000,
      },
      {
        filename: 'product-back.png',
        contentType: 'image/png',
        sizeBytes: 2048000,
      },
    ],
  };

  it('should create a product with correct fields', async () => {
    const result = await createProduct(validInput, 'seller-abc');

    expect(result.product.productId).toBe('test-uuid-1234');
    expect(result.product.sellerId).toBe('seller-abc');
    expect(result.product.name).toBe('Test Product');
    expect(result.product.description).toBe('A great product for testing purposes');
    expect(result.product.price).toBe(29.99);
    expect(result.product.stockQuantity).toBe(100);
    expect(result.product.categories).toEqual(['Electronics', 'Gadgets']);
    expect(result.product.isDeleted).toBe(false);
    expect(result.product.createdAt).toBeDefined();
    expect(result.product.updatedAt).toBeDefined();
  });

  it('should generate pre-signed upload URLs for each image', async () => {
    const result = await createProduct(validInput, 'seller-abc');

    expect(result.uploadUrls).toHaveLength(2);
    expect(result.uploadUrls[0]?.filename).toBe('product-front.jpg');
    expect(result.uploadUrls[0]?.uploadUrl).toContain('https://');
    expect(result.uploadUrls[0]?.s3Key).toContain('products/test-uuid-1234/');
    expect(result.uploadUrls[1]?.filename).toBe('product-back.png');
  });

  it('should generate image URLs pointing to S3 bucket', async () => {
    const result = await createProduct(validInput, 'seller-abc');

    expect(result.product.imageUrls).toHaveLength(2);
    for (const url of result.product.imageUrls) {
      expect(url).toContain('blipzo-dev-product-images.s3.amazonaws.com');
      expect(url).toContain('products/test-uuid-1234/');
    }
  });

  it('should set createdAt and updatedAt to the same ISO timestamp', async () => {
    const result = await createProduct(validInput, 'seller-abc');

    expect(result.product.createdAt).toBe(result.product.updatedAt);
    // Verify it's a valid ISO 8601 date
    expect(new Date(result.product.createdAt).toISOString()).toBe(result.product.createdAt);
  });

  it('should use the first category as the primary category for GSI1', async () => {
    const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
    const mockDocClient = DynamoDBDocumentClient.from({} as never);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const sendMock = vi.mocked(mockDocClient.send);

    await createProduct(validInput, 'seller-abc');

    expect(sendMock).toHaveBeenCalled();
    const putCall = sendMock.mock.calls[0]?.[0] as unknown as
      | { input?: { Item?: Record<string, unknown> } }
      | undefined;
    const item = putCall?.input?.Item;

    expect(item?.['GSI1PK']).toBe('CATEGORY#Electronics');
    expect(item?.['GSI1SK']).toContain('CREATED#');
    expect(item?.['GSI2PK']).toBe('SELLER#seller-abc');
    expect(item?.['GSI2SK']).toContain('CREATED#');
    expect(item?.['searchTokens']).toBe('test product a great product for testing purposes');
  });
});
