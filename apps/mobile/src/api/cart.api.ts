import { apiClient } from './client';

export interface CartItemEnriched {
  productId: string;
  name: string;
  price: number;
  primaryImageUrl: string;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  buyerId: string;
  items: CartItemEnriched[];
  total: number;
}

export async function addToCart(productId: string, quantity: number): Promise<CartResponse> {
  const response = await apiClient.put<CartResponse>('/cart/items', {
    productId,
    quantity,
  });
  return response.data;
}

export async function fetchCart(): Promise<CartResponse> {
  const response = await apiClient.get<CartResponse>('/cart');
  return response.data;
}

export async function removeFromCart(productId: string): Promise<CartResponse> {
  const response = await apiClient.delete<CartResponse>(`/cart/items/${productId}`);
  return response.data;
}

export async function clearCart(): Promise<CartResponse> {
  const response = await apiClient.delete<CartResponse>('/cart');
  return response.data;
}
