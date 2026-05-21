/**
 * Error codes used across the payment service.
 */
export declare const PAYMENT_ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
/**
 * Creates a 400 VALIDATION_ERROR for unsupported payment methods or invalid input.
 * Requirement 11.3
 */
export declare function createValidationError(message: string, fields?: Record<string, string>): never;
/**
 * Creates a 500 INTERNAL_ERROR for unexpected processing failures.
 * Requirement 11.4
 */
export declare function createInternalError(message?: string): never;
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for DynamoDB or AWS service failures.
 */
export declare function createServiceUnavailableError(): never;
//# sourceMappingURL=errors.d.ts.map