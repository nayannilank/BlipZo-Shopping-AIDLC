# Implementation Plan: Category-Based Product Management

## Overview

This plan implements a hierarchical two-level category taxonomy for the BlipZo Shopping Platform. It replaces the flat `categories` string array with a structured Category → Subcategory → Products system featuring dynamic attribute schemas, schema-driven product forms, and category-specific filtering. Implementation proceeds from shared types and infrastructure through backend services to frontend UI components.

## Tasks

- [x] 1. Set up shared types and validation schemas
  - [x] 1.1 Create category type definitions in shared package
    - Create `packages/shared/src/types/category.ts` with `CategoryNode`, `AttributeDataType`, `AttributeDefinition`, `AttributeSchema`, `CategoryTreeResponse`, `SubcategoryListResponse`, `AttributeSchemaResponse` interfaces
    - _Requirements: 1.6, 2.1, 2.2_

  - [x] 1.2 Extend product type definitions in shared package
    - Modify `packages/shared/src/types/product.ts` to add `subcategoryId`, `dynamicAttributes`, `schemaVersion`, `categoryId` fields to `ProductRecord`
    - Add `previewAttributes` to product list item types
    - Retain legacy `categories?: string[]` field for backward compatibility
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.3 Create Zod validation schemas for category operations
    - Create `packages/shared/src/schemas/category.schema.ts` with schemas for category node validation, attribute definition validation, and attribute schema validation
    - _Requirements: 1.6, 2.1, 2.2_

  - [x] 1.4 Extend product Zod schemas for dynamic attributes
    - Modify `packages/shared/src/schemas/product.schema.ts` to add `categoryId`, `subcategoryId`, `dynamicAttributes` validation to create/update product schemas
    - _Requirements: 3.5, 3.6, 7.1_

  - [ ]\* 1.5 Write property tests for category and schema types
    - **Property 2: Category node structural completeness**
    - **Property 3: Attribute schema structural validity**
    - **Validates: Requirements 1.6, 2.1, 2.2**

- [x] 2. Checkpoint - Ensure shared package builds and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Set up CDK infrastructure for categories table redesign
  - [x] 3.1 Redesign categories table in CDK
    - Modify the existing categories table CDK construct to use composite keys: `PK = CAT#{categoryId}`, `SK = METADATA | SCHEMA#v{version}`
    - Add GSI `ParentIndex` with `GSI1PK = PARENT#{parentId}` and `GSI1SK = NAME#{name}`
    - _Requirements: 1.1, 1.6_

  - [x] 3.2 Update products table GSI1 prefix in CDK
    - Change GSI1 partition key prefix from `CATEGORY#` to `SUBCATEGORY#` for new product items
    - Ensure GSI1SK remains `CREATED#{timestamp}` for chronological sorting
    - _Requirements: 7.5, 5.3_

  - [x] 3.3 Create category seed data file
    - Create `infra/cdk/seed/category-seed-data.ts` with all 5 top-level categories and 16 subcategories as defined in the design
    - Include attribute schemas for Footwear, Phones, Laptops, Shirts, and Books subcategories
    - _Requirements: 1.4, 1.5, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 Create CDK custom resource Lambda for seeding
    - Create a Lambda function that runs on CDK deploy to seed category nodes and attribute schemas into the categories table
    - Use `PutItem` with `ConditionExpression: attribute_not_exists(PK)` for idempotency
    - _Requirements: 1.4, 1.5_

- [x] 4. Implement Catalogue Service — Category Tree Operations
  - [x] 4.1 Create category-tree module in catalogue service
    - Create `services/catalogue-service/src/category-tree.ts` with functions: `listCategories()` (query ParentIndex where GSI1PK = `PARENT#ROOT`), `listSubcategories(categoryId)` (query ParentIndex where GSI1PK = `PARENT#{categoryId}`)
    - Filter results to only return nodes where `isActive = true`
    - _Requirements: 1.2, 1.3, 5.1, 5.2_

  - [x] 4.2 Create attribute-schema module in catalogue service
    - Create `services/catalogue-service/src/attribute-schema.ts` with function: `getAttributeSchema(subcategoryId)` that fetches the latest schema version item (`SK begins_with SCHEMA#`) for a given subcategory
    - Include in-memory caching within Lambda invocation
    - _Requirements: 2.1, 2.2, 2.8_

  - [x] 4.3 Add category API routes to catalogue service handler
    - Extend `services/catalogue-service/src/handler.ts` with routes:
      - `GET /catalogue/categories` → `listCategories()`
      - `GET /catalogue/categories/{categoryId}/subcategories` → `listSubcategories(categoryId)`
      - `GET /catalogue/categories/{subcategoryId}/schema` → `getAttributeSchema(subcategoryId)`
    - Add request validation and error handling
    - _Requirements: 1.2, 1.3, 2.1_

  - [ ]\* 4.4 Write unit tests for category-tree module
    - Test listCategories returns only active top-level categories
    - Test listSubcategories returns correct children for a given parent
    - Test error handling for non-existent categories
    - _Requirements: 1.2, 1.3, 5.1_

  - [ ]\* 4.5 Write property test for active-only category filtering
    - **Property 10: Only active categories are returned in browsing**
    - **Validates: Requirements 5.1**

