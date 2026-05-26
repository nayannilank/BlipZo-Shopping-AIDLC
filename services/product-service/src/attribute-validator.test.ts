import type { AttributeDefinition } from '@blipzo/shared';
import { describe, it, expect } from 'vitest';

import { validateDynamicAttributes } from './attribute-validator.js';

/**
 * Unit tests for the attribute-validator module.
 * Tests validation of dynamic attributes against attribute schemas.
 *
 * Requirements: 3.5, 3.6, 3.7
 */

const footwearSchema: AttributeDefinition[] = [
  {
    fieldName: 'brand',
    displayLabel: 'Brand',
    dataType: 'text',
    required: true,
    filterable: true,
    displayPriority: 1,
  },
  {
    fieldName: 'availableSizes',
    displayLabel: 'Available Sizes',
    dataType: 'multi-select',
    required: true,
    allowedValues: [
      'IND 1',
      'IND 2',
      'IND 3',
      'IND 4',
      'IND 5',
      'IND 6',
      'IND 7',
      'IND 8',
      'IND 9',
      'IND 10',
      'IND 11',
      'IND 12',
    ],
    filterable: true,
    displayPriority: 2,
  },
  {
    fieldName: 'gender',
    displayLabel: 'Gender',
    dataType: 'single-select',
    required: true,
    allowedValues: ['Male', 'Female', 'Unisex'],
    filterable: true,
    displayPriority: 3,
  },
  {
    fieldName: 'ageGroup',
    displayLabel: 'Age Group',
    dataType: 'single-select',
    required: true,
    allowedValues: ['Adult', 'Kids'],
    filterable: true,
    displayPriority: 4,
  },
  {
    fieldName: 'availableColours',
    displayLabel: 'Available Colours',
    dataType: 'multi-select',
    required: true,
    allowedValues: null,
    filterable: true,
    displayPriority: 5,
  },
  {
    fieldName: 'material',
    displayLabel: 'Material',
    dataType: 'text',
    required: false,
    filterable: false,
    displayPriority: 6,
  },
  {
    fieldName: 'soleType',
    displayLabel: 'Sole Type',
    dataType: 'text',
    required: false,
    filterable: false,
    displayPriority: 7,
  },
];

describe('validateDynamicAttributes', () => {
  describe('valid inputs', () => {
    it('should accept valid footwear attributes with all fields', () => {
      const attributes = {
        brand: 'Nike',
        availableSizes: ['IND 7', 'IND 8', 'IND 9'],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Black', 'White'],
        material: 'Mesh',
        soleType: 'Rubber',
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(true);
      expect(result.fields).toEqual({});
    });

    it('should accept valid attributes with optional fields omitted', () => {
      const attributes = {
        brand: 'Adidas',
        availableSizes: ['IND 5', 'IND 6'],
        gender: 'Female',
        ageGroup: 'Adult',
        availableColours: ['Red', 'Blue'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(true);
      expect(result.fields).toEqual({});
    });
  });

  describe('required field validation', () => {
    it('should reject when required text field is missing', () => {
      const attributes = {
        availableSizes: ['IND 7'],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Black'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      expect(result.fields['dynamicAttributes.brand']).toBeDefined();
    });

    it('should reject when required text field is empty string', () => {
      const attributes = {
        brand: '',
        availableSizes: ['IND 7'],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Black'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      expect(result.fields['dynamicAttributes.brand']).toContain('required');
    });

    it('should reject when required multi-select field is empty array', () => {
      const attributes = {
        brand: 'Nike',
        availableSizes: [],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Black'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      expect(result.fields['dynamicAttributes.availableSizes']).toBeDefined();
    });
  });

  describe('data type validation', () => {
    it('should reject number where text is expected', () => {
      const attributes = {
        brand: 123,
        availableSizes: ['IND 7'],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Black'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      expect(result.fields['dynamicAttributes.brand']).toBeDefined();
    });

    it('should validate number data type correctly', () => {
      const schema: AttributeDefinition[] = [
        {
          fieldName: 'displaySize',
          displayLabel: 'Display Size',
          dataType: 'number',
          required: true,
          filterable: false,
          displayPriority: 1,
        },
      ];

      const validResult = validateDynamicAttributes({ displaySize: 6.5 }, schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = validateDynamicAttributes({ displaySize: 'six' }, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.fields['dynamicAttributes.displaySize']).toBeDefined();
    });

    it('should validate boolean data type correctly', () => {
      const schema: AttributeDefinition[] = [
        {
          fieldName: 'isWaterproof',
          displayLabel: 'Waterproof',
          dataType: 'boolean',
          required: true,
          filterable: false,
          displayPriority: 1,
        },
      ];

      const validResult = validateDynamicAttributes({ isWaterproof: true }, schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = validateDynamicAttributes({ isWaterproof: 'yes' }, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.fields['dynamicAttributes.isWaterproof']).toBeDefined();
    });
  });

  describe('allowedValues validation', () => {
    it('should reject single-select value not in allowedValues', () => {
      const attributes = {
        brand: 'Nike',
        availableSizes: ['IND 7'],
        gender: 'Other',
        ageGroup: 'Adult',
        availableColours: ['Black'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      expect(result.fields['dynamicAttributes.gender']).toContain('Allowed values');
    });

    it('should reject multi-select value not in allowedValues', () => {
      const attributes = {
        brand: 'Nike',
        availableSizes: ['IND 7', 'IND 99'],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Black'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      expect(result.fields['dynamicAttributes.availableSizes']).toBeDefined();
    });

    it('should accept any string values for multi-select without allowedValues', () => {
      const attributes = {
        brand: 'Nike',
        availableSizes: ['IND 7'],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Custom Color', 'Another Color'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(true);
    });
  });

  describe('field-level error messages', () => {
    it('should return errors with dynamicAttributes prefix', () => {
      const attributes = {};

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      const fieldKeys = Object.keys(result.fields);
      for (const key of fieldKeys) {
        expect(key).toMatch(/^dynamicAttributes\./);
      }
    });

    it('should return multiple field errors for multiple violations', () => {
      const attributes = {
        brand: '',
        availableSizes: [],
        gender: 'Invalid',
        ageGroup: 'Teen',
        availableColours: ['Black'],
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(false);
      expect(Object.keys(result.fields).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('optional fields', () => {
    it('should not require optional fields', () => {
      const attributes = {
        brand: 'Nike',
        availableSizes: ['IND 7'],
        gender: 'Male',
        ageGroup: 'Adult',
        availableColours: ['Black'],
        // material and soleType are optional and omitted
      };

      const result = validateDynamicAttributes(attributes, footwearSchema);

      expect(result.valid).toBe(true);
    });

    it('should validate optional fields when provided', () => {
      const schema: AttributeDefinition[] = [
        {
          fieldName: 'optionalNumber',
          displayLabel: 'Optional Number',
          dataType: 'number',
          required: false,
          filterable: false,
          displayPriority: 1,
        },
      ];

      const validResult = validateDynamicAttributes({ optionalNumber: 42 }, schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = validateDynamicAttributes({ optionalNumber: 'not a number' }, schema);
      expect(invalidResult.valid).toBe(false);
    });
  });
});
