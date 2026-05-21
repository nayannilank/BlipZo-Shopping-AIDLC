import { checkoutSchema, returnExchangeRequestSchema } from '@blipzo/shared';
import type { CheckoutSchemaInput, ReturnExchangeRequestSchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import createError from 'http-errors';

/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 *
 * Requirement 10.1: Only authenticated Buyers can checkout.
 */
export function extractBuyerId(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.['claims'] as Record<string, string> | undefined;

  const buyerId =
    claims?.['sub'] ?? (event.requestContext.authorizer?.['sub'] as string | undefined);

  if (!buyerId) {
    throw createError(401, 'Unauthorized: missing user identity');
  }

  return buyerId;
}

/**
 * Validates the checkout request body against the shared checkoutSchema.
 * Returns a typed CheckoutSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirement 10.1
 */
export function validateCheckoutInput(event: APIGatewayProxyEvent): CheckoutSchemaInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = checkoutSchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        fields[path] = issue.message;
      }
    }

    const error = createError(400, 'Validation failed');
    (error as unknown as Record<string, unknown>)['fields'] = fields;
    throw error;
  }

  return result.data;
}

/**
 * Parsed query parameters for order history pagination.
 */
export interface OrderHistoryParams {
  limit: number;
  cursor?: string;
}

/**
 * Extracts and validates pagination query parameters for order history.
 * - `limit`: integer between 1 and 100, defaults to 20
 * - `cursor`: optional base64-encoded pagination cursor
 *
 * Requirement 12.1
 */
export function extractOrderHistoryParams(event: APIGatewayProxyEvent): OrderHistoryParams {
  const queryParams = event.queryStringParameters ?? {};

  let limit = 20;
  const limitParam = queryParams['limit'];

  if (limitParam !== undefined) {
    const parsed = Number(limitParam);
    if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      throw createError(400, 'limit must be an integer between 1 and 100');
    }
    limit = Math.max(1, Math.min(100, parsed));
  }

  const cursor = queryParams['cursor'] ?? undefined;

  if (cursor) {
    return { limit, cursor };
  }

  return { limit };
}

/**
 * Extracts the orderId path parameter from the API Gateway event.
 * Throws 400 if the orderId is missing.
 *
 * Requirement 12.2
 */
export function extractOrderId(event: APIGatewayProxyEvent): string {
  const orderId = event.pathParameters?.['orderId'];

  if (!orderId) {
    throw createError(400, 'Order ID is required');
  }

  return orderId;
}

/**
 * Validates the return/exchange request body against the shared returnExchangeRequestSchema.
 * Returns a typed ReturnExchangeRequestSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirement 13.1
 */
export function validateReturnExchangeInput(
  event: APIGatewayProxyEvent,
): ReturnExchangeRequestSchemaInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = returnExchangeRequestSchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        fields[path] = issue.message;
      }
    }

    const error = createError(400, 'Validation failed');
    (error as unknown as Record<string, unknown>)['fields'] = fields;
    throw error;
  }

  return result.data;
}

/**
 * Extracts the requestId path parameter from the API Gateway event.
 * Throws 400 if the requestId is missing.
 *
 * Requirement 13.4
 */
export function extractRequestId(event: APIGatewayProxyEvent): string {
  const requestId = event.pathParameters?.['requestId'];

  if (!requestId) {
    throw createError(400, 'Request ID is required');
  }

  return requestId;
}
