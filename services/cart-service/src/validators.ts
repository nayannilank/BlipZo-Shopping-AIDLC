import { cartItemSchema, removeFromCartSchema } from '@blipzo/shared';
import type { CartItemSchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import createError from 'http-errors';

/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 *
 * Requirement 8.7: Unauthenticated requests return 401.
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
 * Validates the cart item request body against the shared cartItemSchema.
 * Returns a typed CartItemSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirements: 8.1, 8.3
 */
export function validateCartItemInput(event: APIGatewayProxyEvent): CartItemSchemaInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = cartItemSchema.safeParse(body);

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
 * Extracts the productId from the path parameters for DELETE requests.
 * Validates against removeFromCartSchema.
 *
 * Requirement 8.3
 */
export function extractProductIdFromPath(event: APIGatewayProxyEvent): string {
  const productId = event.pathParameters?.['productId'];

  if (!productId) {
    throw createError(400, 'Product ID is required');
  }

  const result = removeFromCartSchema.safeParse({ productId });

  if (!result.success) {
    throw createError(400, 'Invalid product ID');
  }

  return result.data.productId;
}
