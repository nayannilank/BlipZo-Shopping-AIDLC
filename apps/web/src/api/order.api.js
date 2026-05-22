import { apiClient } from './client';
export async function checkout(request) {
  const response = await apiClient.post('/orders/checkout', request);
  return response.data;
}
export async function fetchOrders(params) {
  const response = await apiClient.get('/orders', {
    params: {
      limit: params?.limit ?? 20,
      cursor: params?.cursor,
    },
  });
  return response.data;
}
export async function fetchOrderDetail(orderId) {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
}
export async function cancelOrder(orderId) {
  const response = await apiClient.post(`/orders/${orderId}/cancel`);
  return response.data;
}
export async function submitReturnExchange(orderId, payload) {
  const response = await apiClient.post(`/orders/${orderId}/return-exchange`, payload);
  return response.data;
}
export async function fetchReturnExchangeStatus(requestId) {
  const response = await apiClient.get(`/orders/return-exchange/${requestId}`);
  return response.data;
}
