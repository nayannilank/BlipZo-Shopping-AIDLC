import { structuredLogger } from '@blipzo/shared';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { getCart, putCartItem, removeCartItem, clearCart } from './service.js';
import { extractBuyerId, validateCartItemInput, extractProductIdFromPath } from './validators.js';

/**
 * GET /cart — returns the buyer's cart with enriched product data, subtotals, and total.
 * Queries carts table with PK = BUYER#{buyerId}, batch-gets product details,
 * computes subtotal = round(price * quantity, 2) per item and total = round(sum(subtotals), 2).
 *
 * Requirements: 8.5, 8.7
 */
const rawGetCartHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const cart = await getCart(buyerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cart),
  };
};

export const getCartHandler = middy(rawGetCartHandler)
  .use(structuredLogger({ service: 'cart-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * PUT /cart/items — adds or updates a cart item.
 * Validates quantity (0–999); if quantity = 0 calls DeleteItem;
 * else verifies product exists and quantity ≤ stockQuantity (else 400 INSUFFICIENT_STOCK),
 * PutItem replacing existing entry.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8
 */
const rawPutCartItemHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const { productId, quantity } = validateCartItemInput(event);
  const cart = await putCartItem(buyerId, productId, quantity);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cart),
  };
};

export const putCartItemHandler = middy(rawPutCartItemHandler)
  .use(httpJsonBodyParser())
  .use(structuredLogger({ service: 'cart-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * DELETE /cart/items/{productId} — removes a single item from the cart.
 * DeleteItem, returns updated cart.
 *
 * Requirements: 8.3, 8.7
 */
const rawRemoveCartItemHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const productId = extractProductIdFromPath(event);
  const cart = await removeCartItem(buyerId, productId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cart),
  };
};

export const removeCartItemHandler = middy(rawRemoveCartItemHandler)
  .use(structuredLogger({ service: 'cart-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * DELETE /cart — clears the entire cart for the buyer.
 * BatchWriteItem to delete all items, returns empty cart.
 *
 * Requirements: 8.6, 8.7
 */
const rawClearCartHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const cart = await clearCart(buyerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cart),
  };
};

export const clearCartHandler = middy(rawClearCartHandler)
  .use(structuredLogger({ service: 'cart-service' }))
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
    case 'GET /cart':
      return getCartHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'DELETE /cart':
      return clearCartHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'PUT /cart/items':
      return putCartItemHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'DELETE /cart/items/{productId}':
      return removeCartItemHandler(event, context) as Promise<APIGatewayProxyResult>;
    default:
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
      };
  }
};
