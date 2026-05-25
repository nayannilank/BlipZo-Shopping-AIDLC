import { z } from 'zod';

/**
 * Indian PAN format: 5 uppercase letters + 4 digits + 1 uppercase letter
 */
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Indian GST format: 2 digits + PAN (5 letters + 4 digits + 1 letter) + 1 digit + Z + 1 alphanumeric
 */
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}Z[0-9A-Z]{1}$/;

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
 * Phone number validation: E.164 format (+ followed by 7-15 digits) OR 10-digit Indian number.
 * The backend will normalize 10-digit numbers by prepending +91.
 */
export const e164PhoneSchema = z
  .string()
  .refine((val) => /^\+\d{7,15}$/.test(val) || /^\d{10}$/.test(val), {
    message: 'Phone must be a 10-digit number or E.164 format (+ followed by 7-15 digits)',
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
 * First name validation: 1-50 characters.
 */
export const firstNameSchema = z
  .string()
  .min(1, { message: 'First name is required' })
  .max(50, { message: 'First name must be at most 50 characters' });

/**
 * Last name validation: 1-50 characters.
 */
export const lastNameSchema = z
  .string()
  .min(1, { message: 'Last name is required' })
  .max(50, { message: 'Last name must be at most 50 characters' });

/**
 * Gender enum for buyer registration.
 */
export const genderSchema = z.enum(['Male', 'Female', 'Other', 'PreferNotToSay'], {
  message: 'Gender must be Male, Female, Other, or PreferNotToSay',
});

/**
 * Date of birth validation: must be a valid ISO date, person must be 13+ years old.
 */
export const dateOfBirthSchema = z
  .string()
  .min(1, { message: 'Date of birth is required' })
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Date of birth must be a valid date' },
  )
  .refine(
    (val) => {
      const dob = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      return actualAge >= 13;
    },
    { message: 'You must be at least 13 years old' },
  );

/**
 * Company name validation: 1-200 characters.
 */
export const companyNameSchema = z
  .string()
  .min(1, { message: 'Company name is required' })
  .max(200, { message: 'Company name must be at most 200 characters' });

/**
 * Company URL validation: must be a valid URL starting with https://.
 */
export const companyUrlSchema = z
  .string()
  .min(1, { message: 'Company URL is required' })
  .refine((val) => val.startsWith('https://'), {
    message: 'Company URL must start with https://',
  })
  .refine(
    (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Company URL must be a valid URL' },
  );

/**
 * Company address validation: 1-500 characters.
 */
export const companyAddressSchema = z
  .string()
  .min(1, { message: 'Company address is required' })
  .max(500, { message: 'Company address must be at most 500 characters' });

/**
 * TAN/PAN number validation: Indian PAN format (5 letters + 4 digits + 1 letter).
 */
export const tanPanNumberSchema = z
  .string()
  .length(10, { message: 'TAN/PAN number must be exactly 10 characters' })
  .regex(panRegex, {
    message: 'TAN/PAN must be in Indian PAN format (e.g., ABCDE1234F)',
  });

/**
 * GST number validation: Indian GST format (2 digits + PAN + 1 digit + Z + 1 alphanumeric).
 */
export const gstNumberSchema = z
  .string()
  .length(15, { message: 'GST number must be exactly 15 characters' })
  .regex(gstRegex, {
    message: 'GST must be in Indian GST format (e.g., 22ABCDE1234F1Z5)',
  });

/**
 * Inception date validation: must be a valid ISO date in the past.
 */
export const inceptionDateSchema = z
  .string()
  .min(1, { message: 'Inception date is required' })
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Inception date must be a valid date' },
  )
  .refine(
    (val) => {
      const date = new Date(val);
      return date < new Date();
    },
    { message: 'Inception date must be in the past' },
  );

/**
 * Common fields shared between Buyer and Seller registration.
 */
const commonFieldsSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  username: usernameSchema,
  email: emailSchema,
  phone: e164PhoneSchema,
  password: passwordSchema,
});

/**
 * Buyer registration schema.
 */
const buyerSchema = commonFieldsSchema.extend({
  role: z.literal('Buyer'),
  dateOfBirth: dateOfBirthSchema,
  gender: genderSchema,
});

/**
 * Seller registration schema.
 */
const sellerSchema = commonFieldsSchema.extend({
  role: z.literal('Seller'),
  companyName: companyNameSchema,
  companyUrl: companyUrlSchema,
  companyAddress: companyAddressSchema,
  tanPanNumber: tanPanNumberSchema,
  gstNumber: gstNumberSchema,
  inceptionDate: inceptionDateSchema,
});

/**
 * Registration request schema using discriminated union on 'role'.
 * - If role === 'Buyer': dateOfBirth and gender are required
 * - If role === 'Seller': company fields, TAN/PAN, GST, and inception date are required
 */
export const registerSchema = z.discriminatedUnion('role', [buyerSchema, sellerSchema]);

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
