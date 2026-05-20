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
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 * Requirement 5.2
 */
export function createValidationError(fields) {
    const error = createError(400, 'Validation failed');
    error['code'] = PRODUCT_ERROR_CODES.VALIDATION_ERROR;
    error['fields'] = fields;
    throw error;
}
/**
 * Creates a 404 NOT_FOUND error.
 */
export function createNotFoundError(message) {
    const error = createError(404, message, { expose: true });
    error['code'] = PRODUCT_ERROR_CODES.NOT_FOUND;
    throw error;
}
/**
 * Creates a 403 FORBIDDEN error.
 * Requirement 5.4, 5.6
 */
export function createForbiddenError() {
    const error = createError(403, 'You do not have permission to perform this action', {
        expose: true,
    });
    error['code'] = PRODUCT_ERROR_CODES.FORBIDDEN;
    throw error;
}
/**
 * Creates a 503 S3_UPLOAD_FAILED error.
 * Requirement 5.8: If any S3 upload fails, return error and do not persist product.
 */
export function createS3UploadFailedError() {
    const error = createError(503, 'Image upload failed. Please try again later.', {
        expose: true,
    });
    error['code'] = PRODUCT_ERROR_CODES.S3_UPLOAD_FAILED;
    throw error;
}
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export function createServiceUnavailableError() {
    const error = createError(503, 'Service temporarily unavailable. Please try again later.', {
        expose: true,
    });
    error['code'] = PRODUCT_ERROR_CODES.SERVICE_UNAVAILABLE;
    throw error;
}
//# sourceMappingURL=errors.js.map