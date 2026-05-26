import { apiClient } from './client';
export async function fetchCategories() {
  const response = await apiClient.get('/catalogue/categories');
  return response.data.categories;
}
export async function fetchCategoryProducts(categoryId, params = {}) {
  const response = await apiClient.get(`/catalogue/categories/${categoryId}`, {
    params: { limit: params.limit ?? 20, cursor: params.cursor },
  });
  return response.data;
}
export async function fetchProductDetail(productId) {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data;
}
export async function searchProducts(query, params = {}) {
  const response = await apiClient.get('/catalogue/search', {
    params: { q: query, limit: params.limit ?? 20, cursor: params.cursor },
  });
  return response.data;
}
