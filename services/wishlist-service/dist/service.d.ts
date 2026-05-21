import type { WishlistResponse } from '@blipzo/shared';
/**
 * Retrieves the buyer's wishlist with enriched product data.
 * Queries the wishlists table for all items, then batch-gets product details
 * from the products table to enrich each item with name, price, primaryImageUrl,
 * and isAvailable (false if product isDeleted = true).
 *
 * Requirements: 7.1, 7.7, 7.8
 */
export declare function getWishlist(buyerId: string): Promise<WishlistResponse>;
/**
 * Adds a product to the buyer's wishlist.
 * Verifies the product exists in the Products table (else 404).
 * Uses TransactWriteItems to atomically check the counter item SK=COUNT < 200
 * and PutItem the wishlist entry.
 * If the product is already present, returns the current wishlist unchanged.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export declare function addToWishlist(buyerId: string, productId: string): Promise<WishlistResponse>;
/**
 * Removes a product from the buyer's wishlist.
 * Uses DeleteItem (idempotent — no error if not present).
 * Decrements the counter if the item existed.
 * Returns the updated wishlist.
 *
 * Requirements: 7.5, 7.6
 */
export declare function removeFromWishlist(buyerId: string, productId: string): Promise<WishlistResponse>;
//# sourceMappingURL=service.d.ts.map