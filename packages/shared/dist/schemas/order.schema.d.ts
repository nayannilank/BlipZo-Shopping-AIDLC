import { z } from 'zod';
/**
 * Checkout request schema.
 * Requirement 10.1: addressId, paymentMethod (UPI/CreditCard/DebitCard/CashOnDelivery).
 */
export declare const checkoutSchema: z.ZodObject<{
    addressId: z.ZodString;
    paymentMethod: z.ZodEnum<{
        UPI: "UPI";
        CreditCard: "CreditCard";
        DebitCard: "DebitCard";
        CashOnDelivery: "CashOnDelivery";
    }>;
    paymentDetails: z.ZodOptional<z.ZodObject<{
        mockCardLast4: z.ZodOptional<z.ZodString>;
        mockUpiRef: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Return/exchange request schema.
 * Requirement 13.1: type must be Return or Exchange.
 */
export declare const returnExchangeRequestSchema: z.ZodObject<{
    type: z.ZodEnum<{
        Return: "Return";
        Exchange: "Exchange";
    }>;
}, z.core.$strip>;
export type CheckoutSchemaInput = z.input<typeof checkoutSchema>;
export type ReturnExchangeRequestSchemaInput = z.input<typeof returnExchangeRequestSchema>;
//# sourceMappingURL=order.schema.d.ts.map