- [x] 5. Implement Catalogue Service — Product Browsing with Filters
  - [x] 5.1 Create product-browse module in catalogue service
    - Create `services/catalogue-service/src/product-browse.ts` with function: `listProductsBySubcategory(subcategoryId, options)` that queries GSI1 with `GSI1PK = SUBCATEGORY#{subcategoryId}`, sorted by `GSI1SK` descending (newest first)
    - Implement cursor-based pagination using DynamoDB `LastEvaluatedKey` / `ExclusiveStartKey`
    - Add `FilterExpression` for: price range (minPrice/maxPrice), dynamic attribute filters (single-select equality, multi-select contains), and `isDeleted <> true`
    - _Requirements: 5.3, 5.4, 5.6, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Add product browsing API route to catalogue service handler
    - Extend handler with route: `GET /catalogue/categories/{subcategoryId}/products`
    - Parse query parameters: `limit`, `cursor`, `minPrice`, `maxPrice`, and dynamic attribute filter params
    - Validate filter params against the subcategory's schema (only filterable attributes allowed)
    - Return response with `items`, `nextCursor`, `total`, and `filters` (facet counts)
    - _Requirements: 5.3, 5.4, 6.1, 6.5, 6.6, 6.7_

  - [ ]\* 5.3 Write property tests for product browsing
    - **Property 11: Subcategory products are sorted by creation date descending**
    - **Property 12: Soft-deleted products are excluded from all browsing results**
    - **Property 13: Filter correctness — all results satisfy all applied filters**
    - **Property 14: Filterable attributes match schema definition**
    - **Validates: Requirements 5.3, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5**

  - [ ]\* 5.4 Write unit tests for product-browse module
    - Test pagination with cursor encoding/decoding
    - Test price range boundary cases (min=max, min=0)
    - Test empty result set when no products match filters
    - Test filter validation rejects non-filterable attributes
    - _Requirements: 5.3, 5.4, 6.5, 6.7_

- [x] 6. Implement Product Service — Dynamic Attribute Validation
  - [x] 6.1 Create attribute-validator module in product service
    - Create `services/product-service/src/attribute-validator.ts` with function: `validateDynamicAttributes(dynamicAttributes, schema)` that builds a Zod schema from the `AttributeDefinition[]` and validates the submitted attributes
    - Enforce: required fields present, correct data types, select values within allowedValues
    - Return field-level error messages on validation failure
    - _Requirements: 3.5, 3.6, 3.7_

  - [x] 6.2 Extend product creation to support dynamic attributes
    - Modify `services/product-service/src/service.ts` to:
      - Accept `categoryId`, `subcategoryId`, `dynamicAttributes` in create product flow
      - Fetch attribute schema from categories table for the given subcategoryId
      - Validate dynamicAttributes using attribute-validator
      - Store `dynamicAttributes` map, `categoryId`, `subcategoryId`, `schemaVersion` on product record
      - Set `GSI1PK = SUBCATEGORY#{subcategoryId}` and `GSI1SK = CREATED#{timestamp}`
    - _Requirements: 3.6, 3.8, 7.1, 7.2, 7.3, 7.5_

  - [x] 6.3 Extend product update to validate dynamic attributes
    - Modify product update flow to:
      - Reject changes to `categoryId` or `subcategoryId` with 400 CATEGORY_IMMUTABLE error
      - Validate updated `dynamicAttributes` against current schema version
      - Update `schemaVersion` on successful save if schema has changed
    - _Requirements: 8.3, 8.4, 8.5_

  - [x] 6.4 Extend product detail endpoint to include display labels
    - Modify `GET /products/{productId}` to fetch the attribute schema and enrich the response with `displayLabel` for each dynamic attribute
    - Omit optional attributes with null/undefined values from the response
    - _Requirements: 4.4, 4.5, 4.6_

  - [x] 6.5 Implement search token generation with dynamic attributes
    - Modify product creation/update to generate `searchTokens` string that includes: product name, description, and text-type dynamic attribute values (brand, model, author) in lowercase
    - _Requirements: 9.4_

  - [ ]\* 6.6 Write property tests for attribute validation
    - **Property 6: Valid dynamic attributes are accepted**
    - **Property 7: Invalid dynamic attributes produce field-level errors**
    - **Property 8: Product creation round-trip preserves dynamic attributes**
    - **Property 15: Category and subcategory are immutable after product creation**
    - **Property 16: Search tokens include dynamic attribute text values**
    - **Validates: Requirements 3.5, 3.6, 3.7, 3.8, 7.1, 7.4, 8.3, 9.4**

  - [ ]\* 6.7 Write unit tests for attribute-validator
    - Test Footwear schema with valid/invalid inputs
    - Test Phones schema with valid/invalid inputs
    - Test Books schema with valid/invalid inputs
    - Test field-level error messages for each violation type
    - _Requirements: 3.5, 3.6, 3.7_

