/**
 * Error codes used across the cart service.
 */
export declare const CART_ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 */
export declare function createValidationError(fields: Record<string, string>): never;
/**
 * Creates a 401 UNAUTHORIZED error.
 * Requirement 8.7
 */
export declare function createUnauthorizedError(message?: string): never;
/**
 * Creates a 404 NOT_FOUND error.
 * Requirement 8.8
 */
export declare function createNotFoundError(message: string): never;
/**
 * Creates a 400 INSUFFICIENT_STOCK error when quantity exceeds available stock.
 * Requirement 8.4
 */
export declare function createInsufficientStockError(productId: string, available: number): never;
/**
 * Creates a 503 SERVICE_UNAVAILABLE error for general AWS service failures.
 */
export declare function createServiceUnavailableError(): never;
//# sourceMappingURL=errors.d.ts.map