import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { validateRegisterInput, validateLoginInput, validateOtpRequestInput, validateOtpVerifyInput, validateTokenRefreshInput, } from './validators.js';
import { registerUser, loginUser, requestOtp, verifyOtp, refreshToken } from './service.js';
/**
 * POST /auth/register — thin handler that delegates to service layer.
 * Validates input, calls registerUser, returns 201 with userId and message.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7
 */
const rawRegisterHandler = async (event) => {
    const input = validateRegisterInput(event);
    const result = await registerUser(input);
    return {
        statusCode: 201,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: result.userId,
            message: result.message,
        }),
    };
};
export const registerHandler = middy(rawRegisterHandler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
/**
 * POST /auth/login — thin handler that delegates to service layer.
 * Validates input, calls loginUser, returns 200 with AuthResponse.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
const rawLoginHandler = async (event) => {
    const input = validateLoginInput(event);
    const result = await loginUser(input);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            userId: result.userId,
            role: result.role,
        }),
    };
};
export const loginHandler = middy(rawLoginHandler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
/**
 * POST /auth/otp/request — thin handler that delegates to service layer.
 * Validates E.164 phone, checks user exists, generates OTP, stores in DynamoDB.
 *
 * Requirements: 3.1, 3.5, 3.6
 */
const rawOtpRequestHandler = async (event) => {
    const input = validateOtpRequestInput(event);
    const result = await requestOtp(input);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: result.message,
        }),
    };
};
export const otpRequestHandler = middy(rawOtpRequestHandler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
/**
 * POST /auth/otp/verify — thin handler that delegates to service layer.
 * Validates OTP, checks expiry and attempts, returns AuthResponse on success.
 *
 * Requirements: 3.2, 3.3, 3.4
 */
const rawOtpVerifyHandler = async (event) => {
    const input = validateOtpVerifyInput(event);
    const result = await verifyOtp(input);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            userId: result.userId,
            role: result.role,
        }),
    };
};
export const otpVerifyHandler = middy(rawOtpVerifyHandler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
/**
 * POST /auth/token/refresh — thin handler that delegates to service layer.
 * Calls Cognito InitiateAuth with REFRESH_TOKEN_AUTH and returns new accessToken.
 *
 * Requirement: 2.5
 */
const rawTokenRefreshHandler = async (event) => {
    const input = validateTokenRefreshInput(event);
    const result = await refreshToken(input);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            accessToken: result.accessToken,
        }),
    };
};
export const tokenRefreshHandler = middy(rawTokenRefreshHandler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
//# sourceMappingURL=handler.js.map