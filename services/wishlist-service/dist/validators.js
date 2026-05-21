import { addToWishlistSchema, removeFromWishlistSchema } from '@blipzo/shared';
import createError from 'http-errors';
/**
 * Extracts the buyer ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 *
 * Requirement 7.9: Unauthenticated requests return 401.
 */
export function extractBuyerId(event) {
    const claims = event.requestContext.authorizer?.['claims'];
    const buyerId = claims?.['sub'] ?? event.requestContext.authorizer?.['sub'];
    if (!buyerId) {
        throw createError(401, 'Unauthorized: missing user identity');
    }
    return buyerId;
}
/**
 * Validates the add-to-wishlist request body against the shared addToWishlistSchema.
 * Returns a typed AddToWishlistSchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirement 7.2
 */
export function validateAddToWishlistInput(event) {
    const body = event.body;
    if (!body || typeof body !== 'object') {
        throw createError(400, 'Request body is required');
    }
    const result = addToWishlistSchema.safeParse(body);
    if (!result.success) {
        const fields = {};
        for (const issue of result.error.issues) {
            const path = issue.path.join('.');
            if (path) {
                fields[path] = issue.message;
            }
        }
        const error = createError(400, 'Validation failed');
        error['fields'] = fields;
        throw error;
    }
    return result.data;
}
/**
 * Extracts the productId from the path parameters for DELETE requests.
 * Validates against removeFromWishlistSchema.
 *
 * Requirement 7.5
 */
export function extractProductIdFromPath(event) {
    const productId = event.pathParameters?.['productId'];
    if (!productId) {
        throw createError(400, 'Product ID is required');
    }
    const result = removeFromWishlistSchema.safeParse({ productId });
    if (!result.success) {
        throw createError(400, 'Invalid product ID');
    }
    return result.data.productId;
}
//# sourceMappingURL=validators.js.map