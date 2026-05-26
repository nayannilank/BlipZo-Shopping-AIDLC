import { createProductSchema, updateProductSchema, sellerPolicySchema } from '@blipzo/shared';
import type {
  CreateProductRequest,
  UpdateProductSchemaInput,
  SellerPolicySchemaInput,
} from '@blipzo/shared';
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

  // Build CreateProductRequest, omitting undefined optional fields to satisfy
  // exactOptionalPropertyTypes constraint.
  const data = result.data;
  const request: CreateProductRequest = {
    name: data.name,
    description: data.description,
    price: data.price,
    stockQuantity: data.stockQuantity,
    images: data.images,
  };

  if (data.categories !== undefined) {
    request.categories = data.categories;
  }
  if (data.categoryId !== undefined) {
    request.categoryId = data.categoryId;
  }
  if (data.subcategoryId !== undefined) {
    request.subcategoryId = data.subcategoryId;
  }
  if (data.dynamicAttributes !== undefined) {
    request.dynamicAttributes = data.dynamicAttributes;
  }

  return request;
}

/**
 * Extracts the productId from the path parameters.
 * Throws 400 if not present.
 */
export function extractProductId(event: APIGatewayProxyEvent): string {
  const productId = event.pathParameters?.['productId'];

  if (!productId) {
    throw createError(400, 'Product ID is required');
  }

  return productId;
}

/**
 * Validates the update product request body against the shared updateProductSchema.
 * Returns a typed UpdateProductSchemaInput on success, throws a 400 error on validation failure.
 * Ensures at least one field is provided for update.
 *
 * Requirements: 5.5, 5.7
 */
export function validateUpdateProductInput(event: APIGatewayProxyEvent): UpdateProductSchemaInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = updateProductSchema.safeParse(body);

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

  // Ensure at least one field is provided
  const data = result.data;
  const hasAtLeastOneField =
    data.name !== undefined ||
    data.description !== undefined ||
    data.price !== undefined ||
    data.stockQuantity !== undefined ||
    data.categories !== undefined ||
    data.categoryId !== undefined ||
    data.subcategoryId !== undefined ||
    data.dynamicAttributes !== undefined ||
    data.images !== undefined;

  if (!hasAtLeastOneField) {
    throw createError(400, 'At least one field must be provided for update');
  }

  return data;
}

/**
 * Extracts pagination parameters from query string.
 */
export function extractPaginationParams(event: APIGatewayProxyEvent): {
  limit: number;
  cursor?: string;
} {
  const limitStr = event.queryStringParameters?.['limit'];
  const cursorParam = event.queryStringParameters?.['cursor'];

  let limit = 20;
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      limit = parsed;
    }
  }

  const result: { limit: number; cursor?: string } = { limit };
  if (cursorParam) {
    result.cursor = cursorParam;
  }

  return result;
}

/**
 * Validates the seller policy request body against the shared sellerPolicySchema.
 * Returns a typed SellerPolicySchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirements: 14.1
 */
export function validateSellerPolicyInput(event: APIGatewayProxyEvent): SellerPolicySchemaInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = sellerPolicySchema.safeParse(body);

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
