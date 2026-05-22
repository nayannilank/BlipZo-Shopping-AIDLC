import { apiClient } from './client';
export async function fetchCart() {
  const response = await apiClient.get('/cart');
  return response.data;
}
export async function updateCartItem(productId, quantity) {
  const response = await apiClient.put('/cart/items', {
    productId,
    quantity,
  });
  return response.data;
}
export async function removeCartItem(productId) {
  const response = await apiClient.delete(`/cart/items/${productId}`);
  return response.data;
}
export async function clearCart() {
  const response = await apiClient.delete('/cart');
  return response.data;
}
