import type { PaymentRequest, PaymentResponse } from '@blipzo/shared';
/**
 * Processes a payment request and writes a PaymentRecord to DynamoDB.
 *
 * - For UPI/CreditCard/DebitCard: returns { success: true, transactionId: uuid(), paymentStatus: 'Paid' }
 * - For CashOnDelivery: returns { success: true, paymentStatus: 'Pending' }
 *
 * Security: Never writes mockCardLast4, mockUpiRef, or any credential field to DynamoDB.
 *
 * Requirements: 11.1, 11.2, 11.4, 11.5
 */
export declare function processPayment(request: PaymentRequest): Promise<PaymentResponse>;
//# sourceMappingURL=service.d.ts.map