- [~] 7. Checkpoint - Ensure all backend services build and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Web App — Seller Add Product Form
  - [x] 8.1 Create CategorySelector component
    - Create `apps/web/src/pages/Products/components/CategorySelector.tsx`
    - Fetch categories on mount via `GET /catalogue/categories`
    - On category selection, fetch subcategories via `GET /catalogue/categories/{categoryId}/subcategories`
    - Emit selected `categoryId` and `subcategoryId` to parent
    - Use TanStack Query for data fetching
    - _Requirements: 3.1, 3.2_

  - [x] 8.2 Create FormFieldRenderer component
    - Create `apps/web/src/pages/Products/components/FormFieldRenderer.tsx`
    - Render appropriate input control based on `AttributeDefinition.dataType`:
      - `text` → text input
      - `number` → number input
      - `single-select` → dropdown/select
      - `multi-select` → multi-select control (checkboxes or tag input)
      - `boolean` → toggle switch
    - Support required field indicators and validation error display
    - _Requirements: 3.3, 3.4_

  - [x] 8.3 Create DynamicAttributeForm component
    - Create `apps/web/src/pages/Products/components/DynamicAttributeForm.tsx`
    - Fetch attribute schema via `GET /catalogue/categories/{subcategoryId}/schema` when subcategory is selected
    - Render form fields using FormFieldRenderer for each attribute in the schema, ordered by `displayPriority`
    - Integrate with React Hook Form for form state and validation
    - Enforce required field validation before submission
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 8.4 Update AddProductPage to integrate category-aware flow
    - Modify `apps/web/src/pages/Products/AddProductPage.tsx` (or create if not exists)
    - Implement multi-step form: Step 1 (CategorySelector) → Step 2 (DynamicAttributeForm) → Step 3 (CommonFieldsForm: name, description, price, stock, images)
    - On submit, POST to `/products` with `categoryId`, `subcategoryId`, `dynamicAttributes`, and common fields
    - Display field-level validation errors from API response
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.9_

  - [x] 8.5 Update product edit form to pre-populate dynamic attributes
    - Modify the edit product page to fetch existing product data and pre-populate the DynamicAttributeForm with current `dynamicAttributes` values
    - Disable category/subcategory selection on edit (immutable after creation)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]\* 8.6 Write property test for FormFieldRenderer
    - **Property 5: Form field rendering matches schema data types**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]\* 8.7 Write unit tests for seller product form components
    - Test CategorySelector renders categories and subcategories
    - Test DynamicAttributeForm renders correct fields for a given schema
    - Test required field validation prevents submission
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 9. Implement Web App — Buyer Category Browsing
  - [x] 9.1 Create CategoriesPage and SubcategoriesPage
    - Create `apps/web/src/pages/Browse/CategoriesPage.tsx` — displays top-level category grid with icons and names
    - Create `apps/web/src/pages/Browse/SubcategoriesPage.tsx` — displays subcategory list for a selected category
    - Add breadcrumb navigation showing category path
    - Use TanStack Query for data fetching
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 9.2 Create SubcategoryProductsPage with pagination
    - Create `apps/web/src/pages/Browse/SubcategoryProductsPage.tsx`
    - Fetch products via `GET /catalogue/categories/{subcategoryId}/products` with cursor-based pagination
    - Display product grid with: name, price, primary image, average rating, seller name, preview attributes
    - Implement "Load More" or infinite scroll using cursor pagination
    - Include breadcrumb: Category > Subcategory
    - _Requirements: 5.3, 5.4, 5.5, 9.1, 9.2_

  - [x] 9.3 Create DynamicFilterPanel component
    - Create `apps/web/src/pages/Browse/components/DynamicFilterPanel.tsx`
    - Fetch attribute schema for the current subcategory and render filter controls for attributes marked `filterable: true`
    - Render single-select filters as radio groups, multi-select as checkboxes
    - Include price range filter (min/max inputs)
    - Display filter option counts from API response
    - Apply filters by updating query parameters and refetching products
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 9.4 Create CategoryCard and SubcategoryCard components
    - Create `apps/web/src/pages/Browse/components/CategoryCard.tsx` and `SubcategoryCard.tsx`
    - Display category/subcategory name, icon, and link to next level
    - _Requirements: 5.1, 5.2_

  - [ ]\* 9.5 Write unit tests for buyer browsing components
    - Test CategoriesPage renders category cards
    - Test DynamicFilterPanel renders correct filter controls from schema
    - Test SubcategoryProductsPage handles pagination
    - Test empty state when no products match filters
    - _Requirements: 5.1, 5.3, 6.1, 6.7_

