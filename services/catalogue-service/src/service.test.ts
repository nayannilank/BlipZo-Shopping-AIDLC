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
  ScanCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

// Set environment variables before importing service
process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
process.env['CATEGORIES_TABLE_NAME'] = 'blipzo-dev-categories';

import {
  listCategories,
  validateCategoryExists,
  listProductsByCategory,
  getProductDetail,
  searchProducts,
  searchProductsEnriched,
  clearSearchCaches,
} from './service.js';

describe('listCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all categories from the table', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        { categoryId: 'electronics', name: 'Electronics' },
        { categoryId: 'clothing', name: 'Clothing' },
      ],
    });

    const result = await listCategories();

    expect(result).toEqual([
      { categoryId: 'electronics', name: 'Electronics' },
      { categoryId: 'clothing', name: 'Clothing' },
    ]);
  });

  it('should return empty array when no categories exist', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await listCategories();

    expect(result).toEqual([]);
  });

  it('should handle undefined Items gracefully', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await listCategories();

    expect(result).toEqual([]);
  });
});

describe('validateCategoryExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not throw when category exists', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { categoryId: 'electronics', name: 'Electronics' },
    });

    await expect(validateCategoryExists('electronics')).resolves.toBeUndefined();
  });

  it('should throw 404 when category does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(validateCategoryExists('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('listProductsByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return products for a valid category', async () => {
    // First call: validateCategoryExists (GetCommand)
    mockSend.mockResolvedValueOnce({
      Item: { categoryId: 'electronics', name: 'Electronics' },
    });
    // Second call: QueryCommand for products
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-1',
          name: 'Laptop',
          price: 999.99,
          imageUrls: ['https://s3.amazonaws.com/img1.jpg'],
          averageRating: 4.5,
          sellerName: 'TechStore',
          isDeleted: false,
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await listProductsByCategory('electronics', 20);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      productId: 'prod-1',
      name: 'Laptop',
      price: 999.99,
      primaryImageUrl: 'https://s3.amazonaws.com/img1.jpg',
      averageRating: 4.5,
      sellerName: 'TechStore',
    });
    expect(result.nextCursor).toBeUndefined();
  });

  it('should return empty list with 200 when no products exist in category', async () => {
    // validateCategoryExists
    mockSend.mockResolvedValueOnce({
      Item: { categoryId: 'empty-cat', name: 'Empty Category' },
    });
    // QueryCommand returns no items
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    const result = await listProductsByCategory('empty-cat', 20);

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should return 404 for unknown category', async () => {
    // validateCategoryExists returns no item
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(listProductsByCategory('nonexistent', 20)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should include nextCursor when LastEvaluatedKey is present', async () => {
    const lastKey = {
      PK: 'PRODUCT#123',
      SK: 'METADATA',
      GSI1PK: 'CATEGORY#electronics',
      GSI1SK: 'CREATED#2024-01-01',
    };

    mockSend.mockResolvedValueOnce({
      Item: { categoryId: 'electronics', name: 'Electronics' },
    });
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-1',
          name: 'Phone',
          price: 499,
          imageUrls: ['https://s3.amazonaws.com/img.jpg'],
          isDeleted: false,
        },
      ],
      LastEvaluatedKey: lastKey,
    });

    const result = await listProductsByCategory('electronics', 1);

    expect(result.nextCursor).toBeDefined();
    // Verify cursor is valid base64 that decodes to the lastKey
    const decoded = JSON.parse(
      Buffer.from(result.nextCursor ?? '', 'base64').toString('utf-8'),
    ) as Record<string, unknown>;
    expect(decoded).toEqual(lastKey);
  });

  it('should decode and use cursor for pagination', async () => {
    const startKey = {
      PK: 'PRODUCT#100',
      SK: 'METADATA',
      GSI1PK: 'CATEGORY#electronics',
      GSI1SK: 'CREATED#2024-01-01',
    };
    const cursor = Buffer.from(JSON.stringify(startKey)).toString('base64');

    mockSend.mockResolvedValueOnce({
      Item: { categoryId: 'electronics', name: 'Electronics' },
    });
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-2',
          name: 'Tablet',
          price: 299,
          imageUrls: [],
          isDeleted: false,
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await listProductsByCategory('electronics', 20, cursor);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productId).toBe('prod-2');
  });

  it('should handle products with no imageUrls gracefully', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { categoryId: 'books', name: 'Books' },
    });
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-3',
          name: 'Novel',
          price: 12.99,
          imageUrls: undefined,
          isDeleted: false,
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await listProductsByCategory('books', 20);

    expect(result.items[0]?.primaryImageUrl).toBe('');
  });
});

