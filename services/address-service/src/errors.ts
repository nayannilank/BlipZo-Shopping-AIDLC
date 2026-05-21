import createError from 'http-errors';

/**
 * Error codes used across the address service.
 */
export const ADDRESS_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 * Requirement 9.2
 */
export function createValidationError(fields: Record<string, string>): never {
  const error = createError(400, 'Validation failed');
  (error as unknown as Record<string, unknown>)['code'] = ADDRESS_ERROR_CODES.VALIDATION_ERROR;
  (error as unknown as Record<string, unknown>)['fields'] = fields;
  throw error;
}

/**
 * Creates a 401 UNAUTHORIZED error.
 */
export function createUnauthorizedError(message: string = 'Unauthorized'): never {
  const error = createError(401, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ADDRESS_ERROR_CODES.UNAUTHORIZED;
  throw error;
}

/**
 * Creates a 404 NOT_FOUND error.
 * Requirement 9.7
 */
export function createNotFoundError(message: string): never {
  const error = createError(404, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ADDRESS_ERROR_CODES.NOT_FOUND;
  throw error;
}

/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export function createServiceUnavailableError(): never {
  const error = createError(503, 'Service temporarily unavailable. Please try again later.', {
    expose: true,
  });
  (error as unknown as Record<string, unknown>)['code'] = ADDRESS_ERROR_CODES.SERVICE_UNAVAILABLE;
  throw error;
}
