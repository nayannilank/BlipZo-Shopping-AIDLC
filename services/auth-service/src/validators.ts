import { registerSchema, loginSchema, otpRequestSchema, otpVerifySchema } from '@blipzo/shared';
import type {
  RegisterRequest,
  LoginRequest,
  OtpRequestPayload,
  OtpVerifyPayload,
} from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import createError from 'http-errors';
import { z } from 'zod';

/**
 * Token refresh request schema.
 * Requires a non-empty refreshToken string.
 */
export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

export type TokenRefreshInput = z.infer<typeof tokenRefreshSchema>;

/**
 * Validates the registration request body against the shared registerSchema.
 * Returns a typed RegisterRequest on success, throws a 400 error on validation failure.
 */
export function validateRegisterInput(event: APIGatewayProxyEvent): RegisterRequest {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = registerSchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        fields[path] = issue.message;
      }
    }

    const error = createError(400, 'Validation failed');
    (error as unknown as Record<string, unknown>)['fields'] = fields;
    throw error;
  }

  const data = result.data;

  // At least one of email or phone must be provided
  if (!data.email && !data.phone) {
    throw createError(400, 'Either email or phone is required for registration');
  }

  return data as RegisterRequest;
}

/**
 * Validates the login request body against the shared loginSchema.
 * Returns a typed LoginRequest on success, throws a 400 error on validation failure.
 */
export function validateLoginInput(event: APIGatewayProxyEvent): LoginRequest {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = loginSchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        fields[path] = issue.message;
      }
    }

    const error = createError(400, 'Validation failed');
    (error as unknown as Record<string, unknown>)['fields'] = fields;
    throw error;
  }

  return result.data;
}

/**
 * Validates the OTP request body against the shared otpRequestSchema.
 * Returns a typed OtpRequestPayload on success, throws a 400 error on validation failure.
 *
 * Requirement 3.1: Phone must be in E.164 format.
 */
export function validateOtpRequestInput(event: APIGatewayProxyEvent): OtpRequestPayload {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = otpRequestSchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        fields[path] = issue.message;
      }
    }

    const error = createError(400, 'Validation failed');
    (error as unknown as Record<string, unknown>)['fields'] = fields;
    throw error;
  }

  return result.data;
}

/**
 * Validates the OTP verify request body against the shared otpVerifySchema.
 * Returns a typed OtpVerifyPayload on success, throws a 400 error on validation failure.
 *
 * Requirement 3.2: Phone in E.164 format, OTP is 6-digit numeric string.
 */
export function validateOtpVerifyInput(event: APIGatewayProxyEvent): OtpVerifyPayload {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = otpVerifySchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        fields[path] = issue.message;
      }
    }

    const error = createError(400, 'Validation failed');
    (error as unknown as Record<string, unknown>)['fields'] = fields;
    throw error;
  }

  return result.data;
}

/**
 * Validates the token refresh request body.
 * Returns a typed TokenRefreshInput on success, throws a 400 error on validation failure.
 */
export function validateTokenRefreshInput(event: APIGatewayProxyEvent): TokenRefreshInput {
  const body = event.body as unknown;

  if (!body || typeof body !== 'object') {
    throw createError(400, 'Request body is required');
  }

  const result = tokenRefreshSchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path) {
        fields[path] = issue.message;
      }
    }

    const error = createError(400, 'Validation failed');
    (error as unknown as Record<string, unknown>)['fields'] = fields;
    throw error;
  }

  return result.data;
}
