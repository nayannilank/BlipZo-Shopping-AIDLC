import { createProductSchema } from '@blipzo/shared';
import type { CreateProductRequest } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import createError from 'http-errors';

/**
 * Extracts the seller ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 */
export function extractSellerId(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.['claims'] as Record<string, string> | undefined;

  const sellerId =
    claims?.['sub'] ?? (event.requestContext.authorizer?.['sub'] as string | undefined);

  if (!sellerId) {
    throw createError(401, 'Unauthorized: missing user identity');
  }

  return sellerId;
}

/**
 * Extracts the user role from the API Gateway event's request context.
 */
export function extractUserRole(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.['claims'] as Record<string, string> | undefined;

  const role =
    claims?.['custom:role'] ??
    (event.requestContext.authorizer?.['custom:role'] as string | undefined);

  return role ?? '';
}

/**
 * Validates the create product request body against the shared createProductSchema.
 * Returns a typed CreateProductRequest on success, throws a 400 error on validation failure.
 *
 * Requirement 5.1, 5.2
 */
export function validateCreateProductInput(event: APIGatewayProxyEvent): CreateProductRequest {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = createProductSchema.safeParse(body);

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