describe('getProductDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return full product record for a valid product', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        productId: 'prod-1',
        sellerId: 'seller-1',
        name: 'Laptop',
        description: 'A powerful laptop',
        price: 999.99,
        stockQuantity: 50,
        categories: ['electronics'],
        imageUrls: ['https://s3.amazonaws.com/img1.jpg'],
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    });

    const result = await getProductDetail('prod-1');

    expect(result).toEqual({
      productId: 'prod-1',
      sellerId: 'seller-1',
      name: 'Laptop',
      description: 'A powerful laptop',
      price: 999.99,
      stockQuantity: 50,
      categories: ['electronics'],
      imageUrls: ['https://s3.amazonaws.com/img1.jpg'],
      isDeleted: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });

  it('should include sellerPolicy when present', async () => {
    const sellerPolicy = {
      returnWindowDays: 7,
      exchangeAllowed: true,
      conditions: 'Item must be unused',
      policyVersion: 'policy-uuid-1',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockSend.mockResolvedValueOnce({
      Item: {
        productId: 'prod-2',
        sellerId: 'seller-1',
        name: 'Phone',
        description: 'A smartphone',
        price: 499.99,
        stockQuantity: 100,
        categories: ['electronics'],
        imageUrls: ['https://s3.amazonaws.com/img2.jpg'],
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        sellerPolicy,
      },
    });

    const result = await getProductDetail('prod-2');

    expect(result.sellerPolicy).toEqual(sellerPolicy);
  });

  it('should throw 404 when product does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(getProductDetail('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should throw 404 when product is deleted', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        productId: 'prod-deleted',
        sellerId: 'seller-1',
        name: 'Deleted Product',
        description: 'This was deleted',
        price: 10,
        stockQuantity: 0,
        categories: ['misc'],
        imageUrls: [],
        isDeleted: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    });

    await expect(getProductDetail('prod-deleted')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(getProductDetail('prod-1')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('searchProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return matching products for a valid query', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-1',
          name: 'Gaming Laptop',
          price: 1299.99,
          imageUrls: ['https://s3.amazonaws.com/laptop.jpg'],
          averageRating: 4.5,
          sellerName: 'TechStore',
          isDeleted: false,
          searchTokens: 'gaming laptop powerful computer',
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await searchProducts('laptop', 20);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      productId: 'prod-1',
      name: 'Gaming Laptop',
      price: 1299.99,
      primaryImageUrl: 'https://s3.amazonaws.com/laptop.jpg',
      averageRating: 4.5,
      sellerName: 'TechStore',
    });
  });

  it('should return empty list when no products match', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    const result = await searchProducts('nonexistentproduct', 20);

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should convert query to lowercase for case-insensitive search', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await searchProducts('LAPTOP', 20);

    // Verify the ScanCommand was called with lowercase query
    const { ScanCommand: MockedScanCommand } =
      (await import('@aws-sdk/lib-dynamodb')) as unknown as {
        ScanCommand: ReturnType<typeof vi.fn>;
      };
    expect(MockedScanCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: expect.objectContaining({
          ':query': 'laptop',
        }),
      }),
    );
  });

  it('should include nextCursor when LastEvaluatedKey is present', async () => {
    const lastKey = { PK: 'PRODUCT#123', SK: 'METADATA' };

    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-1',
          name: 'Phone',
          price: 499,
          imageUrls: ['https://s3.amazonaws.com/phone.jpg'],
          isDeleted: false,
          searchTokens: 'phone smartphone',
        },
      ],
      LastEvaluatedKey: lastKey,
    });

    const result = await searchProducts('phone', 1);

    expect(result.nextCursor).toBeDefined();
    const decoded = JSON.parse(
      Buffer.from(result.nextCursor ?? '', 'base64').toString('utf-8'),
    ) as Record<string, unknown>;
    expect(decoded).toEqual(lastKey);
  });

  it('should decode and use cursor for pagination', async () => {
    const startKey = { PK: 'PRODUCT#100', SK: 'METADATA' };
    const cursor = Buffer.from(JSON.stringify(startKey)).toString('base64');

    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-2',
          name: 'Tablet',
          price: 299,
          imageUrls: [],
          isDeleted: false,
          searchTokens: 'tablet device',
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await searchProducts('tablet', 20, cursor);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productId).toBe('prod-2');
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(searchProducts('laptop', 20)).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('searchProductsEnriched', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSearchCaches();
  });

  it('should return enriched search results with categoryName, subcategoryName, and previewAttributes', async () => {
    // ScanCommand for search
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-1',
          name: 'Nike Air Max',
          price: 8999,
          imageUrls: ['https://s3.amazonaws.com/shoe.jpg'],
          averageRating: 4.5,
          sellerName: 'Nike Store',
          isDeleted: false,
          searchTokens: 'nike air max running shoes nike male',
          categoryId: 'cat_clothing',
          subcategoryId: 'subcat_footwear',
          dynamicAttributes: {
            brand: 'Nike',
            availableSizes: ['IND 7', 'IND 8', 'IND 9'],
            gender: 'Male',
            ageGroup: 'Adult',
            availableColours: ['Black', 'White'],
          },
        },
      ],
      LastEvaluatedKey: undefined,
    });

    // GetCommand for category name (cat_clothing)
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'CAT#cat_clothing', SK: 'METADATA', name: 'Clothing' },
    });

    // GetCommand for subcategory name (subcat_footwear)
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'CAT#subcat_footwear', SK: 'METADATA', name: 'Footwear' },
    });

    // QueryCommand for attribute schema (preview attributes)
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_footwear',
          schemaVersion: 1,
          attributes: [
            {
              fieldName: 'brand',
              displayLabel: 'Brand',
              dataType: 'text',
              required: true,
              filterable: true,
              displayPriority: 1,
            },
            {
              fieldName: 'availableSizes',
              displayLabel: 'Available Sizes',
              dataType: 'multi-select',
              required: true,
              filterable: true,
              displayPriority: 2,
            },
            {
              fieldName: 'gender',
              displayLabel: 'Gender',
              dataType: 'single-select',
              required: true,
              filterable: true,
              displayPriority: 3,
            },
            {
              fieldName: 'ageGroup',
              displayLabel: 'Age Group',
              dataType: 'single-select',
              required: true,
              filterable: true,
              displayPriority: 4,
            },
          ],
        },
      ],
    });

    const result = await searchProductsEnriched('nike', 20);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      productId: 'prod-1',
      name: 'Nike Air Max',
      price: 8999,
      primaryImageUrl: 'https://s3.amazonaws.com/shoe.jpg',
      averageRating: 4.5,
      sellerName: 'Nike Store',
      categoryName: 'Clothing',
      subcategoryName: 'Footwear',
      previewAttributes: {
        brand: 'Nike',
        availableSizes: ['IND 7', 'IND 8', 'IND 9'],
        gender: 'Male',
      },
    });
  });

  it('should include at most 3 preview attributes sorted by lowest displayPriority', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-2',
          name: 'Samsung Galaxy',
          price: 49999,
          imageUrls: ['https://s3.amazonaws.com/phone.jpg'],
          averageRating: 4.2,
          sellerName: 'Samsung Store',
          isDeleted: false,
          searchTokens: 'samsung galaxy phone android',
          categoryId: 'cat_electronics',
          subcategoryId: 'subcat_phones',
          dynamicAttributes: {
            brand: 'Samsung',
            model: 'Galaxy S24',
            ram: '8GB',
            storage: '256GB',
            displaySize: 6.2,
            batteryCapacity: 4000,
          },
        },
      ],
      LastEvaluatedKey: undefined,
    });

    // GetCommand for category name
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'CAT#cat_electronics', SK: 'METADATA', name: 'Electronics' },
    });

    // GetCommand for subcategory name
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'CAT#subcat_phones', SK: 'METADATA', name: 'Phones' },
    });

    // QueryCommand for attribute schema
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_phones',
          schemaVersion: 1,
          attributes: [
            {
              fieldName: 'brand',
              displayLabel: 'Brand',
              dataType: 'text',
              required: true,
              filterable: true,
              displayPriority: 1,
            },
            {
              fieldName: 'model',
              displayLabel: 'Model',
              dataType: 'text',
              required: true,
              filterable: false,
              displayPriority: 2,
            },
            {
              fieldName: 'ram',
              displayLabel: 'RAM',
              dataType: 'single-select',
              required: true,
              filterable: true,
              displayPriority: 3,
            },
            {
              fieldName: 'storage',
              displayLabel: 'Storage',
              dataType: 'single-select',
              required: true,
              filterable: true,
              displayPriority: 4,
            },
            {
              fieldName: 'displaySize',
              displayLabel: 'Display Size',
              dataType: 'number',
              required: true,
              filterable: false,
              displayPriority: 5,
            },
          ],
        },
      ],
    });

    const result = await searchProductsEnriched('samsung', 20);

    expect(result.items[0]?.previewAttributes).toEqual({
      brand: 'Samsung',
      model: 'Galaxy S24',
      ram: '8GB',
    });
  });

  it('should filter results by categoryId when provided', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await searchProductsEnriched('laptop', 20, undefined, { categoryId: 'cat_electronics' });

    const { ScanCommand: MockedScanCommand } =
      (await import('@aws-sdk/lib-dynamodb')) as unknown as {
        ScanCommand: ReturnType<typeof vi.fn>;
      };
    expect(MockedScanCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        FilterExpression: expect.stringContaining('#categoryId = :categoryId'),
        ExpressionAttributeValues: expect.objectContaining({
          ':categoryId': 'cat_electronics',
        }),
      }),
    );
  });

  it('should filter results by subcategoryId when provided', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await searchProductsEnriched('shoes', 20, undefined, { subcategoryId: 'subcat_footwear' });

    const { ScanCommand: MockedScanCommand } =
      (await import('@aws-sdk/lib-dynamodb')) as unknown as {
        ScanCommand: ReturnType<typeof vi.fn>;
      };
    expect(MockedScanCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        FilterExpression: expect.stringContaining('#subcategoryId = :subcategoryId'),
        ExpressionAttributeValues: expect.objectContaining({
          ':subcategoryId': 'subcat_footwear',
        }),
      }),
    );
  });

  it('should handle products without categoryId or subcategoryId gracefully', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-legacy',
          name: 'Legacy Product',
          price: 100,
          imageUrls: ['https://s3.amazonaws.com/legacy.jpg'],
          averageRating: 3.0,
          sellerName: 'Old Store',
          isDeleted: false,
          searchTokens: 'legacy product old',
          // No categoryId or subcategoryId (legacy product)
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const result = await searchProductsEnriched('legacy', 20);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      productId: 'prod-legacy',
      name: 'Legacy Product',
      price: 100,
      primaryImageUrl: 'https://s3.amazonaws.com/legacy.jpg',
      averageRating: 3.0,
      sellerName: 'Old Store',
      categoryName: '',
      subcategoryName: '',
      previewAttributes: {},
    });
  });

  it('should return empty list when no products match', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    const result = await searchProductsEnriched('nonexistentproduct', 20);

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should include nextCursor when LastEvaluatedKey is present', async () => {
    const lastKey = { PK: 'PRODUCT#123', SK: 'METADATA' };

    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-1',
          name: 'Phone',
          price: 499,
          imageUrls: ['https://s3.amazonaws.com/phone.jpg'],
          isDeleted: false,
          searchTokens: 'phone smartphone',
        },
      ],
      LastEvaluatedKey: lastKey,
    });

    const result = await searchProductsEnriched('phone', 1);

    expect(result.nextCursor).toBeDefined();
    const decoded = JSON.parse(
      Buffer.from(result.nextCursor ?? '', 'base64').toString('utf-8'),
    ) as Record<string, unknown>;
    expect(decoded).toEqual(lastKey);
  });

  it('should use cached category names for subsequent items with same category', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          productId: 'prod-1',
          name: 'Product A',
          price: 100,
          imageUrls: [],
          isDeleted: false,
          searchTokens: 'product a',
          categoryId: 'cat_clothing',
          subcategoryId: 'subcat_footwear',
          dynamicAttributes: { brand: 'Nike' },
        },
        {
          productId: 'prod-2',
          name: 'Product B',
          price: 200,
          imageUrls: [],
          isDeleted: false,
          searchTokens: 'product b',
          categoryId: 'cat_clothing',
          subcategoryId: 'subcat_footwear',
          dynamicAttributes: { brand: 'Adidas' },
        },
      ],
      LastEvaluatedKey: undefined,
    });

    // GetCommand for cat_clothing (only called once due to caching)
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'CAT#cat_clothing', SK: 'METADATA', name: 'Clothing' },
    });

    // GetCommand for subcat_footwear (only called once due to caching)
    mockSend.mockResolvedValueOnce({
      Item: { PK: 'CAT#subcat_footwear', SK: 'METADATA', name: 'Footwear' },
    });

    // QueryCommand for schema (only called once due to caching)
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_footwear',
          schemaVersion: 1,
          attributes: [
            {
              fieldName: 'brand',
              displayLabel: 'Brand',
              dataType: 'text',
              required: true,
              filterable: true,
              displayPriority: 1,
            },
          ],
        },
      ],
    });

    const result = await searchProductsEnriched('product', 20);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.categoryName).toBe('Clothing');
    expect(result.items[0]?.subcategoryName).toBe('Footwear');
    expect(result.items[1]?.categoryName).toBe('Clothing');
    expect(result.items[1]?.subcategoryName).toBe('Footwear');
    // Only 4 calls total: 1 scan + 1 get category + 1 get subcategory + 1 query schema
    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(searchProductsEnriched('laptop', 20)).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
