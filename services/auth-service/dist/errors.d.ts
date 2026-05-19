/**
 * Error codes used across the auth service.
 */
export declare const AUTH_ERROR_CODES: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
    readonly CONFLICT: "CONFLICT";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly OTP_EXPIRED: "OTP_EXPIRED";
    readonly OTP_INVALID: "OTP_INVALID";
    readonly OTP_MAX_ATTEMPTS: "OTP_MAX_ATTEMPTS";
    readonly PHONE_NOT_FOUND: "PHONE_NOT_FOUND";
    readonly OTP_DELIVERY_FAILED: "OTP_DELIVERY_FAILED";
};
/**
 * Maps Cognito exceptions to appropriate HTTP error responses.
 * Never exposes internal infrastructure details in error messages.
 */
export declare function mapCognitoError(error: unknown): never;
/**
 * Creates a 401 INVALID_CREDENTIALS error.
 * Generic message that does not reveal which credential is incorrect.
 * Requirement 2.2
 */
export declare function createInvalidCredentialsError(): never;
/**
 * Creates a 423 ACCOUNT_LOCKED error.
 * Requirement 2.3, 2.4
 */
export declare function createAccountLockedError(): never;
/**
 * Creates a 400 OTP_EXPIRED error.
 * Requirement 3.4
 */
export declare function createOtpExpiredError(): never;
/**
 * Creates a 400 OTP_INVALID error.
 * Requirement 3.3
 */
export declare function createOtpInvalidError(): never;
/**
 * Creates a 400 OTP_MAX_ATTEMPTS error.
 * Requirement 3.3
 */
export declare function createOtpMaxAttemptsError(): never;
/**
 * Creates a 404 PHONE_NOT_FOUND error.
 * Requirement 3.5
 */
export declare function createPhoneNotFoundError(): never;
/**
 * Creates a 500 OTP_DELIVERY_FAILED error.
 * Requirement 3.6 — does not expose internal details.
 */
export declare function createOtpDeliveryFailedError(): never;
//# sourceMappingURL=errors.d.ts.map