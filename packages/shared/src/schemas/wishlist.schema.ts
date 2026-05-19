import { z } from 'zod';

/**
 * Add to wishlist request schema.
 * Requirement 7.2: productId is required.
 */
export const addToWishlistSchema = z.object({
  productId: z.string().min(1, { message: 'Product ID is required' }),
});

/**
 * Remove from wishlist params schema.
 */
export const removeFromWishlistSchema = z.object({
  productId: z.string().min(1, { message: 'Product ID is required' }),
});

export type AddToWishlistSchemaInput = z.input<typeof addToWishlistSchema>;
export type RemoveFromWishlistSchemaInput = z.input<typeof removeFromWishlistSchema>;
