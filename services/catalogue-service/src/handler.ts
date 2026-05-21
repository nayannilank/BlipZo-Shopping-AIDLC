import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

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

export const listCategoriesHandler = middy(rawListCategoriesHandler).use(
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

export const listProductsByCategoryHandler = middy(rawListProductsByCategoryHandler).use(
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

export const getProductDetailHandler = middy(rawGetProductDetailHandler).use(
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

export const searchProductsHandler = middy(rawSearchProductsHandler).use(
  httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
  }),
);