- [x] 10. Implement Web App — Product Detail with Dynamic Attributes
  - [x] 10.1 Update Product Detail Page to display dynamic attributes
    - Modify the existing product detail page to render a "Specifications" section
    - Display each dynamic attribute using its `displayLabel` from the schema
    - Omit optional attributes with no value
    - Show category name and subcategory name in breadcrumb
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]\* 10.2 Write property test for product detail rendering
    - **Property 9: Product detail rendering uses display labels and omits empty optionals**
    - **Validates: Requirements 4.4, 4.6**

- [ ] 11. Checkpoint - Ensure web app builds and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Search Integration with Category Context
  - [x] 12.1 Update search results to include category context and preview attributes
    - Modify the catalogue service search endpoint to include `categoryName`, `subcategoryName`, and up to 3 `previewAttributes` (selected by lowest `displayPriority`) in each search result item
    - Support filtering search results by categoryId or subcategoryId query parameter
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]\* 12.2 Write property test for search result enrichment
    - **Property 17: Search results include category context and preview attributes**
    - **Validates: Requirements 9.1, 9.2**

- [x] 13. Wire API Gateway routes for new endpoints
  - [x] 13.1 Add API Gateway routes in CDK for catalogue category endpoints
    - Add routes for: `GET /catalogue/categories/{categoryId}/subcategories`, `GET /catalogue/categories/{subcategoryId}/schema`, `GET /catalogue/categories/{subcategoryId}/products`
    - Configure appropriate CORS, throttling, and request validation
    - _Requirements: 1.2, 1.3, 2.1, 5.3, 6.1_

  - [x] 13.2 Update product service API Gateway routes for extended payload
    - Ensure `POST /products` and `PATCH /products/{productId}` routes accept the extended request body with `categoryId`, `subcategoryId`, and `dynamicAttributes`
    - _Requirements: 3.6, 3.8, 8.4_

- [x] 14. Final checkpoint - Ensure all tests pass and infrastructure deploys
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The mobile app (React Native/Expo) mirrors the web structure and can be implemented as a follow-up phase using the same API contracts
- The migration script for existing products (backfilling subcategoryId) is a separate operational task not included here

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 5, "tasks": ["5.1", "6.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["6.6", "6.7", "8.1", "8.2"] },
    { "id": 9, "tasks": ["8.3", "8.4", "9.1", "9.4"] },
    { "id": 10, "tasks": ["8.5", "8.6", "8.7", "9.2", "9.3"] },
    { "id": 11, "tasks": ["9.5", "10.1", "12.1"] },
    { "id": 12, "tasks": ["10.2", "12.2", "13.1", "13.2"] }
  ]
}
```
