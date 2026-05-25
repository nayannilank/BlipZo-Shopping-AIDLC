import { z } from 'zod';

/**
 * E.164 phone format: + followed by 7-15 digits
 */
const e164PhoneRegex = /^\+\d{7,15}$/;

/**
 * Password validation with specific error messages for each rule violation.
 * Requirements 1.1, 1.4: 8-128 chars, at least one uppercase, one lowercase, one digit.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must be at most 128 characters' })
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /\d/.test(val), {
    message: 'Password must contain at least one digit',
  });

/**
 * Email validation: must contain exactly one @ with non-empty local and domain parts.
 */
export const emailSchema = z
  .string()
  .min(1, { message: 'Email is required' })
  .refine(
    (val) => {
      const parts = val.split('@');
      if (parts.length !== 2) return false;
      const [local, domain] = parts;
      return local !== undefined && local.length > 0 && domain !== undefined && domain.length > 0;
    },
    { message: 'Email must contain exactly one @ with non-empty local and domain parts' },
  );

/**
 * Phone number in E.164 format: + followed by 7-15 digits.
 */
export const e164PhoneSchema = z.string().regex(e164PhoneRegex, {
  message: 'Phone must be in E.164 format (+ followed by 7-15 digits)',
});

/**
 * Username validation: 3-30 characters, alphanumeric, underscores, or hyphens.
 */
export const usernameSchema = z
  .string()
  .min(3, { message: 'Username must be 3-30 characters, alphanumeric, underscores, or hyphens' })
  .max(30, { message: 'Username must be 3-30 characters, alphanumeric, underscores, or hyphens' })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username must be 3-30 characters, alphanumeric, underscores, or hyphens',
  });

/**
 * Registration request schema.
 * Requirement 1.1: username required, email optional, phone required, password with rules, role Buyer or Seller.
 */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema.optional(),
  phone: e164PhoneSchema,
  password: passwordSchema,
  role: z.enum(['Buyer', 'Seller'], {
    message: 'Role must be either "Buyer" or "Seller"',
  }),
});

/**
 * Login request schema.
 * Requirement 2.1: email and password required.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Password is required' }),
});

/**
 * OTP request payload schema.
 * Requirement 3.1: phone in E.164 format.
 */
export const otpRequestSchema = z.object({
  phone: e164PhoneSchema,
});

/**
 * OTP verify payload schema.
 * Requirement 3.2: phone in E.164 format, OTP is 6-digit numeric string.
 */
export const otpVerifySchema = z.object({
  phone: e164PhoneSchema,
  otp: z
    .string()
    .length(6, { message: 'OTP must be exactly 6 digits' })
    .regex(/^\d{6}$/, { message: 'OTP must be a 6-digit numeric string' }),
});

export type RegisterSchemaInput = z.input<typeof registerSchema>;
export type LoginSchemaInput = z.input<typeof loginSchema>;
export type OtpRequestSchemaInput = z.input<typeof otpRequestSchema>;
export type OtpVerifySchemaInput = z.input<typeof otpVerifySchema>;
