import { z } from 'zod';
/**
 * Cart item (add/update) request schema.
 * Requirement 8.1, 8.3: quantity 0-999 (0 triggers removal).
 */
export const cartItemSchema = z.object({
    productId: z.string().min(1, { message: 'Product ID is required' }),
    quantity: z
        .number()
        .int({ message: 'Quantity must be an integer' })
        .min(0, { message: 'Quantity must be at least 0' })
        .max(999, { message: 'Quantity must be at most 999' }),
});
/**
 * Remove from cart params schema.
 */
export const removeFromCartSchema = z.object({
    productId: z.string().min(1, { message: 'Product ID is required' }),
});
//# sourceMappingURL=cart.schema.js.map