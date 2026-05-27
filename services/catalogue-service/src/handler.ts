import { structuredLogger } from '@blipzo/shared';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import createError from 'http-errors';

import { getAttributeSchema } from './attribute-schema.js';
import { listCategories as listCategoryTree, listSubcategories } from './category-tree.js';
import { catalogueLatencyMetrics } from './metrics.js';
import { listProductsBySubcategory } from './product-browse.js';
import type { BrowseOptions } from './product-browse.js';
import {
  listCategories,
  listProductsByCategory,
  getProductDetail,
  searchProductsEnriched,
} from './service.js';
import type { SearchOptions } from './service.js';
import {
  extractCategoryId,
  extractProductId,
  extractSubcategoryId,
  extractPaginationParams,
  extractSearchParams,
} from './validators.js';

/**
 * GET /catalogue/categories — returns all category IDs and names.
 *
 * Requirements: 6.1
 */
const rawListCategoriesHandler = async (
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const categories = await listCategories();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ categories }),
  };
};

export const listCategoriesHandler = middy(rawListCategoriesHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /catalogue/categories/{categoryId} — browse products by category.
 * Validates categoryId exists, queries GSI1 with PK = CATEGORY#{categoryId},
 * filters isDeleted = false, applies cursor-based pagination,
 * returns CatalogueListResponse.
 *
 * Returns 404 for unknown category, 200 with empty list when no products exist.
 *
 * Requirements: 6.1, 6.3, 6.4, 6.5, 6.7
 */
const rawListProductsByCategoryHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const categoryId = extractCategoryId(event);
  const { limit, cursor } = extractPaginationParams(event);

  const result = await listProductsByCategory(categoryId, limit, cursor);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  };
};

export const listProductsByCategoryHandler = middy(rawListProductsByCategoryHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /catalogue/products/{productId} — returns full product detail.
 * Returns 404 if product not found or isDeleted = true.
 * Includes sellerPolicy summary when available.
 *
 * Requirements: 6.2, 6.3
 */
const rawGetProductDetailHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const productId = extractProductId(event);

  const product = await getProductDetail(productId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  };
};

export const getProductDetailHandler = middy(rawGetProductDetailHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /catalogue/search — search products by query string.
 * Validates q (1-100 non-whitespace chars), queries GSI1 with FilterExpression
 * contains(searchTokens, lowercase(q)), applies pagination,
 * returns enriched search results with category context and preview attributes.
 *
 * Supports optional categoryId and subcategoryId query parameters for filtering.
 *
 * Returns 200 with empty list when no products match.
 *
 * Requirements: 6.6, 6.7, 9.1, 9.2, 9.3
 */
const rawSearchProductsHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { query, limit, cursor, categoryId, subcategoryId } = extractSearchParams(event);

  const options: SearchOptions = {};
  if (categoryId) {
    options.categoryId = categoryId;
  }
  if (subcategoryId) {
    options.subcategoryId = subcategoryId;
  }

  const result = await searchProductsEnriched(query, limit, cursor, options);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  };
};

export const searchProductsHandler = middy(rawSearchProductsHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /catalogue/categories (new category tree endpoint) — returns all active
 * top-level categories from the hierarchical category tree.
 *
 * Requirements: 1.2, 5.1
 */
const rawListCategoryTreeHandler = async (
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const result = await listCategoryTree();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  };
};

export const listCategoryTreeHandler = middy(rawListCategoryTreeHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /catalogue/categories/{categoryId}/subcategories — returns all active
 * subcategories under the specified category.
 *
 * Requirements: 1.3, 5.2
 */
const rawListSubcategoriesHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const categoryId = extractCategoryId(event);
  const result = await listSubcategories(categoryId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  };
};

export const listSubcategoriesHandler = middy(rawListSubcategoriesHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /catalogue/categories/{subcategoryId}/schema — returns the attribute
 * schema for the specified subcategory.
 *
 * Requirements: 2.1
 */
const rawGetAttributeSchemaHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const subcategoryId = extractSubcategoryId(event);
  const result = await getAttributeSchema(subcategoryId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  };
};

export const getAttributeSchemaHandler = middy(rawGetAttributeSchemaHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/** Known query parameters that are not dynamic attribute filters */
const RESERVED_QUERY_PARAMS = new Set(['limit', 'cursor', 'minPrice', 'maxPrice']);

/**
 * Parses and validates browse query parameters from the API Gateway event.
 * Extracts limit, cursor, minPrice, maxPrice, and dynamic attribute filters.
 * Validates that dynamic filter params are marked as filterable in the schema.
 *
 * Requirements: 5.3, 5.4, 6.1, 6.5, 6.6, 6.7
 */
function extractBrowseParams(event: APIGatewayProxyEvent): {
  limit: number;
  cursor?: string;
  minPrice?: number;
  maxPrice?: number;
  attributeFilters: Record<string, string>;
} {
  const queryParams = event.queryStringParameters ?? {};

  // Parse limit (1-50, default 20)
  let limit = 20;
  const limitStr = queryParams['limit'];
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
      limit = parsed;
    } else if (!isNaN(parsed)) {
      limit = Math.max(1, Math.min(50, parsed));
    }
  }

  // Parse cursor
  const cursor = queryParams['cursor'] || undefined;

  // Parse minPrice
  let minPrice: number | undefined;
  const minPriceStr = queryParams['minPrice'];
  if (minPriceStr) {
    const parsed = parseFloat(minPriceStr);
    if (!isNaN(parsed) && parsed >= 0) {
      minPrice = parsed;
    }
  }

  // Parse maxPrice
  let maxPrice: number | undefined;
  const maxPriceStr = queryParams['maxPrice'];
  if (maxPriceStr) {
    const parsed = parseFloat(maxPriceStr);
    if (!isNaN(parsed) && parsed >= 0) {
      maxPrice = parsed;
    }
  }

  // Collect dynamic attribute filters (any query param not in reserved set)
  const attributeFilters: Record<string, string> = {};
  for (const [key, value] of Object.entries(queryParams)) {
    if (!RESERVED_QUERY_PARAMS.has(key) && value) {
      attributeFilters[key] = value;
    }
  }

  const result: {
    limit: number;
    cursor?: string;
    minPrice?: number;
    maxPrice?: number;
    attributeFilters: Record<string, string>;
  } = {
    limit,
    attributeFilters,
  };

  if (cursor) {
    result.cursor = cursor;
  }
  if (minPrice !== undefined) {
    result.minPrice = minPrice;
  }
  if (maxPrice !== undefined) {
    result.maxPrice = maxPrice;
  }

  return result;
}

