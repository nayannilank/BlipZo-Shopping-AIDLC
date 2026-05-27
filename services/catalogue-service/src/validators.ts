import type { APIGatewayProxyEvent } from 'aws-lambda';
import createError from 'http-errors';

/**
 * Extracts the categoryId from the path parameters.
 * Throws 400 if not present.
 *
 * Requirement 6.4
 */
export function extractCategoryId(event: APIGatewayProxyEvent): string {
  const categoryId = event.pathParameters?.['categoryId'];

  if (!categoryId) {
    throw createError(400, 'Category ID is required');
  }

  return categoryId;
}

/**
 * Extracts the productId from the path parameters.
 * Throws 400 if not present.
 */
export function extractProductId(event: APIGatewayProxyEvent): string {
  const productId = event.pathParameters?.['productId'];

  if (!productId) {
    throw createError(400, 'Product ID is required');
  }

  return productId;
}

/**
 * Extracts pagination parameters from query string.
 * Limit is clamped to 1-20 (default 20) per Requirement 6.5.
 * Cursor is an optional base64-encoded pagination token.
 */
export function extractPaginationParams(event: APIGatewayProxyEvent): {
  limit: number;
  cursor?: string;
} {
  const limitStr = event.queryStringParameters?.['limit'];
  const cursorParam = event.queryStringParameters?.['cursor'];

  let limit = 20;
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
      limit = parsed;
    }
  }

  const result: { limit: number; cursor?: string } = { limit };
  if (cursorParam) {
    result.cursor = cursorParam;
  }

  return result;
}

/**
 * Extracts the subcategoryId from the path parameters.
 * Note: API Gateway uses {categoryId} as the path parameter name for all
 * /catalogue/categories/{categoryId}/... routes, so we read from 'categoryId'.
 * Throws 400 if not present.
 *
 * Requirements: 1.3, 2.1
 */
export function extractSubcategoryId(event: APIGatewayProxyEvent): string {
  const subcategoryId = event.pathParameters?.['categoryId'];

  if (!subcategoryId) {
    throw createError(400, 'Subcategory ID is required');
  }

  return subcategoryId;
}

/**
 * Extracts and validates search query parameters.
 * Query must be 1-100 non-whitespace-only characters.
 * Optionally extracts categoryId and subcategoryId for filtering.
 *
 * Requirements: 6.6, 9.3
 */
export function extractSearchParams(event: APIGatewayProxyEvent): {
  query: string;
  limit: number;
  cursor?: string;
  categoryId?: string;
  subcategoryId?: string;
} {
  const q = event.queryStringParameters?.['q'];

  if (!q || q.trim().length === 0) {
    throw createError(400, 'Search query is required and must not be whitespace only');
  }

  if (q.length > 100) {
    throw createError(400, 'Search query must be at most 100 characters');
  }

  const { limit, cursor } = extractPaginationParams(event);

  const result: {
    query: string;
    limit: number;
    cursor?: string;
    categoryId?: string;
    subcategoryId?: string;
  } = { query: q, limit };
  if (cursor) {
    result.cursor = cursor;
  }

  // Extract optional category/subcategory filters
  const categoryId = event.queryStringParameters?.['categoryId'];
  if (categoryId) {
    result.categoryId = categoryId;
  }

  const subcategoryId = event.queryStringParameters?.['subcategoryId'];
  if (subcategoryId) {
    result.subcategoryId = subcategoryId;
  }

  return result;
}
