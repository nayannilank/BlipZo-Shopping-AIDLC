import { structuredLogger } from '@blipzo/shared';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { registerUser, loginUser, requestOtp, verifyOtp, refreshToken } from './service.js';
import {
  validateRegisterInput,
  validateLoginInput,
  validateOtpRequestInput,
  validateOtpVerifyInput,
  validateTokenRefreshInput,
} from './validators.js';

/**
 * POST /auth/register — thin handler that delegates to service layer.
 * Validates input, calls registerUser, returns 201 with userId and message.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7
 */
const rawRegisterHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
  .use(structuredLogger({ service: 'auth-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * POST /auth/login — thin handler that delegates to service layer.
 * Validates input, calls loginUser, returns 200 with AuthResponse.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
const rawLoginHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
  .use(structuredLogger({ service: 'auth-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * POST /auth/otp/request — thin handler that delegates to service layer.
 * Validates E.164 phone, checks user exists, generates OTP, stores in DynamoDB.
 *
 * Requirements: 3.1, 3.5, 3.6
 */
const rawOtpRequestHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
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
  .use(structuredLogger({ service: 'auth-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * POST /auth/otp/verify — thin handler that delegates to service layer.
 * Validates OTP, checks expiry and attempts, returns AuthResponse on success.
 *
 * Requirements: 3.2, 3.3, 3.4
 */
const rawOtpVerifyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
  .use(structuredLogger({ service: 'auth-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * POST /auth/token/refresh — thin handler that delegates to service layer.
 * Calls Cognito InitiateAuth with REFRESH_TOKEN_AUTH and returns new accessToken.
 *
 * Requirement: 2.5
 */
const rawTokenRefreshHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
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
  .use(structuredLogger({ service: 'auth-service' }))
  .use(
    httpErrorHandler({
      fallbackMessage: 'An unexpected error occurred. Please try again later.',
    }),
  );

/**
 * Main Lambda entry point — routes requests to the appropriate handler
 * based on HTTP method and API Gateway resource path.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource } = event;
  const route = `${httpMethod} ${resource}`;

  switch (route) {
    case 'POST /auth/register':
      return registerHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'POST /auth/login':
      return loginHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'POST /auth/otp/request':
      return otpRequestHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'POST /auth/otp/verify':
      return otpVerifyHandler(event, context) as Promise<APIGatewayProxyResult>;
    case 'POST /auth/token/refresh':
      return tokenRefreshHandler(event, context) as Promise<APIGatewayProxyResult>;
    default:
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
      };
  }
};
