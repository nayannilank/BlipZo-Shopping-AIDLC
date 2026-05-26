import { describe, it, expect } from 'vitest';

import {
  attributeDataTypeSchema,
  attributeDefinitionSchema,
  categoryNodeSchema,
  attributeSchemaSchema,
  categoryTreeResponseSchema,
  subcategoryListResponseSchema,
  attributeSchemaResponseSchema,
} from './category.schema.js';

describe('categoryNodeSchema', () => {
  const validTopLevelNode = {
    categoryId: 'cat_electronics',
    parentId: null,
    name: 'Electronics',
    slug: 'electronics',
    level: 1 as const,
    isActive: true,
    icon: 'cpu',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const validSubcategoryNode = {
    categoryId: 'subcat_phones',
    parentId: 'cat_electronics',
    name: 'Phones',
    slug: 'phones',
    level: 2 as const,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('accepts a valid top-level category node', () => {
    const result = categoryNodeSchema.safeParse(validTopLevelNode);
    expect(result.success).toBe(true);
  });

  it('accepts a valid subcategory node', () => {
    const result = categoryNodeSchema.safeParse(validSubcategoryNode);
    expect(result.success).toBe(true);
  });

  it('accepts a node without optional icon field', () => {
    const { icon: _icon, ...nodeWithoutIcon } = validTopLevelNode;
    const result = categoryNodeSchema.safeParse(nodeWithoutIcon);
    expect(result.success).toBe(true);
  });

  it('rejects a node with empty categoryId', () => {
    const result = categoryNodeSchema.safeParse({ ...validTopLevelNode, categoryId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a node with empty name', () => {
    const result = categoryNodeSchema.safeParse({ ...validTopLevelNode, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a node with invalid level', () => {
    const result = categoryNodeSchema.safeParse({ ...validTopLevelNode, level: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects a node missing required fields', () => {
    const result = categoryNodeSchema.safeParse({ categoryId: 'cat_1' });
    expect(result.success).toBe(false);
  });
});

describe('attributeDataTypeSchema', () => {
  it('accepts all valid data types', () => {
    const validTypes = ['text', 'number', 'single-select', 'multi-select', 'boolean'];
    for (const type of validTypes) {
      const result = attributeDataTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid data types', () => {
    const result = attributeDataTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('attributeDefinitionSchema', () => {
  const validTextAttribute = {
    fieldName: 'brand',
    displayLabel: 'Brand',
    dataType: 'text',
    required: true,
    filterable: true,
    displayPriority: 1,
  };

  const validSelectAttribute = {
    fieldName: 'gender',
    displayLabel: 'Gender',
    dataType: 'single-select',
    required: true,
    allowedValues: ['Male', 'Female', 'Unisex'],
    filterable: true,
    displayPriority: 3,
  };

  const validMultiSelectAttribute = {
    fieldName: 'availableSizes',
    displayLabel: 'Available Sizes',
    dataType: 'multi-select',
    required: true,
    allowedValues: ['IND 7', 'IND 8', 'IND 9'],
    filterable: true,
    displayPriority: 2,
  };

  it('accepts a valid text attribute definition', () => {
    const result = attributeDefinitionSchema.safeParse(validTextAttribute);
    expect(result.success).toBe(true);
  });

  it('accepts a valid single-select attribute with allowedValues', () => {
    const result = attributeDefinitionSchema.safeParse(validSelectAttribute);
    expect(result.success).toBe(true);
  });

  it('accepts a valid multi-select attribute with allowedValues', () => {
    const result = attributeDefinitionSchema.safeParse(validMultiSelectAttribute);
    expect(result.success).toBe(true);
  });

  it('accepts a select attribute with null allowedValues', () => {
    const result = attributeDefinitionSchema.safeParse({
      ...validSelectAttribute,
      allowedValues: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a select attribute without allowedValues (undefined)', () => {
    const { allowedValues: _allowedValues, ...withoutAllowed } = validSelectAttribute;
    const result = attributeDefinitionSchema.safeParse(withoutAllowed);
    expect(result.success).toBe(true);
  });

  it('rejects a single-select attribute with empty allowedValues array', () => {
    const result = attributeDefinitionSchema.safeParse({
      ...validSelectAttribute,
      allowedValues: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a multi-select attribute with empty allowedValues array', () => {
    const result = attributeDefinitionSchema.safeParse({
      ...validMultiSelectAttribute,
      allowedValues: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a text attribute with empty allowedValues (no refinement for text)', () => {
    const result = attributeDefinitionSchema.safeParse({
      ...validTextAttribute,
      allowedValues: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an attribute with empty fieldName', () => {
    const result = attributeDefinitionSchema.safeParse({ ...validTextAttribute, fieldName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an attribute with empty displayLabel', () => {
    const result = attributeDefinitionSchema.safeParse({
      ...validTextAttribute,
      displayLabel: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an attribute with invalid dataType', () => {
    const result = attributeDefinitionSchema.safeParse({
      ...validTextAttribute,
      dataType: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('attributeSchemaSchema', () => {
  const validSchema = {
    subcategoryId: 'subcat_footwear',
    schemaVersion: 1,
    attributes: [
      {
        fieldName: 'brand',
        displayLabel: 'Brand',
        dataType: 'text',
        required: true,
        filterable: true,
        displayPriority: 1,
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  it('accepts a valid attribute schema', () => {
    const result = attributeSchemaSchema.safeParse(validSchema);
    expect(result.success).toBe(true);
  });

  it('rejects a schema with empty subcategoryId', () => {
    const result = attributeSchemaSchema.safeParse({ ...validSchema, subcategoryId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a schema with zero version', () => {
    const result = attributeSchemaSchema.safeParse({ ...validSchema, schemaVersion: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a schema with negative version', () => {
    const result = attributeSchemaSchema.safeParse({ ...validSchema, schemaVersion: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a schema with empty attributes array', () => {
    const result = attributeSchemaSchema.safeParse({ ...validSchema, attributes: [] });
    expect(result.success).toBe(false);
  });
});

describe('categoryTreeResponseSchema', () => {
  it('accepts a valid category tree response', () => {
    const result = categoryTreeResponseSchema.safeParse({
      categories: [
        {
          categoryId: 'cat_electronics',
          parentId: null,
          name: 'Electronics',
          slug: 'electronics',
          level: 1,
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty categories array', () => {
    const result = categoryTreeResponseSchema.safeParse({ categories: [] });
    expect(result.success).toBe(true);
  });
});

describe('subcategoryListResponseSchema', () => {
  it('accepts a valid subcategory list response', () => {
    const result = subcategoryListResponseSchema.safeParse({
      subcategories: [
        {
          categoryId: 'subcat_phones',
          parentId: 'cat_electronics',
          name: 'Phones',
          slug: 'phones',
          level: 2,
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty subcategories array', () => {
    const result = subcategoryListResponseSchema.safeParse({ subcategories: [] });
    expect(result.success).toBe(true);
  });
});

describe('attributeSchemaResponseSchema', () => {
  it('accepts a valid attribute schema response', () => {
    const result = attributeSchemaResponseSchema.safeParse({
      subcategoryId: 'subcat_footwear',
      schemaVersion: 1,
      attributes: [
        {
          fieldName: 'brand',
          displayLabel: 'Brand',
          dataType: 'text',
          required: true,
          filterable: true,
          displayPriority: 1,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a response with empty attributes array', () => {
    const result = attributeSchemaResponseSchema.safeParse({
      subcategoryId: 'subcat_footwear',
      schemaVersion: 1,
      attributes: [],
    });
    expect(result.success).toBe(true);
  });
});
