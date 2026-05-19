import { z } from 'zod';
/**
 * Catalogue list request schema.
 * Requirement 6.5: limit 1-20 default 20, cursor is base64 string.
 */
export declare const catalogueListSchema: z.ZodObject<{
    categoryId: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Search request schema.
 * Requirement 6.6: query 1-100 non-whitespace-only characters.
 */
export declare const searchRequestSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CatalogueListSchemaInput = z.input<typeof catalogueListSchema>;
export type SearchRequestSchemaInput = z.input<typeof searchRequestSchema>;
//# sourceMappingURL=catalogue.schema.d.ts.map