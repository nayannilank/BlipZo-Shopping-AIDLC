import createError from 'http-errors';

/**
 * Error codes used across the order service.
 */
export const ORDER_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
} as const;

/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 * Requirement 10.1
 */
export function createValidationError(message: string, fields?: Record<string, string>): never {
  const error = createError(400, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ORDER_ERROR_CODES.VALIDATION_ERROR;
  if (fields) {
    (error as unknown as Record<string, unknown>)['fields'] = fields;
  }
  throw error;
}

/**
 * Creates a 400 INSUFFICIENT_STOCK error listing out-of-stock items.
 * Requirement 10.2
 */
export function createInsufficientStockError(
  outOfStockItems: Array<{ productId: string; requested: number; available: number }>,
): never {
  const error = createError(400, 'Insufficient stock for one or more items', { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ORDER_ERROR_CODES.INSUFFICIENT_STOCK;
  (error as unknown as Record<string, unknown>)['outOfStockItems'] = outOfStockItems;
  throw error;
}

/**
 * Creates a 402 PAYMENT_FAILED error.
 * Requirement 10.3: Payment failure returns 402 with no side effects.
 */
export function createPaymentFailedError(message: string = 'Payment processing failed'): never {
  const error = createError(402, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ORDER_ERROR_CODES.PAYMENT_FAILED;
  throw error;
}

/**
 * Creates a 503 SERVICE_UNAVAILABLE error.
 * Requirement 10.4: Payment Lambda unreachable returns 503.
 */
export function createServiceUnavailableError(
  message: string = 'Service temporarily unavailable. Please try again later.',
): never {
  const error = createError(503, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ORDER_ERROR_CODES.SERVICE_UNAVAILABLE;
  throw error;
}

/**
 * Creates a 401 UNAUTHORIZED error.
 */
export function createUnauthorizedError(message: string = 'Unauthorized'): never {
  const error = createError(401, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ORDER_ERROR_CODES.UNAUTHORIZED;
  throw error;
}

/**
 * Creates a 404 NOT_FOUND error.
 */
export function createNotFoundError(message: string): never {
  const error = createError(404, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ORDER_ERROR_CODES.NOT_FOUND;
  throw error;
}

/**
 * Creates a 400 INVALID_STATUS error for operations on orders in wrong state.
 */
export function createInvalidStatusError(message: string): never {
  const error = createError(400, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = ORDER_ERROR_CODES.INVALID_STATUS;
  throw error;
}

/**
 * Creates a 400 RETURN_WINDOW_EXPIRED error when return/exchange request is outside the window.
 * Requirements: 13.2, 14.3
 */
export function createReturnWindowError(message: string): never {
  const error = createError(400, message, { expose: true });
  (error as unknown as Record<string, unknown>)['code'] = 'RETURN_WINDOW_EXPIRED';
  throw error;
}
