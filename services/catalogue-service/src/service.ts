import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { CatalogueItem, CatalogueListResponse, ProductRecord } from '@blipzo/shared';

import { createNotFoundError, createServiceUnavailableError } from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

function getProductsTableName(): string {
  return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}

function getCategoriesTableName(): string {
  return process.env['CATEGORIES_TABLE_NAME'] ?? '';
}

export interface CategoryRecord {
  categoryId: string;
  name: string;
}

/**
 * Retrieves all categories from the Categories table.
 * Returns an array of category IDs and names.
 *
 * Requirement 6.1
 */
export async function listCategories(): Promise<CategoryRecord[]> {
  try {
    const command = new ScanCommand({
      TableName: getCategoriesTableName(),
    });

    const result = await docClient.send(command);

    return (result.Items ?? []).map((item) => ({
      categoryId: item['categoryId'] as string,
      name: item['name'] as string,
    }));
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Validates that a category exists in the Categories table.
 * Throws 404 if the category does not exist.
 *
 * Requirement 6.4
 */
export async function validateCategoryExists(categoryId: string): Promise<void> {
  try {
    const command = new GetCommand({
      TableName: getCategoriesTableName(),
      Key: {
        categoryId,
      },
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      createNotFoundError(`Category '${categoryId}' not found`);
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Maps a DynamoDB product item to a CatalogueItem for list responses.
 */
function mapItemToCatalogueItem(item: Record<string, unknown>): CatalogueItem {
  const imageUrls = item['imageUrls'] as string[] | undefined;
  const primaryImageUrl = imageUrls?.[0] ?? '';

  return {
    productId: item['productId'] as string,
    name: item['name'] as string,
    price: item['price'] as number,
    primaryImageUrl,
    averageRating: (item['averageRating'] as number | undefined) ?? 0,
    sellerName: (item['sellerName'] as string | undefined) ?? '',
  };
}

/**
 * Decodes a base64-encoded cursor into a DynamoDB ExclusiveStartKey.
 * Returns undefined if the cursor is invalid.
 */
function decodeCursor(cursor: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Encodes a DynamoDB LastEvaluatedKey into a base64 cursor string.
 */
function encodeCursor(lastEvaluatedKey: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
}

/**
 * Lists products in a category using GSI1 (CategoryByDate).
 * Filters out deleted products, applies cursor-based pagination,
 * and sorts by most recently listed first.
 *
 * Requirements: 6.1, 6.5, 6.7
 */
export async function listProductsByCategory(
  categoryId: string,
  limit: number = 20,
  cursor?: string,
): Promise<CatalogueListResponse> {
  // Step 1: Validate category exists
  await validateCategoryExists(categoryId);

  // Step 2: Query GSI1 with CATEGORY#{categoryId}, filter isDeleted = false
  try {
    const queryInput: {
      TableName: string;
      IndexName: string;
      KeyConditionExpression: string;
      FilterExpression: string;
      ExpressionAttributeNames: Record<string, string>;
      ExpressionAttributeValues: Record<string, unknown>;
      Limit: number;
      ScanIndexForward: boolean;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
      TableName: getProductsTableName(),
      IndexName: 'GSI1-CategoryByDate',
      KeyConditionExpression: '#gsi1pk = :gsi1pk',
      FilterExpression: '#isDeleted = :isDeleted',
      ExpressionAttributeNames: {
        '#gsi1pk': 'GSI1PK',
        '#isDeleted': 'isDeleted',
      },
      ExpressionAttributeValues: {
        ':gsi1pk': `CATEGORY#${categoryId}`,
        ':isDeleted': false,
      },
      Limit: limit,
      ScanIndexForward: false, // Most recently listed first
    };

    if (cursor) {
      const decodedKey = decodeCursor(cursor);
      if (decodedKey) {
        queryInput.ExclusiveStartKey = decodedKey;
      }
    }

    const command = new QueryCommand(queryInput);
    const result = await docClient.send(command);

    const items: CatalogueItem[] = (result.Items ?? []).map((item) =>
      mapItemToCatalogueItem(item as Record<string, unknown>),
    );

    const response: CatalogueListResponse = { items };

    if (result.LastEvaluatedKey) {
      response.nextCursor = encodeCursor(result.LastEvaluatedKey as Record<string, unknown>);
    }

    return response;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Retrieves a product by ID from the Products table.
 * Returns 404 if the product does not exist or is marked as deleted.
 * Returns the full ProductRecord including sellerPolicy summary.
 *
 * Requirements: 6.2, 6.3
 */
export async function getProductDetail(productId: string): Promise<ProductRecord> {
  try {
    const command = new GetCommand({
      TableName: getProductsTableName(),
      Key: {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA',
      },
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      createNotFoundError(`Product '${productId}' not found`);
    }

    const item = result.Item;

    if (item['isDeleted'] === true) {
      createNotFoundError(`Product '${productId}' not found`);
    }

    const sellerPolicy = item['sellerPolicy'] as ProductRecord['sellerPolicy'] | undefined;

    const product: ProductRecord = {
      productId: item['productId'] as string,
      sellerId: item['sellerId'] as string,
      name: item['name'] as string,
      description: item['description'] as string,
      price: item['price'] as number,
      stockQuantity: item['stockQuantity'] as number,
      categories: item['categories'] as string[],
      imageUrls: item['imageUrls'] as string[],
      isDeleted: item['isDeleted'] as boolean,
      createdAt: item['createdAt'] as string,
      updatedAt: item['updatedAt'] as string,
    };

    if (sellerPolicy) {
      (product as { sellerPolicy: typeof sellerPolicy }).sellerPolicy = sellerPolicy;
    }

    return product;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Searches products using GSI1 with a FilterExpression that checks
 * if searchTokens contains the lowercase query.
 * Returns paginated CatalogueListResponse.
 *
 * For the academic scope, search scans GSI1 across all categories
 * with a filter on searchTokens. In production, this would use OpenSearch.
 *
 * Requirements: 6.6, 6.7
 */
export async function searchProducts(
  query: string,
  limit: number = 20,
  cursor?: string,
): Promise<CatalogueListResponse> {
  try {
    const lowercaseQuery = query.toLowerCase();

    const scanInput: {
      TableName: string;
      FilterExpression: string;
      ExpressionAttributeNames: Record<string, string>;
      ExpressionAttributeValues: Record<string, unknown>;
      Limit: number;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
      TableName: getProductsTableName(),
      FilterExpression: 'contains(#searchTokens, :query) AND #isDeleted = :isDeleted',
      ExpressionAttributeNames: {
        '#searchTokens': 'searchTokens',
        '#isDeleted': 'isDeleted',
      },
      ExpressionAttributeValues: {
        ':query': lowercaseQuery,
        ':isDeleted': false,
      },
      Limit: limit,
    };

    if (cursor) {
      const decodedKey = decodeCursor(cursor);
      if (decodedKey) {
        scanInput.ExclusiveStartKey = decodedKey;
      }
    }

    const command = new ScanCommand(scanInput);
    const result = await docClient.send(command);

    const items: CatalogueItem[] = (result.Items ?? []).map((item) =>
      mapItemToCatalogueItem(item as Record<string, unknown>),
    );

    const response: CatalogueListResponse = { items };

    if (result.LastEvaluatedKey) {
      response.nextCursor = encodeCursor(result.LastEvaluatedKey as Record<string, unknown>);
    }

    return response;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}
