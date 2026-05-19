import { z } from 'zod';
/**
 * Add to wishlist request schema.
 * Requirement 7.2: productId is required.
 */
export declare const addToWishlistSchema: z.ZodObject<{
    productId: z.ZodString;
}, z.core.$strip>;
/**
 * Remove from wishlist params schema.
 */
export declare const removeFromWishlistSchema: z.ZodObject<{
    productId: z.ZodString;
}, z.core.$strip>;
export type AddToWishlistSchemaInput = z.input<typeof addToWishlistSchema>;
export type RemoveFromWishlistSchemaInput = z.input<typeof removeFromWishlistSchema>;
//# sourceMappingURL=wishlist.schema.d.ts.map