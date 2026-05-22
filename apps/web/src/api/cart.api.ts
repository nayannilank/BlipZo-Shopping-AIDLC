import type { CartResponse } from '@blipzo/shared';

import { apiClient } from './client';

export async function fetchCart(): Promise<CartResponse> {
  const response = await apiClient.get<CartResponse>('/cart');
  return response.data;
}

export async function updateCartItem(productId: string, quantity: number): Promise<CartResponse> {
  const response = await apiClient.put<CartResponse>('/cart/items', {
    productId,
    quantity,
  });
  return response.data;
}

export async function removeCartItem(productId: string): Promise<CartResponse> {
  const response = await apiClient.delete<CartResponse>(`/cart/items/${productId}`);
  return response.data;
}

export async function clearCart(): Promise<CartResponse> {
  const response = await apiClient.delete<CartResponse>('/cart');
  return response.data;
}
