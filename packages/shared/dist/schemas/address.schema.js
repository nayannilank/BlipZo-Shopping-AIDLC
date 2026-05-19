import { z } from 'zod';
/**
 * E.164 phone format: + followed by 7-15 digits.
 */
const e164PhoneRegex = /^\+\d{7,15}$/;
/**
 * Create/update address schema.
 * Requirement 9.1: fullName 1-100, E.164 phone, line1 1-200, city 1-100, state 1-100,
 * postalCode required, country required.
 */
export const addressSchema = z.object({
    fullName: z
        .string()
        .min(1, { message: 'Full name is required' })
        .max(100, { message: 'Full name must be at most 100 characters' }),
    phone: z
        .string()
        .regex(e164PhoneRegex, {
        message: 'Phone must be in E.164 format (+ followed by 7-15 digits)',
    }),
    line1: z
        .string()
        .min(1, { message: 'Address line 1 is required' })
        .max(200, { message: 'Address line 1 must be at most 200 characters' }),
    line2: z.string().optional(),
    city: z
        .string()
        .min(1, { message: 'City is required' })
        .max(100, { message: 'City must be at most 100 characters' }),
    state: z
        .string()
        .min(1, { message: 'State is required' })
        .max(100, { message: 'State must be at most 100 characters' }),
    postalCode: z
        .string()
        .min(1, { message: 'Postal code is required' }),
    country: z
        .string()
        .min(1, { message: 'Country is required' }),
});
/**
 * Update address schema — all fields optional but validated if provided.
 */
export const updateAddressSchema = z.object({
    fullName: z
        .string()
        .min(1, { message: 'Full name is required' })
        .max(100, { message: 'Full name must be at most 100 characters' })
        .optional(),
    phone: z
        .string()
        .regex(e164PhoneRegex, {
        message: 'Phone must be in E.164 format (+ followed by 7-15 digits)',
    })
        .optional(),
    line1: z
        .string()
        .min(1, { message: 'Address line 1 is required' })
        .max(200, { message: 'Address line 1 must be at most 200 characters' })
        .optional(),
    line2: z.string().optional(),
    city: z
        .string()
        .min(1, { message: 'City is required' })
        .max(100, { message: 'City must be at most 100 characters' })
        .optional(),
    state: z
        .string()
        .min(1, { message: 'State is required' })
        .max(100, { message: 'State must be at most 100 characters' })
        .optional(),
    postalCode: z
        .string()
        .min(1, { message: 'Postal code is required' })
        .optional(),
    country: z
        .string()
        .min(1, { message: 'Country is required' })
        .optional(),
});
//# sourceMappingURL=address.schema.js.map