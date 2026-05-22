import { apiClient } from './client';

export interface WishlistItemEnriched {
  productId: string;
  name: string;
  price: number;
  primaryImageUrl: string;
  isAvailable: boolean;
  addedAt: string;
}

export interface WishlistResponse {
  buyerId: string;
  items: WishlistItemEnriched[];
  count: number;
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

export async function fetchWishlist(): Promise<WishlistResponse> {
  const response = await apiClient.get<WishlistResponse>('/wishlist');
  return response.data;
}
