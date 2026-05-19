import type { RegisterRequest, LoginRequest, AuthResponse, OtpRequestPayload, OtpVerifyPayload } from '@blipzo/shared';
import type { TokenRefreshInput } from './validators.js';
export interface RegisterResult {
    userId: string;
    message: string;
}
export interface OtpRequestResult {
    message: string;
}
export interface TokenRefreshResult {
    accessToken: string;
}
/**
 * Registers a new user in Cognito with the specified role.
 * Sets custom:role attribute at creation time.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7
 */
export declare function registerUser(input: RegisterRequest): Promise<RegisterResult>;
/**
 * Authenticates a user with email and password via Cognito.
 * Implements account lockout after 5 consecutive failed attempts within 15 minutes.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export declare function loginUser(input: LoginRequest): Promise<AuthResponse>;
/**
 * Requests an OTP for the given phone number.
 * Generates a 6-digit OTP, stores it in the OTP DynamoDB table with 10-min TTL,
 * and logs the OTP to CloudWatch in dev/qa environments only.
 *
 * Requirements: 3.1, 3.5, 3.6
 */
export declare function requestOtp(input: OtpRequestPayload): Promise<OtpRequestResult>;
/**
 * Verifies an OTP for the given phone number.
 * Checks that the OTP is not used, not expired, and attempt count < 3.
 * On success, marks OTP as used and returns AuthResponse.
 * On failure, increments attempt count; after 3 failures, deletes the OTP record.
 *
 * Requirements: 3.2, 3.3, 3.4
 */
export declare function verifyOtp(input: OtpVerifyPayload): Promise<AuthResponse>;
/**
 * Refreshes an access token using a refresh token.
 * Calls Cognito InitiateAuth with REFRESH_TOKEN_AUTH flow.
 *
 * Requirement 2.5
 */
export declare function refreshToken(input: TokenRefreshInput): Promise<TokenRefreshResult>;
//# sourceMappingURL=service.d.ts.map