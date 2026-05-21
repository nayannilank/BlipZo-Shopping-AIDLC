import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { getWishlist, addToWishlist, removeFromWishlist } from './service.js';
import { extractBuyerId, validateAddToWishlistInput, extractProductIdFromPath } from './validators.js';
/**
 * GET /wishlist — returns the buyer's wishlist with enriched product data.
 * Queries wishlists table with PK = BUYER#{buyerId}, batch-gets product details,
 * enriches each item with name, price, primaryImageUrl, isAvailable.
 *
 * Requirements: 7.1, 7.7, 7.8, 7.9
 */
const rawGetWishlistHandler = async (event) => {
    const buyerId = extractBuyerId(event);
    const wishlist = await getWishlist(buyerId);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(wishlist),
    };
};
export const getWishlistHandler = middy(rawGetWishlistHandler).use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
/**
 * POST /wishlist/items — adds a product to the buyer's wishlist.
 * Verifies product exists in Products table (else 404).
 * Uses TransactWriteItems to check counter item SK=COUNT < 200
 * and PutItem the wishlist entry atomically.
 * If already present, returns current wishlist unchanged.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.9
 */
const rawAddToWishlistHandler = async (event) => {
    const buyerId = extractBuyerId(event);
    const { productId } = validateAddToWishlistInput(event);
    const wishlist = await addToWishlist(buyerId, productId);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(wishlist),
    };
};
export const addToWishlistHandler = middy(rawAddToWishlistHandler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
/**
 * DELETE /wishlist/items/{productId} — removes a product from the buyer's wishlist.
 * DeleteItem is idempotent — no error if not present.
 * Returns the updated wishlist.
 *
 * Requirements: 7.5, 7.6, 7.9
 */
const rawRemoveFromWishlistHandler = async (event) => {
    const buyerId = extractBuyerId(event);
    const productId = extractProductIdFromPath(event);
    const wishlist = await removeFromWishlist(buyerId, productId);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(wishlist),
    };
};
export const removeFromWishlistHandler = middy(rawRemoveFromWishlistHandler).use(httpErrorHandler({
    fallbackMessage: 'An unexpected error occurred. Please try again later.',
}));
//# sourceMappingURL=handler.js.map