/**
 * GET /catalogue/categories/{subcategoryId}/products — returns paginated
 * products for a subcategory with dynamic attribute filtering.
 *
 * Query parameters:
 * - limit: page size (1-50, default 20)
 * - cursor: pagination cursor (base64-encoded)
 * - minPrice: minimum price filter (inclusive)
 * - maxPrice: maximum price filter (inclusive)
 * - {attributeFieldName}: dynamic filter by attribute value
 *
 * Returns 400 INVALID_FILTER if a non-filterable attribute is used as a filter.
 * Returns 400 INVALID_CURSOR if the cursor cannot be decoded.
 * Returns 404 SUBCATEGORY_NOT_FOUND if the subcategory schema doesn't exist.
 * Returns 503 SERVICE_UNAVAILABLE on DynamoDB errors.
 *
 * Requirements: 5.3, 5.4, 6.1, 6.5, 6.6, 6.7
 */
const rawListProductsBySubcategoryHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const subcategoryId = extractSubcategoryId(event);
  const { limit, cursor, minPrice, maxPrice, attributeFilters } = extractBrowseParams(event);

  // Fetch the attribute schema to determine filterable attributes
  let schema;
  try {
    schema = await getAttributeSchema(subcategoryId);
  } catch (error) {
    // If schema not found, the subcategory doesn't exist
    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 404
    ) {
      throw createError(404, `Subcategory '${subcategoryId}' not found`, {
        expose: true,
        code: 'SUBCATEGORY_NOT_FOUND',
      });
    }
    throw error;
  }

  // Get filterable attributes from the schema
  const filterableAttributes = schema.attributes.filter((attr) => attr.filterable);
  const filterableFieldNames = new Set(filterableAttributes.map((attr) => attr.fieldName));

  // Validate that all dynamic filter params are actually filterable
  const invalidFilters: string[] = [];
  for (const key of Object.keys(attributeFilters)) {
    if (!filterableFieldNames.has(key)) {
      invalidFilters.push(key);
    }
  }

  if (invalidFilters.length > 0) {
    throw createError(400, `Filter '${invalidFilters[0]}' is not a valid filterable attribute`, {
      expose: true,
      code: 'INVALID_FILTER',
    });
  }

  // Validate cursor format if provided
  if (cursor) {
    try {
      JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
      throw createError(400, 'Invalid pagination cursor', {
        expose: true,
        code: 'INVALID_CURSOR',
      });
    }
  }

  // Build browse options
  const options: BrowseOptions = {
    limit,
  };

  if (cursor) {
    options.cursor = cursor;
  }
  if (minPrice !== undefined) {
    options.minPrice = minPrice;
  }
  if (maxPrice !== undefined) {
    options.maxPrice = maxPrice;
  }
  if (Object.keys(attributeFilters).length > 0) {
    options.attributeFilters = attributeFilters;
  }

  // Call the product browse module
  const result = await listProductsBySubcategory(subcategoryId, options, filterableAttributes);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  };
};

export const listProductsBySubcategoryHandler = middy(rawListProductsBySubcategoryHandler)
  .use(catalogueLatencyMetrics())
  .use(structuredLogger({ service: 'catalogue-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

/**
 * Main Lambda entry point — routes requests to the appropriate handler
 * based on HTTP method and API Gateway resource path.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource } = event;
  const route = `${httpMethod} ${resource}`;

  let response: APIGatewayProxyResult;

  switch (route) {
    case 'GET /catalogue/categories':
      response = (await listCategoryTreeHandler(event, context)) as APIGatewayProxyResult;
      break;
    case 'GET /catalogue/categories/{categoryId}':
      response = (await listProductsByCategoryHandler(event, context)) as APIGatewayProxyResult;
      break;
    case 'GET /catalogue/categories/{categoryId}/subcategories':
      response = (await listSubcategoriesHandler(event, context)) as APIGatewayProxyResult;
      break;
    case 'GET /catalogue/categories/{categoryId}/schema':
      response = (await getAttributeSchemaHandler(event, context)) as APIGatewayProxyResult;
      break;
    case 'GET /catalogue/categories/{categoryId}/products':
      response = (await listProductsBySubcategoryHandler(event, context)) as APIGatewayProxyResult;
      break;
    case 'GET /catalogue/search':
      response = (await searchProductsHandler(event, context)) as APIGatewayProxyResult;
      break;
    case 'GET /catalogue/products/{productId}':
      response = (await getProductDetailHandler(event, context)) as APIGatewayProxyResult;
      break;
    default:
      response = {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusCode: 404, error: 'NOT_FOUND', message: 'Route not found' }),
      };
  }

  // Add CORS headers to every response
  response.headers = { ...response.headers, ...CORS_HEADERS };
  return response;
};
