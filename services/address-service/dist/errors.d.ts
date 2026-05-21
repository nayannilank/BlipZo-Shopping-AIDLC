/**
 * Error codes used across the address service.
 */
export declare const ADDRESS_ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 * Requirement 9.2
 */
export declare function createValidationError(fields: Record<string, string>): never;
/**
 * Creates a 401 UNAUTHORIZED error.
 */
export declare function createUnauthorizedError(message?: string): never;
/**
 * Creates a 404 NOT_FOUND error.
 * Requirement 9.7
 */
export declare function createNotFoundError(message: string): never;
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export declare function createServiceUnavailableError(): never;
//# sourceMappingURL=errors.d.ts.map