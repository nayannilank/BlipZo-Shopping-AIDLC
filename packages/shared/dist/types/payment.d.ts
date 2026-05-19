export interface PaymentRequest {
    orderId: string;
    amount: number;
    method: 'UPI' | 'CreditCard' | 'DebitCard' | 'CashOnDelivery';
    mockPayload?: MockPaymentDetails;
}
export interface MockPaymentDetails {
    mockCardLast4?: string;
    mockUpiRef?: string;
}
export interface PaymentResponse {
    success: boolean;
    transactionId?: string;
    paymentStatus: 'Paid' | 'Pending';
}
//# sourceMappingURL=payment.d.ts.map