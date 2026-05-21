import createError from 'http-errors';

/**
 * Error codes used across the catalogue service.
 */
export const CATALOGUE_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 */
export function createValidationError(fields: Record<string, string>): never {
  const error = createError(400, 'Validation failed');
  (error as unknown as Record<string, unknown>)['code'] = CATALOGUE_ERROR_CODES.VALIDATION_ERROR;
  (error as unknown as Record<string, unknown>)['fields'] = fields;
  throw error;
}

/**
 * Creates a 404 NOT_FOUND error.
 * Requirements: 6.3, 6.4
 */
export function createNotFoundError(message: string): never {
  const error = createError(404, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = CATALOGUE_ERROR_CODES.NOT_FOUND;
  throw error;
}

/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export function createServiceUnavailableError(): never {
  const error = createError(503, 'Service temporarily unavailable. Please try again later.', {
    expose: true,
  });
  (error as unknown as Record<string, unknown>)['code'] = CATALOGUE_ERROR_CODES.SERVICE_UNAVAILABLE;
  throw error;
}
