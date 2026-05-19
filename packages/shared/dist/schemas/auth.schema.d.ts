import { z } from 'zod';
/**
 * Password validation with specific error messages for each rule violation.
 * Requirements 1.1, 1.4: 8-128 chars, at least one uppercase, one lowercase, one digit.
 */
export declare const passwordSchema: z.ZodString;
/**
 * Email validation: must contain exactly one @ with non-empty local and domain parts.
 */
export declare const emailSchema: z.ZodString;
/**
 * Phone number in E.164 format: + followed by 7-15 digits.
 */
export declare const e164PhoneSchema: z.ZodString;
/**
 * Registration request schema.
 * Requirement 1.1: email or phone required, password with rules, role Buyer or Seller.
 */
export declare const registerSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    role: z.ZodEnum<{
        Buyer: "Buyer";
        Seller: "Seller";
    }>;
}, z.core.$strip>;
/**
 * Login request schema.
 * Requirement 2.1: email and password required.
 */
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
/**
 * OTP request payload schema.
 * Requirement 3.1: phone in E.164 format.
 */
export declare const otpRequestSchema: z.ZodObject<{
    phone: z.ZodString;
}, z.core.$strip>;
/**
 * OTP verify payload schema.
 * Requirement 3.2: phone in E.164 format, OTP is 6-digit numeric string.
 */
export declare const otpVerifySchema: z.ZodObject<{
    phone: z.ZodString;
    otp: z.ZodString;
}, z.core.$strip>;
export type RegisterSchemaInput = z.input<typeof registerSchema>;
export type LoginSchemaInput = z.input<typeof loginSchema>;
export type OtpRequestSchemaInput = z.input<typeof otpRequestSchema>;
export type OtpVerifySchemaInput = z.input<typeof otpVerifySchema>;
//# sourceMappingURL=auth.schema.d.ts.map