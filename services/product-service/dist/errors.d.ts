/**
 * Error codes used across the product service.
 */
export declare const PRODUCT_ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly S3_UPLOAD_FAILED: "S3_UPLOAD_FAILED";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 * Requirement 5.2
 */
export declare function createValidationError(fields: Record<string, string>): never;
/**
 * Creates a 404 NOT_FOUND error.
 */
export declare function createNotFoundError(message: string): never;
/**
 * Creates a 403 FORBIDDEN error.
 * Requirement 5.4, 5.6
 */
export declare function createForbiddenError(): never;
/**
 * Creates a 503 S3_UPLOAD_FAILED error.
 * Requirement 5.8: If any S3 upload fails, return error and do not persist product.
 */
export declare function createS3UploadFailedError(): never;
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export declare function createServiceUnavailableError(): never;
//# sourceMappingURL=errors.d.ts.map