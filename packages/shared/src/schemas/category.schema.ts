import { z } from 'zod';

/**
 * Zod validation schemas for category operations.
 *
 * Validates the hierarchical category taxonomy structures including
 * category nodes, attribute definitions, and attribute schemas.
 *
 * Requirements: 1.6, 2.1, 2.2
 */

/**
 * Validates the AttributeDataType enum.
 * Requirement 2.2: data type must be text, number, single-select, multi-select, or boolean.
 */
export const attributeDataTypeSchema = z.enum([
  'text',
  'number',
  'single-select',
  'multi-select',
  'boolean',
]);

/**
 * Validates an AttributeDefinition.
 * Requirement 2.2: field name, display label, data type, required flag, allowed values for select fields.
 *
 * Refinement: when dataType is single-select or multi-select, allowedValues should be
 * a non-empty array if specified (not null).
 */
export const attributeDefinitionSchema = z
  .object({
    fieldName: z.string().min(1, { message: 'Field name is required' }),
    displayLabel: z.string().min(1, { message: 'Display label is required' }),
    dataType: attributeDataTypeSchema,
    required: z.boolean(),
    allowedValues: z.array(z.string()).nullable().optional(),
    filterable: z.boolean(),
    displayPriority: z.number().int({ message: 'Display priority must be an integer' }),
  })
  .refine(
    (data) => {
      if (data.dataType === 'single-select' || data.dataType === 'multi-select') {
        // When dataType is a select type and allowedValues is specified (not null/undefined),
        // it must be a non-empty array
        if (data.allowedValues !== null && data.allowedValues !== undefined) {
          return data.allowedValues.length > 0;
        }
      }
      return true;
    },
    {
      message:
        'allowedValues must be a non-empty array when specified for single-select or multi-select data types',
    },
  );

/**
 * Validates a CategoryNode in the category tree.
 * Requirement 1.6: categoryId, parentId (null for top-level), name, slug,
 * level (1 for Category, 2 for Subcategory), and isActive flag.
 */
export const categoryNodeSchema = z.object({
  categoryId: z.string().min(1, { message: 'Category ID is required' }),
  parentId: z.string().nullable(),
  name: z.string().min(1, { message: 'Category name is required' }),
  slug: z.string().min(1, { message: 'Slug is required' }),
  level: z.union([z.literal(1), z.literal(2)]),
  isActive: z.boolean(),
  icon: z.string().optional(),
  createdAt: z.string().min(1, { message: 'Created at timestamp is required' }),
  updatedAt: z.string().min(1, { message: 'Updated at timestamp is required' }),
});

/**
 * Validates an AttributeSchema for a subcategory.
 * Requirement 2.1: stores an Attribute_Schema for each Subcategory defining Dynamic_Attributes.
 * Requirement 2.2: defines field name, display label, data type, required/optional, allowed values.
 */
export const attributeSchemaSchema = z.object({
  subcategoryId: z.string().min(1, { message: 'Subcategory ID is required' }),
  schemaVersion: z
    .number()
    .int({ message: 'Schema version must be an integer' })
    .positive({ message: 'Schema version must be positive' }),
  attributes: z
    .array(attributeDefinitionSchema)
    .min(1, { message: 'At least one attribute definition is required' }),
  createdAt: z.string().min(1, { message: 'Created at timestamp is required' }),
});

/**
 * Validates the CategoryTreeResponse (top-level categories list).
 */
export const categoryTreeResponseSchema = z.object({
  categories: z.array(categoryNodeSchema),
});

/**
 * Validates the SubcategoryListResponse.
 */
export const subcategoryListResponseSchema = z.object({
  subcategories: z.array(categoryNodeSchema),
});

/**
 * Validates the AttributeSchemaResponse.
 */
export const attributeSchemaResponseSchema = z.object({
  subcategoryId: z.string().min(1, { message: 'Subcategory ID is required' }),
  schemaVersion: z
    .number()
    .int({ message: 'Schema version must be an integer' })
    .positive({ message: 'Schema version must be positive' }),
  attributes: z.array(attributeDefinitionSchema),
});

// Inferred input types for use in validation
export type AttributeDataTypeSchemaInput = z.input<typeof attributeDataTypeSchema>;
export type AttributeDefinitionSchemaInput = z.input<typeof attributeDefinitionSchema>;
export type CategoryNodeSchemaInput = z.input<typeof categoryNodeSchema>;
export type AttributeSchemaSchemaInput = z.input<typeof attributeSchemaSchema>;
export type CategoryTreeResponseSchemaInput = z.input<typeof categoryTreeResponseSchema>;
export type SubcategoryListResponseSchemaInput = z.input<typeof subcategoryListResponseSchema>;
export type AttributeSchemaResponseSchemaInput = z.input<typeof attributeSchemaResponseSchema>;
