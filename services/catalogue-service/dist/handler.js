import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { listCategories, listProductsByCategory } from './service.js';
import { extractCategoryId, extractPaginationParams } from './validators.js';
/**
 * GET /catalogue/categories — returns all category IDs and names.
 *
 * Requirements: 6.1
 */
const rawListCategoriesHandler = async (_event) => {
    const categories = await listCategories();
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories }),
    };
};
export const listCategoriesHandler = middy(rawListCategoriesHandler).use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
/**
 * GET /catalogue/categories/{categoryId} — browse products by category.
 * Validates categoryId exists, queries GSI1 with PK = CATEGORY#{categoryId},
 * filters isDeleted = false, applies cursor-based pagination,
 * returns CatalogueListResponse.
 *
 * Returns 404 for unknown category, 200 with empty list when no products exist.
 *
 * Requirements: 6.1, 6.3, 6.4, 6.5, 6.7
 */
const rawListProductsByCategoryHandler = async (event) => {
    const categoryId = extractCategoryId(event);
    const { limit, cursor } = extractPaginationParams(event);
    const result = await listProductsByCategory(categoryId, limit, cursor);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
    };
};
export const listProductsByCategoryHandler = middy(rawListProductsByCategoryHandler).use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
//# sourceMappingURL=handler.js.map