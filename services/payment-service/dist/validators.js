import { z } from 'zod';
import { createValidationError } from './errors.js';
/**
 * Supported payment methods for the mock payment service.
 */
const SUPPORTED_METHODS = ['UPI', 'CreditCard', 'DebitCard', 'CashOnDelivery'];
/**
 * Zod schema for validating PaymentRequest input.
 * Validates orderId, amount, and method fields.
 */
export const paymentRequestSchema = z.object({
    orderId: z.string().min(1, 'orderId is required'),
    amount: z.number().positive('amount must be greater than 0'),
    method: z.enum(SUPPORTED_METHODS, {
        message: `Unsupported payment method. Supported methods: ${SUPPORTED_METHODS.join(', ')}`,
    }),
    mockPayload: z
        .object({
        mockCardLast4: z.string().optional(),
        mockUpiRef: z.string().optional(),
    })
        .optional(),
});
/**
 * Validates the payment request payload.
 * Returns a typed PaymentRequest on success, throws a 400 VALIDATION_ERROR on failure.
 *
 * Requirements: 11.3
 */
export function validatePaymentRequest(payload) {
    if (!payload || typeof payload !== 'object') {
        createValidationError('Payment request body is required');
    }
    const result = paymentRequestSchema.safeParse(payload);
    if (!result.success) {
        const fields = {};
        for (const issue of result.error.issues) {
            const path = issue.path.join('.');
            if (path) {
                fields[path] = issue.message;
            }
        }
        // Check if the error is specifically about unsupported method
        const methodIssue = result.error.issues.find((issue) => issue.path.includes('method'));
        const message = methodIssue
            ? 'Unsupported payment method'
            : 'Validation failed';
        createValidationError(message, fields);
    }
    const data = result.data;
    // Build a clean PaymentRequest, only including mockPayload if defined
    const paymentRequest = {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
    };
    if (data.mockPayload) {
        const mp = {};
        if (data.mockPayload.mockCardLast4) {
            mp.mockCardLast4 = data.mockPayload.mockCardLast4;
        }
        if (data.mockPayload.mockUpiRef) {
            mp.mockUpiRef = data.mockPayload.mockUpiRef;
        }
        paymentRequest.mockPayload = mp;
    }
    return paymentRequest;
}
//# sourceMappingURL=validators.js.map