import { structuredLogger } from '@blipzo/shared';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { emitOrderPlacementSuccess } from './metrics.js';
import {
  cancelOrder,
  checkout,
  createReturnExchangeRequest,
  getOrderDetail,
  getOrderHistory,
  getReturnExchangeRequestDetail,
} from './service.js';
import {
  extractBuyerId,
  extractOrderHistoryParams,
  extractOrderId,
  extractRequestId,
  validateCheckoutInput,
  validateReturnExchangeInput,
} from './validators.js';

/**
 * POST /orders/checkout — places an order for the buyer's cart items.
 *
 * Flow:
 * 1. Validate CheckoutRequest (addressId, paymentMethod)
 * 2. Query cart items
 * 3. Batch-get product stock — if any item has quantity > stockQuantity return 400 INSUFFICIENT_STOCK
 * 4. Invoke Payment Lambda via AWS SDK
 * 5. TransactWriteItems to atomically create OrderRecord + decrement all stock quantities
 * 6. Clear buyer cart via BatchWriteItem
 * 7. Return 201 with OrderRecord
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
const rawCheckoutHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const input = validateCheckoutInput(event);
  const orderRecord = await checkout(buyerId, input);

  // Requirement 16.4: Emit OrderPlacementSuccess metric on successful checkout
  await emitOrderPlacementSuccess();

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderRecord),
  };
};

export const checkoutHandler = middy(rawCheckoutHandler)
  .use(httpJsonBodyParser())
  .use(structuredLogger({ service: 'order-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /orders — returns paginated order history for the authenticated buyer.
 *
 * Query params:
 * - limit: 1–100, default 20
 * - cursor: base64-encoded pagination cursor
 *
 * Returns paginated OrderRecord summaries sorted by order timestamp descending.
 *
 * Requirements: 12.1
 */
const rawOrderHistoryHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const { limit, cursor } = extractOrderHistoryParams(event);
  const response = await getOrderHistory(buyerId, limit, cursor);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  };
};

export const orderHistoryHandler = middy(rawOrderHistoryHandler)
  .use(structuredLogger({ service: 'order-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /orders/{orderId} — returns full order detail for the authenticated buyer.
 *
 * Asserts buyerId === requestingUserId, else returns 404 without revealing order existence.
 *
 * Requirements: 12.2, 12.3
 */
const rawOrderDetailHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const orderId = extractOrderId(event);
  const orderRecord = await getOrderDetail(orderId, buyerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderRecord),
  };
};

export const orderDetailHandler = middy(rawOrderDetailHandler)
  .use(structuredLogger({ service: 'order-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * POST /orders/{orderId}/cancel — cancels an eligible order.
 *
 * Flow:
 * 1. Assert ownership (buyerId matches JWT claim)
 * 2. Check orderStatus is 'Confirmed' or 'Processing' (else 400 INVALID_STATUS)
 * 3. Update orderStatus to 'Cancelled'
 * 4. For non-CoD orders, invoke Payment Lambda for mock refund
 * 5. If refund succeeds, set refundStatus = 'Completed'
 * 6. If refund fails, set refundStatus = 'Pending' (do NOT roll back cancellation)
 * 7. Return updated OrderRecord
 *
 * Requirements: 12.4, 12.5, 12.6
 */
const rawCancelOrderHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const orderId = extractOrderId(event);
  const updatedOrder = await cancelOrder(orderId, buyerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedOrder),
  };
};

export const cancelOrderHandler = middy(rawCancelOrderHandler)
  .use(structuredLogger({ service: 'order-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * POST /orders/{orderId}/return-exchange — submits a return/exchange request for a delivered order.
 *
 * Flow:
 * 1. Assert ownership (buyerId matches JWT claim)
 * 2. Assert orderStatus is 'Delivered' (else 400)
 * 3. Read sellerPolicy from product record
 * 4. Check returnWindowDays > 0 and request is within window (else 400)
 * 5. Create ReturnExchangeRequest record with policyVersionAtRequest snapshot
 * 6. Return 201 with requestId
 *
 * Requirements: 13.1, 13.2, 13.3, 13.5, 14.3, 14.4
 */
const rawReturnExchangeHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const orderId = extractOrderId(event);
  const input = validateReturnExchangeInput(event);
  const returnExchangeRequest = await createReturnExchangeRequest(orderId, buyerId, input);

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(returnExchangeRequest),
  };
};

export const returnExchangeHandler = middy(rawReturnExchangeHandler)
  .use(httpJsonBodyParser())
  .use(structuredLogger({ service: 'order-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * GET /orders/return-exchange/{requestId} — retrieves a return/exchange request status.
 *
 * Asserts buyerId === requestingUserId, else returns 404 without revealing request existence.
 *
 * Requirements: 13.4
 */
const rawGetReturnExchangeHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const buyerId = extractBuyerId(event);
  const requestId = extractRequestId(event);
  const returnExchangeRequest = await getReturnExchangeRequestDetail(requestId, buyerId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(returnExchangeRequest),
  };
};

export const getReturnExchangeHandler = middy(rawGetReturnExchangeHandler)
  .use(structuredLogger({ service: 'order-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );
