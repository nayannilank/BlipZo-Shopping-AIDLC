/**
 * Category type definitions for the hierarchical category taxonomy.
 *
 * Supports a two-level hierarchy (Category → Subcategory) with
 * subcategory-specific attribute schemas for dynamic product attributes.
 */

/**
 * Represents a node in the category tree (either a top-level category or subcategory).
 */
export interface CategoryNode {
  categoryId: string;
  parentId: string | null;
  name: string;
  slug: string;
  level: 1 | 2;
  isActive: boolean;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Supported data types for dynamic attribute definitions.
 */
export type AttributeDataType = 'text' | 'number' | 'single-select' | 'multi-select' | 'boolean';

/**
 * Defines a single attribute within a subcategory's attribute schema.
 */
export interface AttributeDefinition {
  fieldName: string;
  displayLabel: string;
  dataType: AttributeDataType;
  required: boolean;
  allowedValues?: string[] | null;
  filterable: boolean;
  displayPriority: number;
}

/**
 * The full attribute schema for a subcategory, including version tracking.
 */
export interface AttributeSchema {
  subcategoryId: string;
  schemaVersion: number;
  attributes: AttributeDefinition[];
  createdAt: string;
}

/**
 * Response shape for the category tree endpoint (top-level categories).
 */
export interface CategoryTreeResponse {
  categories: CategoryNode[];
}

/**
 * Response shape for the subcategory list endpoint.
 */
export interface SubcategoryListResponse {
  subcategories: CategoryNode[];
}

/**
 * Response shape for the attribute schema endpoint.
 */
export interface AttributeSchemaResponse {
  subcategoryId: string;
  schemaVersion: number;
  attributes: AttributeDefinition[];
}
