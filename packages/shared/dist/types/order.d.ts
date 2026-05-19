import type { AddressSnapshot } from './address.js';
import type { MockPaymentDetails } from './payment.js';
export interface CheckoutRequest {
    addressId: string;
    paymentMethod: 'UPI' | 'CreditCard' | 'DebitCard' | 'CashOnDelivery';
    paymentDetails?: MockPaymentDetails;
}
export interface OrderRecord {
    orderId: string;
    buyerId: string;
    orderTimestamp: string;
    deliveryAddressSnapshot: AddressSnapshot;
    items: OrderItem[];
    paymentMethod: string;
    paymentStatus: 'Paid' | 'Pending' | 'Refunded' | 'RefundPending';
    orderStatus: 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
    totalAmount: number;
    transactionId?: string;
    refundStatus?: 'Pending' | 'Completed';
}
export interface OrderItem {
    productId: string;
    name: string;
    quantity: number;
    priceAtPurchase: number;
    subtotal: number;
}
export interface ReturnExchangeRequest {
    requestId: string;
    orderId: string;
    buyerId: string;
    type: 'Return' | 'Exchange';
    status: 'Pending' | 'Approved' | 'Rejected';
    sellerNotes?: string;
    policyVersionAtRequest: string;
    createdAt: string;
}
//# sourceMappingURL=order.d.ts.map