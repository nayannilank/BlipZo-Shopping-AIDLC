/**
 * Error codes used across the order service.
 */
export declare const ORDER_ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly INVALID_STATUS: "INVALID_STATUS";
};
/**
 * Creates a 400 VALIDATION_ERROR with field-level details.
 * Requirement 10.1
 */
export declare function createValidationError(message: string, fields?: Record<string, string>): never;
/**
 * Creates a 400 INSUFFICIENT_STOCK error listing out-of-stock items.
 * Requirement 10.2
 */
export declare function createInsufficientStockError(outOfStockItems: Array<{
    productId: string;
    requested: number;
    available: number;
}>): never;
/**
 * Creates a 402 PAYMENT_FAILED error.
 * Requirement 10.3: Payment failure returns 402 with no side effects.
 */
export declare function createPaymentFailedError(message?: string): never;
/**
 * Creates a 503 SERVICE_UNAVAILABLE error.
 * Requirement 10.4: Payment Lambda unreachable returns 503.
 */
export declare function createServiceUnavailableError(message?: string): never;
/**
 * Creates a 401 UNAUTHORIZED error.
 */
export declare function createUnauthorizedError(message?: string): never;
/**
 * Creates a 404 NOT_FOUND error.
 */
export declare function createNotFoundError(message: string): never;
/**
 * Creates a 400 INVALID_STATUS error for operations on orders in wrong state.
 */
export declare function createInvalidStatusError(message: string): never;
/**
 * Creates a 400 RETURN_WINDOW_EXPIRED error when return/exchange request is outside the window.
 * Requirements: 13.2, 14.3
 */
export declare function createReturnWindowError(message: string): never;
//# sourceMappingURL=errors.d.ts.map