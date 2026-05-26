import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK modules before importing service
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

import { getProductDetail } from './service.js';

const productWithDynamicAttributes = {
  PK: 'PRODUCT#prod-123',
  SK: 'METADATA',
  productId: 'prod-123',
  sellerId: 'seller-abc',
  name: 'Nike Air Max',
  description: 'Comfortable running shoes',
  price: 8999,
  stockQuantity: 50,
  categoryId: 'cat_clothing',
  subcategoryId: 'subcat_footwear',
  dynamicAttributes: {
    brand: 'Nike',
    availableSizes: ['IND 7', 'IND 8', 'IND 9'],
    gender: 'Male',
    ageGroup: 'Adult',
    availableColours: ['Black', 'White'],
  },
  schemaVersion: 1,
  imageUrls: ['https://bucket.s3.amazonaws.com/products/prod-123/img1.jpg'],
  isDeleted: false,
  createdAt: '2024-06-15T10:30:00.000Z',
  updatedAt: '2024-06-15T10:30:00.000Z',
  GSI1PK: 'SUBCATEGORY#subcat_footwear',
  GSI1SK: 'CREATED#2024-06-15T10:30:00.000Z',
  GSI2PK: 'SELLER#seller-abc',
  GSI2SK: 'CREATED#2024-06-15T10:30:00.000Z',
  searchTokens: 'nike air max comfortable running shoes nike male',
};

const footwearSchema = {
  PK: 'CAT#subcat_footwear',
  SK: 'SCHEMA#v1',
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
    {
      fieldName: 'availableColours',
      displayLabel: 'Available Colours',
      dataType: 'multi-select',
      required: true,
      filterable: true,
      displayPriority: 5,
    },
    {
      fieldName: 'material',
      displayLabel: 'Material',
      dataType: 'text',
      required: false,
      filterable: false,
      displayPriority: 6,
    },
    {
      fieldName: 'soleType',
      displayLabel: 'Sole Type',
      dataType: 'text',
      required: false,
      filterable: false,
      displayPriority: 7,
    },
  ],
};

describe('getProductDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-dev-product-images';
    process.env['CATEGORIES_TABLE_NAME'] = 'blipzo-dev-categories';
  });

  it('should enrich product with attributeLabels when subcategoryId exists', async () => {
    // First call: GetCommand to fetch product
    mockSend.mockResolvedValueOnce({ Item: productWithDynamicAttributes });
    // Second call: QueryCommand to fetch attribute schema
    mockSend.mockResolvedValueOnce({ Items: [footwearSchema] });

    const result = await getProductDetail('prod-123');

    expect(result.attributeLabels).toBeDefined();
    expect(result.attributeLabels).toEqual({
      brand: 'Brand',
      availableSizes: 'Available Sizes',
      gender: 'Gender',
      ageGroup: 'Age Group',
      availableColours: 'Available Colours',
    });
  });

  it('should omit optional attributes with null/undefined values from dynamicAttributes', async () => {
    // Product with optional attributes not filled (material and soleType missing)
    mockSend.mockResolvedValueOnce({ Item: productWithDynamicAttributes });
    mockSend.mockResolvedValueOnce({ Items: [footwearSchema] });

    const result = await getProductDetail('prod-123');

    // material and soleType are optional and not present in dynamicAttributes
    expect(result.dynamicAttributes).not.toHaveProperty('material');
    expect(result.dynamicAttributes).not.toHaveProperty('soleType');
    // attributeLabels should also not include them
    expect(result.attributeLabels).not.toHaveProperty('material');
    expect(result.attributeLabels).not.toHaveProperty('soleType');
  });

  it('should include optional attributes that have values', async () => {
    const productWithOptionals = {
      ...productWithDynamicAttributes,
      dynamicAttributes: {
        ...productWithDynamicAttributes.dynamicAttributes,
        material: 'Mesh',
        soleType: 'Rubber',
      },
    };

    mockSend.mockResolvedValueOnce({ Item: productWithOptionals });
    mockSend.mockResolvedValueOnce({ Items: [footwearSchema] });

    const result = await getProductDetail('prod-123');

    expect(result.dynamicAttributes).toHaveProperty('material', 'Mesh');
    expect(result.dynamicAttributes).toHaveProperty('soleType', 'Rubber');
    expect(result.attributeLabels).toHaveProperty('material', 'Material');
    expect(result.attributeLabels).toHaveProperty('soleType', 'Sole Type');
  });

  it('should return product without attributeLabels for legacy products (no subcategoryId)', async () => {
    const legacyProduct = {
      PK: 'PRODUCT#prod-legacy',
      SK: 'METADATA',
      productId: 'prod-legacy',
      sellerId: 'seller-abc',
      name: 'Legacy Product',
      description: 'A legacy product',
      price: 1999,
      stockQuantity: 10,
      categories: ['Electronics'],
      imageUrls: ['https://bucket.s3.amazonaws.com/products/prod-legacy/img1.jpg'],
      isDeleted: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    mockSend.mockResolvedValueOnce({ Item: legacyProduct });

    const result = await getProductDetail('prod-legacy');

    expect(result.attributeLabels).toBeUndefined();
    expect(result.productId).toBe('prod-legacy');
  });

  it('should return product without attributeLabels when schema is not found', async () => {
    mockSend.mockResolvedValueOnce({ Item: productWithDynamicAttributes });
    // Schema query returns empty
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await getProductDetail('prod-123');

    expect(result.attributeLabels).toBeUndefined();
    expect(result.productId).toBe('prod-123');
  });

  it('should throw 404 when product does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(getProductDetail('nonexistent')).rejects.toThrow('Product not found');
  });

  it('should preserve all other product fields in the enriched response', async () => {
    mockSend.mockResolvedValueOnce({ Item: productWithDynamicAttributes });
    mockSend.mockResolvedValueOnce({ Items: [footwearSchema] });

    const result = await getProductDetail('prod-123');

    expect(result.productId).toBe('prod-123');
    expect(result.sellerId).toBe('seller-abc');
    expect(result.name).toBe('Nike Air Max');
    expect(result.price).toBe(8999);
    expect(result.categoryId).toBe('cat_clothing');
    expect(result.subcategoryId).toBe('subcat_footwear');
    expect(result.schemaVersion).toBe(1);
  });
});
