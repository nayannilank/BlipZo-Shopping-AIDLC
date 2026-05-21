import { addressSchema, updateAddressSchema } from '@blipzo/shared';
import type { AddressSchemaInput, UpdateAddressSchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import createError from 'http-errors';

/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
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
 * Validates the create address request body against the shared addressSchema.
 * Returns typed AddressSchemaInput on success, throws 400 on validation failure.
 *
 * Requirements: 9.1, 9.2
 */
export function validateCreateAddressInput(event: APIGatewayProxyEvent): AddressSchemaInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = addressSchema.safeParse(body);

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
 * Validates the update address request body against the shared updateAddressSchema.
 * Returns typed UpdateAddressSchemaInput on success, throws 400 on validation failure.
 *
 * Requirement 9.5
 */
export function validateUpdateAddressInput(event: APIGatewayProxyEvent): UpdateAddressSchemaInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = updateAddressSchema.safeParse(body);

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
 * Extracts the addressId from the path parameters.
 */
export function extractAddressIdFromPath(event: APIGatewayProxyEvent): string {
  const addressId = event.pathParameters?.['addressId'];

  if (!addressId) {
    throw createError(400, 'Address ID is required');
  }

  return addressId;
}
