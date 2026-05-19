import { z } from 'zod';
/**
 * Create/update address schema.
 * Requirement 9.1: fullName 1-100, E.164 phone, line1 1-200, city 1-100, state 1-100,
 * postalCode required, country required.
 */
export declare const addressSchema: z.ZodObject<{
    fullName: z.ZodString;
    phone: z.ZodString;
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    postalCode: z.ZodString;
    country: z.ZodString;
}, z.core.$strip>;
/**
 * Update address schema — all fields optional but validated if provided.
 */
export declare const updateAddressSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    line1: z.ZodOptional<z.ZodString>;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AddressSchemaInput = z.input<typeof addressSchema>;
export type UpdateAddressSchemaInput = z.input<typeof updateAddressSchema>;
//# sourceMappingURL=address.schema.d.ts.map