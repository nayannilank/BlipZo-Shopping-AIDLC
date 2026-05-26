import type { AttributeDefinition } from '@blipzo/shared';
import { z } from 'zod';

/**
 * Result of dynamic attribute validation.
 * On success, `valid` is true and `fields` is empty.
 * On failure, `valid` is false and `fields` contains field-level error messages.
 *
 * Requirements: 3.5, 3.6, 3.7
 */
export interface AttributeValidationResult {
  valid: boolean;
  fields: Record<string, string>;
}

/**
 * Builds a Zod schema for a single attribute definition based on its dataType,
 * required flag, and allowedValues.
 */
function buildFieldSchema(definition: AttributeDefinition): z.ZodType {
  const { dataType, required, allowedValues, displayLabel } = definition;

  let schema: z.ZodType;

  switch (dataType) {
    case 'text': {
      if (required) {
        schema = z.string().min(1, { message: `${displayLabel} is required` });
      } else {
        schema = z.string();
      }
      break;
    }

    case 'number': {
      schema = z.number({ message: `${displayLabel} must be a number` });
      break;
    }

    case 'single-select': {
      if (allowedValues && allowedValues.length > 0) {
        const values = allowedValues as [string, ...string[]];
        schema = z.enum(values, {
          message: `Value is not allowed. Allowed values: ${allowedValues.join(', ')}`,
        });
      } else {
        if (required) {
          schema = z.string().min(1, { message: `${displayLabel} is required` });
        } else {
          schema = z.string();
        }
      }
      break;
    }

    case 'multi-select': {
      let itemSchema: z.ZodType;
      if (allowedValues && allowedValues.length > 0) {
        const values = allowedValues as [string, ...string[]];
        itemSchema = z.enum(values, {
          message: `Value is not allowed. Allowed values: ${allowedValues.join(', ')}`,
        });
      } else {
        itemSchema = z.string();
      }

      if (required) {
        schema = z.array(itemSchema).min(1, {
          message: `At least one ${displayLabel.toLowerCase()} must be selected`,
        });
      } else {
        schema = z.array(itemSchema);
      }
      break;
    }

    case 'boolean': {
      schema = z.boolean({ message: `${displayLabel} must be a boolean` });
      break;
    }

    default: {
      schema = z.unknown();
      break;
    }
  }

  if (!required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Validates dynamic attributes against an attribute schema definition.
 *
 * Builds a Zod schema dynamically from the AttributeDefinition[] array and validates
 * the submitted attributes. Returns field-level error messages on validation failure.
 *
 * Requirements: 3.5, 3.6, 3.7
 *
 * @param dynamicAttributes - The submitted dynamic attributes to validate
 * @param schema - The attribute definitions for the subcategory
 * @returns Validation result with field-level errors if invalid
 */
export function validateDynamicAttributes(
  dynamicAttributes: Record<string, unknown>,
  schema: AttributeDefinition[],
): AttributeValidationResult {
  // Build a Zod object schema from the attribute definitions
  const shape: Record<string, z.ZodType> = {};

  for (const definition of schema) {
    shape[definition.fieldName] = buildFieldSchema(definition);
  }

  const zodSchema = z.object(shape);

  const result = zodSchema.safeParse(dynamicAttributes);

  if (result.success) {
    return { valid: true, fields: {} };
  }

  // Map Zod errors to field-level error messages with the required prefix format
  const fields: Record<string, string> = {};

  for (const issue of result.error.issues) {
    // Use only the top-level field name (first path segment) for the error key.
    // Array item errors (e.g., path ['availableSizes', 1]) should be reported
    // at the field level (dynamicAttributes.availableSizes), not the item level.
    const topLevelField = issue.path[0];
    if (topLevelField === undefined) continue;

    const fieldKey = `dynamicAttributes.${String(topLevelField)}`;

    // Only keep the first error per field
    if (!fields[fieldKey]) {
      fields[fieldKey] = issue.message;
    }
  }

  return { valid: false, fields };
}
