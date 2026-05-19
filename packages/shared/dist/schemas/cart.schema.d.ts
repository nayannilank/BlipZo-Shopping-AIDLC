import { z } from 'zod';
/**
 * Cart item (add/update) request schema.
 * Requirement 8.1, 8.3: quantity 0-999 (0 triggers removal).
 */
export declare const cartItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
}, z.core.$strip>;
/**
 * Remove from cart params schema.
 */
export declare const removeFromCartSchema: z.ZodObject<{
    productId: z.ZodString;
}, z.core.$strip>;
export type CartItemSchemaInput = z.input<typeof cartItemSchema>;
export type RemoveFromCartSchemaInput = z.input<typeof removeFromCartSchema>;
//# sourceMappingURL=cart.schema.d.ts.map