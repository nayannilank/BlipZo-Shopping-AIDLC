import { z } from 'zod';
/**
 * Image upload validation.
 * Requirement 5.1: each image ≤ 10MB, JPEG/PNG/WebP format.
 */
export declare const imageUploadSchema: z.ZodObject<{
    filename: z.ZodString;
    contentType: z.ZodEnum<{
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
        "image/webp": "image/webp";
    }>;
    sizeBytes: z.ZodNumber;
}, z.core.$strip>;
/**
 * Create product request schema.
 * Requirement 5.1: name 1-200, description 1-2000, price > 0 and ≤ 9999999.99,
 * stock 0-999999, at least one category, 1-10 images.
 */
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    price: z.ZodNumber;
    stockQuantity: z.ZodNumber;
    categories: z.ZodArray<z.ZodString>;
    images: z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        contentType: z.ZodEnum<{
            "image/jpeg": "image/jpeg";
            "image/png": "image/png";
            "image/webp": "image/webp";
        }>;
        sizeBytes: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Update product request schema.
 * Requirement 5.5: partial update with same bounds as creation.
 * All fields are optional but must meet constraints if provided.
 */
export declare const updateProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    stockQuantity: z.ZodOptional<z.ZodNumber>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
    images: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        contentType: z.ZodEnum<{
            "image/jpeg": "image/jpeg";
            "image/png": "image/png";
            "image/webp": "image/webp";
        }>;
        sizeBytes: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
/**
 * Seller policy schema.
 * Requirement 14.1: returnWindowDays 0-30, exchangeAllowed boolean, optional conditions.
 */
export declare const sellerPolicySchema: z.ZodObject<{
    returnWindowDays: z.ZodNumber;
    exchangeAllowed: z.ZodBoolean;
    conditions: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateProductSchemaInput = z.input<typeof createProductSchema>;
export type UpdateProductSchemaInput = z.input<typeof updateProductSchema>;
export type SellerPolicySchemaInput = z.input<typeof sellerPolicySchema>;
//# sourceMappingURL=product.schema.d.ts.map