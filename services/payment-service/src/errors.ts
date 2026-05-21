import createError from 'http-errors';

/**
 * Error codes used across the payment service.
 */
export const PAYMENT_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Creates a 400 VALIDATION_ERROR for unsupported payment methods or invalid input.
 * Requirement 11.3
 */
export function createValidationError(message: string, fields?: Record<string, string>): never {
  const error = createError(400, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = PAYMENT_ERROR_CODES.VALIDATION_ERROR;
  if (fields) {
    (error as unknown as Record<string, unknown>)['fields'] = fields;
  }
  throw error;
}

/**
 * Creates a 500 INTERNAL_ERROR for unexpected processing failures.
 * Requirement 11.4
 */
export function createInternalError(
  message: string = 'An internal error occurred during payment processing',
): never {
  const error = createError(500, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = PAYMENT_ERROR_CODES.INTERNAL_ERROR;
  throw error;
}

/**
 * Creates a 503 SERVICE_UNAVAILABLE error for DynamoDB or AWS service failures.
 */
export function createServiceUnavailableError(): never {
  const error = createError(503, 'Service temporarily unavailable. Please try again later.', {
    expose: true,
  });
  (error as unknown as Record<string, unknown>)['code'] = PAYMENT_ERROR_CODES.SERVICE_UNAVAILABLE;
  throw error;
}
