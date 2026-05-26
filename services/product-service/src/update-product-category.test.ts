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
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Get', input })),
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Put', input })),
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Query', input })),
  UpdateCommand: vi.fn().mockImplementation((input: unknown) => ({ type: 'Update', input })),
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

import { updateProduct } from './service.js';

const existingProduct = {
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
  imageUrls: ['https://example.com/image.jpg'],
  isDeleted: false,
  createdAt: '2024-06-15T10:30:00.000Z',
  updatedAt: '2024-06-15T10:30:00.000Z',
};

const footwearSchema = {
  Items: [
    {
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
          allowedValues: [
            'IND 1',
            'IND 2',
            'IND 3',
            'IND 4',
            'IND 5',
            'IND 6',
            'IND 7',
            'IND 8',
            'IND 9',
            'IND 10',
            'IND 11',
            'IND 12',
          ],
          filterable: true,
          displayPriority: 2,
        },
        {
          fieldName: 'gender',
          displayLabel: 'Gender',
          dataType: 'single-select',
          required: true,
          allowedValues: ['Male', 'Female', 'Unisex'],
          filterable: true,
          displayPriority: 3,
        },
        {
          fieldName: 'ageGroup',
          displayLabel: 'Age Group',
          dataType: 'single-select',
          required: true,
          allowedValues: ['Adult', 'Kids'],
          filterable: true,
          displayPriority: 4,
        },
        {
          fieldName: 'availableColours',
          displayLabel: 'Available Colours',
          dataType: 'multi-select',
          required: true,
          allowedValues: null,
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
    },
  ],
};

describe('updateProduct - category immutability (Requirement 8.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['CATEGORIES_TABLE_NAME'] = 'blipzo-dev-categories';
  });

  it('should reject update when categoryId is changed', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });

    await expect(
      updateProduct('prod-123', { categoryId: 'cat_electronics' }, 'seller-abc'),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Category and subcategory cannot be changed after creation',
    });
  });

  it('should reject update when subcategoryId is changed', async () => {
    mockSend.mockResolvedValueOnce({ Item: existingProduct });

    await expect(
      updateProduct('prod-123', { subcategoryId: 'subcat_phones' }, 'seller-abc'),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Category and subcategory cannot be changed after creation',
    });
  });

  it('should allow update when categoryId matches existing value', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: existingProduct }) // getProductById
      .mockResolvedValueOnce(footwearSchema) // fetchAttributeSchema (for search tokens)
      .mockResolvedValueOnce({ Attributes: { ...existingProduct, name: 'Updated Name' } }); // update

    const result = await updateProduct(
      'prod-123',
      { categoryId: 'cat_clothing', name: 'Updated Name' },
      'seller-abc',
    );

    expect(result.name).toBe('Updated Name');
  });

  it('should allow update when subcategoryId matches existing value', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: existingProduct }) // getProductById
      .mockResolvedValueOnce(footwearSchema) // fetchAttributeSchema
      .mockResolvedValueOnce({ Attributes: { ...existingProduct, name: 'Updated Name' } }); // update

    const result = await updateProduct(
      'prod-123',
      { subcategoryId: 'subcat_footwear', name: 'Updated Name' },
      'seller-abc',
    );

    expect(result.name).toBe('Updated Name');
  });
});

