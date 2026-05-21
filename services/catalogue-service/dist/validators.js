import createError from 'http-errors';
/**
 * Extracts the categoryId from the path parameters.
 * Throws 400 if not present.
 *
 * Requirement 6.4
 */
export function extractCategoryId(event) {
    const categoryId = event.pathParameters?.['categoryId'];
    if (!categoryId) {
        throw createError(400, 'Category ID is required');
    }
    return categoryId;
}
/**
 * Extracts the productId from the path parameters.
 * Throws 400 if not present.
 */
export function extractProductId(event) {
    const productId = event.pathParameters?.['productId'];
    if (!productId) {
        throw createError(400, 'Product ID is required');
    }
    return productId;
}
/**
 * Extracts pagination parameters from query string.
 * Limit is clamped to 1-20 (default 20) per Requirement 6.5.
 * Cursor is an optional base64-encoded pagination token.
 */
export function extractPaginationParams(event) {
    const limitStr = event.queryStringParameters?.['limit'];
    const cursorParam = event.queryStringParameters?.['cursor'];
    let limit = 20;
    if (limitStr) {
        const parsed = parseInt(limitStr, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
            limit = parsed;
        }
    }
    const result = { limit };
    if (cursorParam) {
        result.cursor = cursorParam;
    }
    return result;
}
/**
 * Extracts and validates search query parameters.
 * Query must be 1-100 non-whitespace-only characters.
 *
 * Requirement 6.6
 */
export function extractSearchParams(event) {
    const q = event.queryStringParameters?.['q'];
    if (!q || q.trim().length === 0) {
        throw createError(400, 'Search query is required and must not be whitespace only');
    }
    if (q.length > 100) {
        throw createError(400, 'Search query must be at most 100 characters');
    }
    const { limit, cursor } = extractPaginationParams(event);
    const result = { query: q, limit };
    if (cursor) {
        result.cursor = cursor;
    }
    return result;
}
//# sourceMappingURL=validators.js.map