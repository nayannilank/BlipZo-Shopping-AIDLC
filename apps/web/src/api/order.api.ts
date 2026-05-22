import type { CheckoutRequest, OrderRecord, ReturnExchangeRequest } from '@blipzo/shared';

import { apiClient } from './client';

/** Paginated order history response */
export interface OrderHistoryResponse {
  items: OrderRecord[];
  nextCursor?: string;
}

/** Cancel order response includes the updated order record */
export type CancelOrderResponse = OrderRecord;

/** Return/exchange submission payload */
export interface ReturnExchangePayload {
  type: 'Return' | 'Exchange';
}

export async function checkout(request: CheckoutRequest): Promise<OrderRecord> {
  const response = await apiClient.post<OrderRecord>('/orders/checkout', request);
  return response.data;
}

export async function fetchOrders(params?: {
  limit?: number;
  cursor?: string;
}): Promise<OrderHistoryResponse> {
  const response = await apiClient.get<OrderHistoryResponse>('/orders', {
    params: {
      limit: params?.limit ?? 20,
      cursor: params?.cursor,
    },
  });
  return response.data;
}

export async function fetchOrderDetail(orderId: string): Promise<OrderRecord> {
  const response = await apiClient.get<OrderRecord>(`/orders/${orderId}`);
  return response.data;
}

export async function cancelOrder(orderId: string): Promise<CancelOrderResponse> {
  const response = await apiClient.post<CancelOrderResponse>(`/orders/${orderId}/cancel`);
  return response.data;
}

export async function submitReturnExchange(
  orderId: string,
  payload: ReturnExchangePayload,
): Promise<ReturnExchangeRequest> {
  const response = await apiClient.post<ReturnExchangeRequest>(
    `/orders/${orderId}/return-exchange`,
    payload,
  );
  return response.data;
}

export async function fetchReturnExchangeStatus(requestId: string): Promise<ReturnExchangeRequest> {
  const response = await apiClient.get<ReturnExchangeRequest>(
    `/orders/return-exchange/${requestId}`,
  );
  return response.data;
}
