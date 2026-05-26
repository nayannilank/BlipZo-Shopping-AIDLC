import createError from 'http-errors';

/**
 * Error codes used across the product service.
 */
export const PRODUCT_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  S3_UPLOAD_FAILED: 'S3_UPLOAD_FAILED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CATEGORY_IMMUTABLE: 'CATEGORY_IMMUTABLE',
} as const;

/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 * Requirement 5.2
 */
export function createValidationError(fields: Record<string, string>): never {
  const error = createError(400, 'Validation failed');
  (error as unknown as Record<string, unknown>)['code'] = PRODUCT_ERROR_CODES.VALIDATION_ERROR;
  (error as unknown as Record<string, unknown>)['fields'] = fields;
  throw error;
}

/**
 * Creates a 404 NOT_FOUND error.
 */
export function createNotFoundError(message: string): never {
  const error = createError(404, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = PRODUCT_ERROR_CODES.NOT_FOUND;
  throw error;
}

/**
 * Creates a 403 FORBIDDEN error.
 * Requirement 5.4, 5.6
 */
export function createForbiddenError(): never {
  const error = createError(403, 'You do not have permission to perform this action', {
    expose: true,
  });
  (error as unknown as Record<string, unknown>)['code'] = PRODUCT_ERROR_CODES.FORBIDDEN;
  throw error;
}

/**
 * Creates a 503 S3_UPLOAD_FAILED error.
 * Requirement 5.8: If any S3 upload fails, return error and do not persist product.
 */
export function createS3UploadFailedError(): never {
  const error = createError(503, 'Image upload failed. Please try again later.', {
    expose: true,
  });
  (error as unknown as Record<string, unknown>)['code'] = PRODUCT_ERROR_CODES.S3_UPLOAD_FAILED;
  throw error;
}

/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export function createServiceUnavailableError(): never {
  const error = createError(503, 'Service temporarily unavailable. Please try again later.', {
    expose: true,
  });
  (error as unknown as Record<string, unknown>)['code'] = PRODUCT_ERROR_CODES.SERVICE_UNAVAILABLE;
  throw error;
}

/**
 * Creates a 400 CATEGORY_IMMUTABLE error when a seller attempts to change
 * the categoryId or subcategoryId of an existing product.
 *
 * Requirements: 8.3
 */
export function createCategoryImmutableError(): never {
  const error = createError(400, 'Category and subcategory cannot be changed after creation', {
    expose: true,
  });
  (error as unknown as Record<string, unknown>)['code'] = PRODUCT_ERROR_CODES.CATEGORY_IMMUTABLE;
  throw error;
}
