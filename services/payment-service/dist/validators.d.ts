import { z } from 'zod';
import type { PaymentRequest } from '@blipzo/shared';
/**
 * Zod schema for validating PaymentRequest input.
 * Validates orderId, amount, and method fields.
 */
export declare const paymentRequestSchema: z.ZodObject<{
    orderId: z.ZodString;
    amount: z.ZodNumber;
    method: z.ZodEnum<{
        UPI: "UPI";
        CreditCard: "CreditCard";
        DebitCard: "DebitCard";
        CashOnDelivery: "CashOnDelivery";
    }>;
    mockPayload: z.ZodOptional<z.ZodObject<{
        mockCardLast4: z.ZodOptional<z.ZodString>;
        mockUpiRef: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Validates the payment request payload.
 * Returns a typed PaymentRequest on success, throws a 400 VALIDATION_ERROR on failure.
 *
 * Requirements: 11.3
 */
export declare function validatePaymentRequest(payload: unknown): PaymentRequest;
//# sourceMappingURL=validators.d.ts.map