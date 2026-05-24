import { structuredLogger } from '@blipzo/shared';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { catalogueLatencyMetrics } from './metrics.js';
import {
  listCategories,
  listProductsByCategory,
  getProductDetail,
  searchProducts,
} from './service.js';
import {
  extractCategoryId,
  extractProductId,
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
 * returns CatalogueListResponse.
 *
 * Returns 200 with empty list when no products match.
 *
 * Requirements: 6.6, 6.7
 */
const rawSearchProductsHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { query, limit, cursor } = extractSearchParams(event);

  const result = await searchProducts(query, limit, cursor);

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
 * Main Lambda entry point — routes requests to the appropriate handler
 * based on HTTP method and API Gateway resource path.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource } = event;
  const route = `${httpMethod} ${resource}`;

  switch (route) {
    case 'GET /catalogue/categories':
      return listCategoriesHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'GET /catalogue/categories/{categoryId}':
      return listProductsByCategoryHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'GET /catalogue/search':
      return searchProductsHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'GET /catalogue/products/{productId}':
      return getProductDetailHandler(event, context) as Promise<APIGatewayProxyResult>;
    default:
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
      };
  }
};
