import createError from 'http-errors';
/**
 * Error codes used across the wishlist service.
 */
export const WISHLIST_ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 */
export function createValidationError(fields) {
    const error = createError(400, 'Validation failed');
    error['code'] = WISHLIST_ERROR_CODES.VALIDATION_ERROR;
    error['fields'] = fields;
    throw error;
}
/**
 * Creates a 401 UNAUTHORIZED error.
 * Requirement 7.9
 */
export function createUnauthorizedError(message = 'Unauthorized') {
    const error = createError(401, message, { expose: true });
    error['code'] = WISHLIST_ERROR_CODES.UNAUTHORIZED;
    throw error;
}
/**
 * Creates a 404 NOT_FOUND error.
 * Requirement 7.4
 */
export function createNotFoundError(message) {
    const error = createError(404, message, { expose: true });
    error['code'] = WISHLIST_ERROR_CODES.NOT_FOUND;
    throw error;
}
/**
 * Creates a 400 CAPACITY_EXCEEDED error when wishlist is full.
 * Requirement 7.1
 */
export function createCapacityExceededError() {
    const error = createError(400, 'Wishlist capacity exceeded. Maximum 200 items allowed.', {
        expose: true,
    });
    error['code'] = WISHLIST_ERROR_CODES.CAPACITY_EXCEEDED;
    throw error;
}
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export function createServiceUnavailableError() {
    const error = createError(503, 'Service temporarily unavailable. Please try again later.', {
        expose: true,
    });
    error['code'] = WISHLIST_ERROR_CODES.SERVICE_UNAVAILABLE;
    throw error;
}
//# sourceMappingURL=errors.js.map