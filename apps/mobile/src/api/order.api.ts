import { apiClient } from './client';

export interface AddressRecord {
  addressId: string;
  buyerId: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtPurchase: number;
  subtotal: number;
}

export interface OrderRecord {
  orderId: string;
  buyerId: string;
  orderTimestamp: string;
  deliveryAddressSnapshot: AddressRecord;
  items: OrderItem[];
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Pending' | 'Refunded' | 'RefundPending';
  orderStatus: 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  totalAmount: number;
  transactionId?: string;
  refundStatus?: 'Pending' | 'Completed';
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

export type PaymentMethod = 'UPI' | 'CreditCard' | 'DebitCard' | 'CashOnDelivery';

export interface CheckoutRequest {
  addressId: string;
  paymentMethod: PaymentMethod;
}

export interface CreateAddressRequest {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface UpdateAddressRequest {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// --- Address API ---

export async function fetchAddresses(): Promise<AddressRecord[]> {
  const response = await apiClient.get<AddressRecord[]>('/addresses');
  return response.data;
}

export async function createAddress(request: CreateAddressRequest): Promise<AddressRecord> {
  const response = await apiClient.post<AddressRecord>('/addresses', request);
  return response.data;
}

export async function updateAddress(
  addressId: string,
  request: UpdateAddressRequest,
): Promise<AddressRecord> {
  const response = await apiClient.patch<AddressRecord>(`/addresses/${addressId}`, request);
  return response.data;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiClient.delete(`/addresses/${addressId}`);
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  await apiClient.post(`/addresses/${addressId}/default`);
}

// --- Order API ---

export async function placeOrder(request: CheckoutRequest): Promise<OrderRecord> {
  const response = await apiClient.post<OrderRecord>('/orders/checkout', request);
  return response.data;
}

export async function fetchOrders(
  limit: number = 20,
  cursor?: string,
): Promise<{ orders: OrderRecord[]; nextCursor?: string }> {
  const params: Record<string, string | number> = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  const response = await apiClient.get<{ orders: OrderRecord[]; nextCursor?: string }>('/orders', {
    params,
  });
  return response.data;
}

export async function fetchOrderDetail(orderId: string): Promise<OrderRecord> {
  const response = await apiClient.get<OrderRecord>(`/orders/${orderId}`);
  return response.data;
}

export async function cancelOrder(orderId: string): Promise<OrderRecord> {
  const response = await apiClient.post<OrderRecord>(`/orders/${orderId}/cancel`);
  return response.data;
}

export async function submitReturnExchange(
  orderId: string,
  type: 'Return' | 'Exchange',
): Promise<ReturnExchangeRequest> {
  const response = await apiClient.post<ReturnExchangeRequest>(
    `/orders/${orderId}/return-exchange`,
    { type },
  );
  return response.data;
}