describe('updateProduct - dynamic attributes validation (Requirement 8.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['CATEGORIES_TABLE_NAME'] = 'blipzo-dev-categories';
  });

  it('should validate dynamicAttributes against current schema', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: existingProduct }) // getProductById
      .mockResolvedValueOnce(footwearSchema) // fetchAttributeSchema
      .mockResolvedValueOnce({
        Attributes: {
          ...existingProduct,
          dynamicAttributes: {
            brand: 'Adidas',
            availableSizes: ['IND 8', 'IND 9'],
            gender: 'Unisex',
            ageGroup: 'Adult',
            availableColours: ['Blue'],
          },
        },
      }); // update

    const result = await updateProduct(
      'prod-123',
      {
        dynamicAttributes: {
          brand: 'Adidas',
          availableSizes: ['IND 8', 'IND 9'],
          gender: 'Unisex',
          ageGroup: 'Adult',
          availableColours: ['Blue'],
        },
      },
      'seller-abc',
    );

    expect(result.dynamicAttributes?.['brand']).toBe('Adidas');
  });

  it('should reject invalid dynamicAttributes with field-level errors', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: existingProduct }) // getProductById
      .mockResolvedValueOnce(footwearSchema); // fetchAttributeSchema

    await expect(
      updateProduct(
        'prod-123',
        {
          dynamicAttributes: {
            brand: '', // required text field - empty
            availableSizes: ['IND 8'],
            gender: 'Invalid', // not in allowedValues
            ageGroup: 'Adult',
            availableColours: ['Blue'],
          },
        },
        'seller-abc',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
    });
  });

  it('should reject dynamicAttributes missing required fields', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: existingProduct }) // getProductById
      .mockResolvedValueOnce(footwearSchema); // fetchAttributeSchema

    await expect(
      updateProduct(
        'prod-123',
        {
          dynamicAttributes: {
            brand: 'Nike',
            // missing availableSizes, gender, ageGroup, availableColours
          },
        },
        'seller-abc',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
    });
  });
});

describe('updateProduct - schema version update (Requirement 8.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-dev-products';
    process.env['CATEGORIES_TABLE_NAME'] = 'blipzo-dev-categories';
  });

  it('should update schemaVersion when schema has changed', async () => {
    const updatedSchema = {
      Items: [
        {
          ...footwearSchema.Items[0],
          schemaVersion: 2, // Schema version has been bumped
        },
      ],
    };

    mockSend
      .mockResolvedValueOnce({ Item: existingProduct }) // getProductById (schemaVersion: 1)
      .mockResolvedValueOnce(updatedSchema) // fetchAttributeSchema (schemaVersion: 2)
      .mockResolvedValueOnce({
        Attributes: {
          ...existingProduct,
          schemaVersion: 2,
          dynamicAttributes: {
            brand: 'Nike',
            availableSizes: ['IND 7', 'IND 8'],
            gender: 'Male',
            ageGroup: 'Adult',
            availableColours: ['Black'],
          },
        },
      }); // update

    const result = await updateProduct(
      'prod-123',
      {
        dynamicAttributes: {
          brand: 'Nike',
          availableSizes: ['IND 7', 'IND 8'],
          gender: 'Male',
          ageGroup: 'Adult',
          availableColours: ['Black'],
        },
      },
      'seller-abc',
    );

    expect(result.schemaVersion).toBe(2);

    // Verify the UpdateCommand included schemaVersion
    const updateCall = mockSend.mock.calls[2]?.[0] as
      | { input?: { UpdateExpression?: string } }
      | undefined;
    expect(updateCall?.input?.UpdateExpression).toContain('#schemaVersion');
  });

  it('should not update schemaVersion when schema has not changed', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: existingProduct }) // getProductById (schemaVersion: 1)
      .mockResolvedValueOnce(footwearSchema) // fetchAttributeSchema (schemaVersion: 1)
      .mockResolvedValueOnce({
        Attributes: {
          ...existingProduct,
          dynamicAttributes: {
            brand: 'Adidas',
            availableSizes: ['IND 8'],
            gender: 'Male',
            ageGroup: 'Adult',
            availableColours: ['Red'],
          },
        },
      }); // update

    await updateProduct(
      'prod-123',
      {
        dynamicAttributes: {
          brand: 'Adidas',
          availableSizes: ['IND 8'],
          gender: 'Male',
          ageGroup: 'Adult',
          availableColours: ['Red'],
        },
      },
      'seller-abc',
    );

    // Verify the UpdateCommand did NOT include schemaVersion
    const updateCall = mockSend.mock.calls[2]?.[0] as
      | { input?: { UpdateExpression?: string } }
      | undefined;
    expect(updateCall?.input?.UpdateExpression).not.toContain('#schemaVersion');
  });
});
