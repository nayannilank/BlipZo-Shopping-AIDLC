import type { RegisterRequest, LoginRequest, OtpRequestPayload, OtpVerifyPayload } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
/**
 * Token refresh request schema.
 * Requires a non-empty refreshToken string.
 */
export declare const tokenRefreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export type TokenRefreshInput = z.infer<typeof tokenRefreshSchema>;
/**
 * Validates the registration request body against the shared registerSchema.
 * Returns a typed RegisterRequest on success, throws a 400 error on validation failure.
 */
export declare function validateRegisterInput(event: APIGatewayProxyEvent): RegisterRequest;
/**
 * Validates the login request body against the shared loginSchema.
 * Returns a typed LoginRequest on success, throws a 400 error on validation failure.
 */
export declare function validateLoginInput(event: APIGatewayProxyEvent): LoginRequest;
/**
 * Validates the OTP request body against the shared otpRequestSchema.
 * Returns a typed OtpRequestPayload on success, throws a 400 error on validation failure.
 *
 * Requirement 3.1: Phone must be in E.164 format.
 */
export declare function validateOtpRequestInput(event: APIGatewayProxyEvent): OtpRequestPayload;
/**
 * Validates the OTP verify request body against the shared otpVerifySchema.
 * Returns a typed OtpVerifyPayload on success, throws a 400 error on validation failure.
 *
 * Requirement 3.2: Phone in E.164 format, OTP is 6-digit numeric string.
 */
export declare function validateOtpVerifyInput(event: APIGatewayProxyEvent): OtpVerifyPayload;
/**
 * Validates the token refresh request body.
 * Returns a typed TokenRefreshInput on success, throws a 400 error on validation failure.
 */
export declare function validateTokenRefreshInput(event: APIGatewayProxyEvent): TokenRefreshInput;
//# sourceMappingURL=validators.d.ts.map