import type { CatalogueListResponse, ProductRecord } from '@blipzo/shared';
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
/**
 * Retrieves a product by ID from the Products table.
 * Returns 404 if the product does not exist or is marked as deleted.
 * Returns the full ProductRecord including sellerPolicy summary.
 *
 * Requirements: 6.2, 6.3
 */
export declare function getProductDetail(productId: string): Promise<ProductRecord>;
/**
 * Searches products using GSI1 with a FilterExpression that checks
 * if searchTokens contains the lowercase query.
 * Returns paginated CatalogueListResponse.
 *
 * For the academic scope, search scans GSI1 across all categories
 * with a filter on searchTokens. In production, this would use OpenSearch.
 *
 * Requirements: 6.6, 6.7
 */
export declare function searchProducts(query: string, limit?: number, cursor?: string): Promise<CatalogueListResponse>;
//# sourceMappingURL=service.d.ts.map