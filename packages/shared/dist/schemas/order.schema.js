import { z } from 'zod';
/**
 * Checkout request schema.
 * Requirement 10.1: addressId, paymentMethod (UPI/CreditCard/DebitCard/CashOnDelivery).
 */
export const checkoutSchema = z.object({
    addressId: z.string().min(1, { message: 'Address ID is required' }),
    paymentMethod: z.enum(['UPI', 'CreditCard', 'DebitCard', 'CashOnDelivery'], {
        message: 'Payment method must be one of: UPI, CreditCard, DebitCard, CashOnDelivery',
    }),
    paymentDetails: z
        .object({
        mockCardLast4: z.string().optional(),
        mockUpiRef: z.string().optional(),
    })
        .optional(),
});
/**
 * Return/exchange request schema.
 * Requirement 13.1: type must be Return or Exchange.
 */
export const returnExchangeRequestSchema = z.object({
    type: z.enum(['Return', 'Exchange'], {
        message: 'Type must be either "Return" or "Exchange"',
    }),
});
//# sourceMappingURL=order.schema.js.map