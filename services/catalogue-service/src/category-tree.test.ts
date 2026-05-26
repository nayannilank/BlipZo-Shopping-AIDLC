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

import { listCategories, listSubcategories } from './category-tree.js';

describe('listCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return active top-level categories from ParentIndex GSI', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          categoryId: 'cat_electronics',
          parentId: null,
          name: 'Electronics',
          slug: 'electronics',
          level: 1,
          isActive: true,
          icon: 'cpu',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          GSI1PK: 'PARENT#ROOT',
          GSI1SK: 'NAME#Electronics',
        },
        {
          categoryId: 'cat_clothing',
          parentId: null,
          name: 'Clothing',
          slug: 'clothing',
          level: 1,
          isActive: true,
          icon: 'shirt',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          GSI1PK: 'PARENT#ROOT',
          GSI1SK: 'NAME#Clothing',
        },
      ],
    });

    const result = await listCategories();

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0]).toEqual({
      categoryId: 'cat_electronics',
      parentId: null,
      name: 'Electronics',
      slug: 'electronics',
      level: 1,
      isActive: true,
      icon: 'cpu',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('should query ParentIndex with GSI1PK = PARENT#ROOT', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await listCategories();

    const { QueryCommand: MockedQueryCommand } =
      (await import('@aws-sdk/lib-dynamodb')) as unknown as {
        QueryCommand: ReturnType<typeof vi.fn>;
      };
    expect(MockedQueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        IndexName: 'ParentIndex',
        ExpressionAttributeValues: expect.objectContaining({
          ':gsi1pk': 'PARENT#ROOT',
          ':isActive': true,
        }),
      }),
    );
  });

  it('should return empty categories array when no items exist', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await listCategories();

    expect(result.categories).toEqual([]);
  });

  it('should handle undefined Items gracefully', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await listCategories();

    expect(result.categories).toEqual([]);
  });

  it('should handle categories without icon field', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          categoryId: 'cat_misc',
          parentId: null,
          name: 'Miscellaneous',
          slug: 'miscellaneous',
          level: 1,
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          GSI1PK: 'PARENT#ROOT',
          GSI1SK: 'NAME#Miscellaneous',
        },
      ],
    });

    const result = await listCategories();

    expect(result.categories[0]?.icon).toBeUndefined();
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(listCategories()).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('listSubcategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return active subcategories for a given category', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        {
          categoryId: 'subcat_footwear',
          parentId: 'cat_clothing',
          name: 'Footwear',
          slug: 'footwear',
          level: 2,
          isActive: true,
          icon: 'footwear-icon',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          GSI1PK: 'PARENT#cat_clothing',
          GSI1SK: 'NAME#Footwear',
        },
        {
          categoryId: 'subcat_shirts',
          parentId: 'cat_clothing',
          name: 'Shirts',
          slug: 'shirts',
          level: 2,
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          GSI1PK: 'PARENT#cat_clothing',
          GSI1SK: 'NAME#Shirts',
        },
      ],
    });

    const result = await listSubcategories('cat_clothing');

    expect(result.subcategories).toHaveLength(2);
    expect(result.subcategories[0]).toEqual({
      categoryId: 'subcat_footwear',
      parentId: 'cat_clothing',
      name: 'Footwear',
      slug: 'footwear',
      level: 2,
      isActive: true,
      icon: 'footwear-icon',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('should query ParentIndex with GSI1PK = PARENT#{categoryId}', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await listSubcategories('cat_electronics');

    const { QueryCommand: MockedQueryCommand } =
      (await import('@aws-sdk/lib-dynamodb')) as unknown as {
        QueryCommand: ReturnType<typeof vi.fn>;
      };
    expect(MockedQueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        IndexName: 'ParentIndex',
        ExpressionAttributeValues: expect.objectContaining({
          ':gsi1pk': 'PARENT#cat_electronics',
          ':isActive': true,
        }),
      }),
    );
  });

  it('should return empty subcategories array when no children exist', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await listSubcategories('cat_nonexistent');

    expect(result.subcategories).toEqual([]);
  });

  it('should throw 503 when DynamoDB is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(listSubcategories('cat_clothing')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('should re-throw errors that already have a statusCode', async () => {
    const httpError = new Error('Not Found') as Error & { statusCode: number };
    httpError.statusCode = 404;
    mockSend.mockRejectedValueOnce(httpError);

    await expect(listSubcategories('cat_clothing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
