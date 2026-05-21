import createError from 'http-errors';
/**
 * Error codes used across the cart service.
 */
export const CART_ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 */
export function createValidationError(fields) {
    const error = createError(400, 'Validation failed');
    error['code'] = CART_ERROR_CODES.VALIDATION_ERROR;
    error['fields'] = fields;
    throw error;
}
/**
 * Creates a 401 UNAUTHORIZED error.
 * Requirement 8.7
 */
export function createUnauthorizedError(message = 'Unauthorized') {
    const error = createError(401, message, { expose: true });
    error['code'] = CART_ERROR_CODES.UNAUTHORIZED;
    throw error;
}
/**
 * Creates a 404 NOT_FOUND error.
 * Requirement 8.8
 */
export function createNotFoundError(message) {
    const error = createError(404, message, { expose: true });
    error['code'] = CART_ERROR_CODES.NOT_FOUND;
    throw error;
}
/**
 * Creates a 400 INSUFFICIENT_STOCK error when quantity exceeds available stock.
 * Requirement 8.4
 */
export function createInsufficientStockError(productId, available) {
    const error = createError(400, `Insufficient stock for product '${productId}'. Available: ${String(available)}`, { expose: true });
    error['code'] = CART_ERROR_CODES.INSUFFICIENT_STOCK;
    throw error;
}
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export function createServiceUnavailableError() {
    const error = createError(503, 'Service temporarily unavailable. Please try again later.', {
        expose: true,
    });
    error['code'] = CART_ERROR_CODES.SERVICE_UNAVAILABLE;
    throw error;
}
//# sourceMappingURL=errors.js.map