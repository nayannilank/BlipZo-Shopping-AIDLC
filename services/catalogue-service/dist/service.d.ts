import type { CatalogueListResponse } from '@blipzo/shared';
export interface CategoryRecord {
    categoryId: string;
    name: string;
}
/**
 * Retrieves all categories from the Categories table.
 * Returns an array of category IDs and names.
 *
 * Requirement 6.1
 */
export declare function listCategories(): Promise<CategoryRecord[]>;
/**
 * Validates that a category exists in the Categories table.
 * Throws 404 if the category does not exist.
 *
 * Requirement 6.4
 */
export declare function validateCategoryExists(categoryId: string): Promise<void>;
/**
 * Lists products in a category using GSI1 (CategoryByDate).
 * Filters out deleted products, applies cursor-based pagination,
 * and sorts by most recently listed first.
 *
 * Requirements: 6.1, 6.5, 6.7
 */
export declare function listProductsByCategory(categoryId: string, limit?: number, cursor?: string): Promise<CatalogueListResponse>;
//# sourceMappingURL=service.d.ts.map