import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import {
  createProduct,
  updateProduct,
  deleteProduct,
  listSellerProducts,
  setSellerPolicy,
} from './service.js';
import {
  validateCreateProductInput,
  validateUpdateProductInput,
  validateSellerPolicyInput,
  extractSellerId,
  extractProductId,
  extractPaginationParams,
} from './validators.js';

/**
 * POST /products — thin handler that delegates to service layer.
 * Validates input, extracts seller identity from JWT claims,
 * calls createProduct, returns 201 with full ProductRecord and upload URLs.
 *
 * Requirements: 5.1, 5.2, 5.8
 */
const rawCreateProductHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const sellerId = extractSellerId(event);
  const input = validateCreateProductInput(event);
  const result = await createProduct(input, sellerId);

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...result.product,
      uploadUrls: result.uploadUrls,
    }),
  };
};

export const createProductHandler = middy(rawCreateProductHandler)
  .use(httpJsonBodyParser())
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * PATCH /products/{productId} — thin handler for partial product update.
 * Reads product, asserts ownership, validates supplied fields,
 * applies partial update using UpdateExpression, returns updated ProductRecord.
 *
 * Requirements: 5.5, 5.6, 5.7
 */
const rawUpdateProductHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const sellerId = extractSellerId(event);
  const productId = extractProductId(event);
  const input = validateUpdateProductInput(event);
  const updatedProduct = await updateProduct(productId, input, sellerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedProduct),
  };
};

export const updateProductHandler = middy(rawUpdateProductHandler)
  .use(httpJsonBodyParser())
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * DELETE /products/{productId} — thin handler for soft-deleting a product.
 * Reads product, asserts ownership, sets isDeleted = true, returns 200.
 *
 * Requirements: 5.3, 5.4
 */
const rawDeleteProductHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const sellerId = extractSellerId(event);
  const productId = extractProductId(event);
  await deleteProduct(productId, sellerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Product deleted successfully' }),
  };
};

export const deleteProductHandler = middy(rawDeleteProductHandler)
  .use(httpJsonBodyParser())
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /products/seller/me — thin handler for listing the seller's own products.
 * Queries GSI2 with SELLER#{sellerId}, returns paginated list.
 *
 * Requirements: 5.3
 */
const rawListSellerProductsHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const sellerId = extractSellerId(event);
  const { limit, cursor } = extractPaginationParams(event);
  const result = await listSellerProducts(sellerId, limit, cursor);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: result.items,
      nextCursor: result.nextCursor,
      count: result.items.length,
    }),
  };
};

export const listSellerProductsHandler = middy(rawListSellerProductsHandler).use(
  httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
  }),
);

/**
 * POST /products/{productId}/policy — thin handler for setting/updating seller policy.
 * Asserts product ownership, validates sellerPolicySchema, writes sellerPolicy map
 * onto the product DynamoDB item with a new policyVersion UUID and createdAt timestamp.
 * Returns 200 with updated ProductRecord including sellerPolicy.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
const rawSetSellerPolicyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const sellerId = extractSellerId(event);
  const productId = extractProductId(event);
  const input = validateSellerPolicyInput(event);
  const updatedProduct = await setSellerPolicy(productId, input, sellerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedProduct),
  };
};

export const setSellerPolicyHandler = middy(rawSetSellerPolicyHandler)
  .use(httpJsonBodyParser())
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );
