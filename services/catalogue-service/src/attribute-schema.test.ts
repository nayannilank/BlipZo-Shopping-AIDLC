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
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

// Set environment variables before importing module
process.env['CATEGORIES_TABLE_NAME'] = 'blipzo-dev-categories';

import { getAttributeSchema, clearSchemaCache } from './attribute-schema.js';

describe('getAttributeSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSchemaCache();
  });

  it('should return the latest schema for a valid subcategory', async () => {
    const schemaItem = {
      PK: 'CAT#subcat_footwear',
      SK: 'SCHEMA#v2',
      subcategoryId: 'subcat_footwear',
      schemaVersion: 2,
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
          fieldName: 'gender',
          displayLabel: 'Gender',
          dataType: 'single-select',
          required: true,
          allowedValues: ['Male', 'Female', 'Unisex'],
          filterable: true,
          displayPriority: 2,
        },
      ],
      createdAt: '2024-01-15T00:00:00.000Z',
    };

    mockSend.mockResolvedValueOnce({
      Items: [schemaItem],
    });

    const result = await getAttributeSchema('subcat_footwear');

    expect(result).toEqual({
      subcategoryId: 'subcat_footwear',
      schemaVersion: 2,
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
          fieldName: 'gender',
          displayLabel: 'Gender',
          dataType: 'single-select',
          required: true,
          allowedValues: ['Male', 'Female', 'Unisex'],
          filterable: true,
          displayPriority: 2,
        },
      ],
    });
  });

  it('should throw 404 when no schema exists for the subcategory', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
    });

    await expect(getAttributeSchema('subcat_nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      message: "Attribute schema not found for subcategory 'subcat_nonexistent'",
    });
  });

  it('should throw 404 when Items is undefined', async () => {
    mockSend.mockResolvedValueOnce({
      Items: undefined,
    });

    await expect(getAttributeSchema('subcat_missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should use in-memory cache on subsequent calls for the same subcategory', async () => {
    const schemaItem = {
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
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    mockSend.mockResolvedValueOnce({
      Items: [schemaItem],
    });

    // First call - should hit DynamoDB
    const result1 = await getAttributeSchema('subcat_phones');
    // Second call - should use cache
    const result2 = await getAttributeSchema('subcat_phones');

    expect(result1).toEqual(result2);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should query DynamoDB separately for different subcategories', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_phones',
          schemaVersion: 1,
          attributes: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });

    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_laptops',
          schemaVersion: 1,
          attributes: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });

    await getAttributeSchema('subcat_phones');
    await getAttributeSchema('subcat_laptops');

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(getAttributeSchema('subcat_footwear')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('should clear cache when clearSchemaCache is called', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_phones',
          schemaVersion: 1,
          attributes: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });

    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_phones',
          schemaVersion: 2,
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
          createdAt: '2024-02-01T00:00:00.000Z',
        },
      ],
    });

    // First call
    const result1 = await getAttributeSchema('subcat_phones');
    expect(result1.schemaVersion).toBe(1);

    // Clear cache
    clearSchemaCache();

    // Second call should hit DynamoDB again
    const result2 = await getAttributeSchema('subcat_phones');
    expect(result2.schemaVersion).toBe(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('should query with correct DynamoDB parameters', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          subcategoryId: 'subcat_footwear',
          schemaVersion: 1,
          attributes: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });

    await getAttributeSchema('subcat_footwear');

    const { QueryCommand: MockedQueryCommand } =
      (await import('@aws-sdk/lib-dynamodb')) as unknown as {
        QueryCommand: ReturnType<typeof vi.fn>;
      };

    expect(MockedQueryCommand).toHaveBeenCalledWith({
      TableName: 'blipzo-dev-categories',
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': 'CAT#subcat_footwear',
        ':skPrefix': 'SCHEMA#',
      },
      ScanIndexForward: false,
      Limit: 1,
    });
  });
});
