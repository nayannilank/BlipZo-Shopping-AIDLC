import createError from 'http-errors';
/**
 * Error codes used across the auth service.
 */
export const AUTH_ERROR_CODES = {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    CONFLICT: 'CONFLICT',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_INVALID: 'OTP_INVALID',
    OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
    PHONE_NOT_FOUND: 'PHONE_NOT_FOUND',
    OTP_DELIVERY_FAILED: 'OTP_DELIVERY_FAILED',
};
/**
 * Maps Cognito exceptions to appropriate HTTP error responses.
 * Never exposes internal infrastructure details in error messages.
 */
export function mapCognitoError(error) {
    if (error instanceof Error) {
        const errorName = error.name;
        switch (errorName) {
            case 'UsernameExistsException':
                throw createError(409, 'An account with this email or phone is already registered', {
                    expose: true,
                });
            case 'ServiceUnavailableException':
            case 'InternalErrorException':
            case 'TooManyRequestsException':
                throw createError(503, 'Service temporarily unavailable. Please try again later.', {
                    expose: true,
                });
            case 'InvalidParameterException':
                throw createError(400, 'Invalid registration parameters', {
                    expose: true,
                });
            default:
                throw createError(500, 'An unexpected error occurred. Please try again later.', {
                    expose: true,
                });
        }
    }
    throw createError(500, 'An unexpected error occurred. Please try again later.', {
        expose: true,
    });
}
/**
 * Creates a 401 INVALID_CREDENTIALS error.
 * Generic message that does not reveal which credential is incorrect.
 * Requirement 2.2
 */
export function createInvalidCredentialsError() {
    const error = createError(401, 'Invalid email or password', {
        expose: true,
    });
    error['code'] = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
    throw error;
}
/**
 * Creates a 423 ACCOUNT_LOCKED error.
 * Requirement 2.3, 2.4
 */
export function createAccountLockedError() {
    const error = createError(423, 'Account is temporarily locked. Please try again later.', {
        expose: true,
    });
    error['code'] = AUTH_ERROR_CODES.ACCOUNT_LOCKED;
    throw error;
}
/**
 * Creates a 400 OTP_EXPIRED error.
 * Requirement 3.4
 */
export function createOtpExpiredError() {
    const error = createError(400, 'OTP has expired. Please request a new one.', {
        expose: true,
    });
    error['code'] = AUTH_ERROR_CODES.OTP_EXPIRED;
    throw error;
}
/**
 * Creates a 400 OTP_INVALID error.
 * Requirement 3.3
 */
export function createOtpInvalidError() {
    const error = createError(400, 'Invalid OTP. Please try again.', {
        expose: true,
    });
    error['code'] = AUTH_ERROR_CODES.OTP_INVALID;
    throw error;
}
/**
 * Creates a 400 OTP_MAX_ATTEMPTS error.
 * Requirement 3.3
 */
export function createOtpMaxAttemptsError() {
    const error = createError(400, 'Maximum OTP attempts exceeded. Please request a new OTP.', {
        expose: true,
    });
    error['code'] = AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS;
    throw error;
}
/**
 * Creates a 404 PHONE_NOT_FOUND error.
 * Requirement 3.5
 */
export function createPhoneNotFoundError() {
    const error = createError(404, 'Phone number is not registered.', {
        expose: true,
    });
    error['code'] = AUTH_ERROR_CODES.PHONE_NOT_FOUND;
    throw error;
}
/**
 * Creates a 500 OTP_DELIVERY_FAILED error.
 * Requirement 3.6 — does not expose internal details.
 */
export function createOtpDeliveryFailedError() {
    const error = createError(500, 'Unable to send OTP. Please try again later.', {
        expose: true,
    });
    error['code'] = AUTH_ERROR_CODES.OTP_DELIVERY_FAILED;
    throw error;
}
//# sourceMappingURL=errors.js.map