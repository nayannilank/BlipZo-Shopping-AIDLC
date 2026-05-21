import type { CartResponse } from '@blipzo/shared';
/**
 * Adds or updates a cart item. If quantity is 0, removes the item.
 * Verifies product exists and quantity ≤ stockQuantity.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.8
 */
export declare function putCartItem(buyerId: string, productId: string, quantity: number): Promise<CartResponse>;
/**
 * Retrieves the buyer's cart with enriched product data, subtotals, and total.
 * Queries the carts table for all items, then batch-gets product details
 * from the products table to enrich each item.
 *
 * Requirements: 8.5
 */
export declare function getCart(buyerId: string): Promise<CartResponse>;
/**
 * Removes a single item from the buyer's cart.
 * DeleteItem is idempotent — no error if not present.
 * Returns the updated cart.
 *
 * Requirement 8.3
 */
export declare function removeCartItem(buyerId: string, productId: string): Promise<CartResponse>;
/**
 * Clears all items from the buyer's cart using BatchWriteItem.
 * Returns an empty cart response.
 *
 * Requirement 8.6
 */
export declare function clearCart(buyerId: string): Promise<CartResponse>;
//# sourceMappingURL=service.d.ts.map