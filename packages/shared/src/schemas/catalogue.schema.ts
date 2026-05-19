import { z } from 'zod';

/**
 * Catalogue list request schema.
 * Requirement 6.5: limit 1-20 default 20, cursor is base64 string.
 */
export const catalogueListSchema = z.object({
  categoryId: z.string().min(1, { message: 'Category ID is required' }),
  limit: z
    .number()
    .int({ message: 'Limit must be an integer' })
    .min(1, { message: 'Limit must be at least 1' })
    .max(20, { message: 'Limit must be at most 20' })
    .default(20),
  cursor: z.string().optional(),
});

/**
 * Search request schema.
 * Requirement 6.6: query 1-100 non-whitespace-only characters.
 */
export const searchRequestSchema = z.object({
  query: z
    .string()
    .min(1, { message: 'Search query is required' })
    .max(100, { message: 'Search query must be at most 100 characters' })
    .refine((val) => val.trim().length > 0, {
      message: 'Search query must not be whitespace only',
    }),
  limit: z
    .number()
    .int({ message: 'Limit must be an integer' })
    .min(1, { message: 'Limit must be at least 1' })
    .max(20, { message: 'Limit must be at most 20' })
    .default(20),
  cursor: z.string().optional(),
});

export type CatalogueListSchemaInput = z.input<typeof catalogueListSchema>;
export type SearchRequestSchemaInput = z.input<typeof searchRequestSchema>;
