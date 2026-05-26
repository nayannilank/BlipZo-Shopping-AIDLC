import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { AttributeDefinition, ProductListItem } from '@blipzo/shared';

import { createServiceUnavailableError } from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

function getProductsTableName(): string {
  return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}

/**
 * Options for filtering and paginating subcategory product listings.
 */
export interface BrowseOptions {
  /** Page size (1-50, default 20) */
  limit?: number;
  /** Base64-encoded pagination cursor */
  cursor?: string;
  /** Minimum price filter (inclusive) */
  minPrice?: number;
  /** Maximum price filter (inclusive) */
  maxPrice?: number;
  /** Dynamic attribute filters keyed by fieldName */
  attributeFilters?: Record<string, string>;
}

/**
 * Response shape for subcategory product browsing.
 */
export interface BrowseProductsResponse {
  items: ProductListItem[];
  nextCursor?: string;
  total?: number;
  filters: Record<string, Record<string, number>>;
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
 * Builds a DynamoDB FilterExpression and associated attribute names/values
 * from the provided browse options.
 *
 * Filters applied:
 * - isDeleted <> true (always)
 * - price >= minPrice (if provided)
 * - price <= maxPrice (if provided)
 * - Single-select attribute equality (dynamicAttributes.{field} = value)
 * - Multi-select attribute contains (contains(dynamicAttributes.{field}, value))
 */
function buildFilterExpression(
  options: BrowseOptions,
  filterableAttributes?: AttributeDefinition[],
): {
  filterExpression: string;
  expressionAttributeNames: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
} {
  const conditions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  // Always exclude soft-deleted products
  conditions.push('#isDeleted <> :isDeletedTrue');
  expressionAttributeNames['#isDeleted'] = 'isDeleted';
  expressionAttributeValues[':isDeletedTrue'] = true;

  // Price range filters
  if (options.minPrice !== undefined) {
    conditions.push('#price >= :minPrice');
    expressionAttributeNames['#price'] = 'price';
    expressionAttributeValues[':minPrice'] = options.minPrice;
  }

  if (options.maxPrice !== undefined) {
    conditions.push('#price <= :maxPrice');
    if (!expressionAttributeNames['#price']) {
      expressionAttributeNames['#price'] = 'price';
    }
    expressionAttributeValues[':maxPrice'] = options.maxPrice;
  }

  // Dynamic attribute filters
  if (options.attributeFilters && filterableAttributes) {
    const filterableMap = new Map(filterableAttributes.map((attr) => [attr.fieldName, attr]));

    let filterIndex = 0;
    for (const [fieldName, filterValue] of Object.entries(options.attributeFilters)) {
      const attrDef = filterableMap.get(fieldName);
      if (!attrDef) {
        // Skip non-filterable attributes
        continue;
      }

      const nameAlias = `#dynAttr${filterIndex}`;
      const valueAlias = `:dynVal${filterIndex}`;
      expressionAttributeNames['#dynamicAttributes'] = 'dynamicAttributes';
      expressionAttributeNames[nameAlias] = fieldName;
      expressionAttributeValues[valueAlias] = filterValue;

      if (attrDef.dataType === 'multi-select') {
        // For multi-select: product's attribute array must contain the filter value
        conditions.push(`contains(#dynamicAttributes.${nameAlias}, ${valueAlias})`);
      } else {
        // For single-select and other types: equality check
        conditions.push(`#dynamicAttributes.${nameAlias} = ${valueAlias}`);
      }

      filterIndex++;
    }
  }

  return {
    filterExpression: conditions.join(' AND '),
    expressionAttributeNames,
    expressionAttributeValues,
  };
}

/**
 * Maps a DynamoDB product item to a ProductListItem for browse responses.
 */
function mapItemToProductListItem(item: Record<string, unknown>): ProductListItem {
  const imageUrls = item['imageUrls'] as string[] | undefined;
  const primaryImageUrl = imageUrls?.[0] ?? '';

  return {
    productId: item['productId'] as string,
    name: item['name'] as string,
    price: item['price'] as number,
    primaryImageUrl,
    averageRating: (item['averageRating'] as number | undefined) ?? 0,
    sellerName: (item['sellerName'] as string | undefined) ?? '',
    categoryName: (item['categoryName'] as string | undefined) ?? '',
    subcategoryName: (item['subcategoryName'] as string | undefined) ?? '',
    previewAttributes:
      (item['previewAttributes'] as
        | Record<string, string | number | boolean | string[]>
        | undefined) ?? {},
  };
}

/**
 * Computes facet counts for filterable attributes from the returned items.
 * For each filterable attribute, counts how many items have each distinct value.
 */
function computeFacetCounts(
  items: Record<string, unknown>[],
  filterableAttributes: AttributeDefinition[],
): Record<string, Record<string, number>> {
  const facets: Record<string, Record<string, number>> = {};

  for (const attr of filterableAttributes) {
    facets[attr.fieldName] = {};
  }

  for (const item of items) {
    const dynamicAttributes = item['dynamicAttributes'] as
      | Record<string, string | number | boolean | string[]>
      | undefined;

    if (!dynamicAttributes) {
      continue;
    }

    for (const attr of filterableAttributes) {
      const value = dynamicAttributes[attr.fieldName];
      if (value === undefined || value === null) {
        continue;
      }

      if (attr.dataType === 'multi-select' && Array.isArray(value)) {
        for (const v of value) {
          const strVal = String(v);
          const bucket = facets[attr.fieldName] ?? {};
          bucket[strVal] = (bucket[strVal] ?? 0) + 1;
          facets[attr.fieldName] = bucket;
        }
      } else {
        const strVal = String(value);
        const bucket = facets[attr.fieldName] ?? {};
        bucket[strVal] = (bucket[strVal] ?? 0) + 1;
        facets[attr.fieldName] = bucket;
      }
    }
  }

  return facets;
}

/**
 * Lists products in a subcategory using GSI1 (SUBCATEGORY#{subcategoryId}).
 * Sorted by GSI1SK descending (newest first: CREATED#{timestamp}).
 * Applies cursor-based pagination and dynamic filter expressions.
 *
 * Requirements: 5.3, 5.4, 5.6, 6.2, 6.3, 6.4, 6.5
 *
 * @param subcategoryId - The subcategory to browse products for
 * @param options - Pagination and filter options
 * @param filterableAttributes - Attribute definitions marked as filterable for this subcategory
 * @returns Paginated product list with facet counts
 */
export async function listProductsBySubcategory(
  subcategoryId: string,
  options: BrowseOptions = {},
  filterableAttributes: AttributeDefinition[] = [],
): Promise<BrowseProductsResponse> {
  const limit = options.limit ?? 20;

  const { filterExpression, expressionAttributeNames, expressionAttributeValues } =
    buildFilterExpression(options, filterableAttributes);

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
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#gsi1pk': 'GSI1PK',
        ...expressionAttributeNames,
      },
      ExpressionAttributeValues: {
        ':gsi1pk': `SUBCATEGORY#${subcategoryId}`,
        ...expressionAttributeValues,
      },
      Limit: limit,
      ScanIndexForward: false, // Descending — newest first
    };

    if (options.cursor) {
      const decodedKey = decodeCursor(options.cursor);
      if (decodedKey) {
        queryInput.ExclusiveStartKey = decodedKey;
      }
    }

    const command = new QueryCommand(queryInput);
    const result = await docClient.send(command);

    const rawItems = result.Items ?? [];
    const items: ProductListItem[] = rawItems.map((item) =>
      mapItemToProductListItem(item as Record<string, unknown>),
    );

    const filters = computeFacetCounts(rawItems as Record<string, unknown>[], filterableAttributes);

    const response: BrowseProductsResponse = {
      items,
      filters,
    };

    if (result.LastEvaluatedKey) {
      response.nextCursor = encodeCursor(result.LastEvaluatedKey as Record<string, unknown>);
    }

    if (result.Count !== undefined) {
      response.total = result.Count;
    }

    return response;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}
