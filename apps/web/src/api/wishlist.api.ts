import type { WishlistResponse } from '@blipzo/shared';

import { apiClient } from './client';

export async function fetchWishlist(): Promise<WishlistResponse> {
  const response = await apiClient.get<WishlistResponse>('/wishlist');
  return response.data;
}

export async function addToWishlist(productId: string): Promise<WishlistResponse> {
  const response = await apiClient.post<WishlistResponse>('/wishlist/items', {
    productId,
  });
  return response.data;
}

export async function removeFromWishlist(productId: string): Promise<WishlistResponse> {
  const response = await apiClient.delete<WishlistResponse>(`/wishlist/items/${productId}`);
  return response.data;
}
