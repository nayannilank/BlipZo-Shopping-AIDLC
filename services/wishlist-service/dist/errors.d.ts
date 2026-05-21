/**
 * Error codes used across the wishlist service.
 */
export declare const WISHLIST_ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly CAPACITY_EXCEEDED: "CAPACITY_EXCEEDED";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 */
export declare function createValidationError(fields: Record<string, string>): never;
/**
 * Creates a 401 UNAUTHORIZED error.
 * Requirement 7.9
 */
export declare function createUnauthorizedError(message?: string): never;
/**
 * Creates a 404 NOT_FOUND error.
 * Requirement 7.4
 */
export declare function createNotFoundError(message: string): never;
/**
 * Creates a 400 CAPACITY_EXCEEDED error when wishlist is full.
 * Requirement 7.1
 */
export declare function createCapacityExceededError(): never;
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export declare function createServiceUnavailableError(): never;
//# sourceMappingURL=errors.d.ts.map