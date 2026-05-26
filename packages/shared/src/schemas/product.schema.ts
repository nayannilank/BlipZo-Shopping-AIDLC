import { z } from 'zod';

/**
 * Image upload validation.
 * Requirement 5.1: each image ≤ 10MB, JPEG/PNG/WebP format.
 */
export const imageUploadSchema = z.object({
  filename: z.string().min(1, { message: 'Filename is required' }),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Image content type must be image/jpeg, image/png, or image/webp',
  }),
  sizeBytes: z
    .number()
    .int({ message: 'Image size must be an integer' })
    .positive({ message: 'Image size must be greater than 0' })
    .max(10 * 1024 * 1024, { message: 'Each image must be at most 10 MB' }),
});

/**
 * Dynamic attributes value schema.
 * Each attribute value can be a string, number, boolean, or array of strings.
 * Requirements 3.5, 3.6, 7.1: Validates dynamic attribute value types.
 */
const dynamicAttributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

/**
 * Create product request schema.
 * Requirement 5.1: name 1-200, description 1-2000, price > 0 and ≤ 9999999.99,
 * stock 0-999999, at least one category, 1-10 images.
 * Requirements 3.5, 3.6, 7.1: categoryId, subcategoryId, and dynamicAttributes
 * for category-based product management.
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Product name is required' })
    .max(200, { message: 'Product name must be at most 200 characters' }),
  description: z
    .string()
    .min(1, { message: 'Product description is required' })
    .max(2000, { message: 'Product description must be at most 2000 characters' }),
  price: z
    .number()
    .gt(0, { message: 'Price must be greater than 0' })
    .max(9999999.99, { message: 'Price must be at most 9,999,999.99' }),
  stockQuantity: z
    .number()
    .int({ message: 'Stock quantity must be an integer' })
    .min(0, { message: 'Stock quantity must be at least 0' })
    .max(999999, { message: 'Stock quantity must be at most 999,999' }),
  categories: z
    .array(z.string().min(1, { message: 'Category must not be empty' }))
    .min(1, { message: 'At least one category is required' })
    .optional(),
  categoryId: z.string().min(1, { message: 'Category ID must not be empty' }).optional(),
  subcategoryId: z.string().min(1, { message: 'Subcategory ID must not be empty' }).optional(),
  dynamicAttributes: z.record(z.string(), dynamicAttributeValueSchema).optional(),
  images: z
    .array(imageUploadSchema)
    .min(1, { message: 'At least one image is required' })
    .max(10, { message: 'At most 10 images are allowed' }),
});

/**
 * Update product request schema.
 * Requirement 5.5: partial update with same bounds as creation.
 * All fields are optional but must meet constraints if provided.
 * Note: categoryId and subcategoryId are included as optional so the service layer
 * can detect and reject attempts to change them (Requirement 8.3).
 */
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Product name is required' })
    .max(200, { message: 'Product name must be at most 200 characters' })
    .optional(),
  description: z
    .string()
    .min(1, { message: 'Product description is required' })
    .max(2000, { message: 'Product description must be at most 2000 characters' })
    .optional(),
  price: z
    .number()
    .gt(0, { message: 'Price must be greater than 0' })
    .max(9999999.99, { message: 'Price must be at most 9,999,999.99' })
    .optional(),
  stockQuantity: z
    .number()
    .int({ message: 'Stock quantity must be an integer' })
    .min(0, { message: 'Stock quantity must be at least 0' })
    .max(999999, { message: 'Stock quantity must be at most 999,999' })
    .optional(),
  categories: z
    .array(z.string().min(1, { message: 'Category must not be empty' }))
    .min(1, { message: 'At least one category is required' })
    .optional(),
  categoryId: z.string().min(1, { message: 'Category ID must not be empty' }).optional(),
  subcategoryId: z.string().min(1, { message: 'Subcategory ID must not be empty' }).optional(),
  dynamicAttributes: z.record(z.string(), dynamicAttributeValueSchema).optional(),
  images: z
    .array(imageUploadSchema)
    .min(1, { message: 'At least one image is required' })
    .max(10, { message: 'At most 10 images are allowed' })
    .optional(),
});

/**
 * Seller policy schema.
 * Requirement 14.1: returnWindowDays 0-30, exchangeAllowed boolean, optional conditions.
 */
export const sellerPolicySchema = z.object({
  returnWindowDays: z
    .number()
    .int({ message: 'Return window days must be an integer' })
    .min(0, { message: 'Return window days must be at least 0' })
    .max(30, { message: 'Return window days must be at most 30' }),
  exchangeAllowed: z.boolean({
    message: 'exchangeAllowed must be a boolean',
  }),
  conditions: z.string().optional(),
});

export type CreateProductSchemaInput = z.input<typeof createProductSchema>;
export type UpdateProductSchemaInput = z.input<typeof updateProductSchema>;
export type SellerPolicySchemaInput = z.input<typeof sellerPolicySchema>;
