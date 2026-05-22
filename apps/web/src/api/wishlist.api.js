import { apiClient } from './client';
export async function fetchWishlist() {
  const response = await apiClient.get('/wishlist');
  return response.data;
}
export async function addToWishlist(productId) {
  const response = await apiClient.post('/wishlist/items', {
    productId,
  });
  return response.data;
}
export async function removeFromWishlist(productId) {
  const response = await apiClient.delete(`/wishlist/items/${productId}`);
  return response.data;
}
