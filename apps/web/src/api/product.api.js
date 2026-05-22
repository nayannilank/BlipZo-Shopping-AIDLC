import { apiClient } from './client';
export async function fetchSellerProducts(params) {
  const response = await apiClient.get('/products/seller/me', {
    params: {
      limit: params?.limit ?? 20,
      cursor: params?.cursor,
    },
  });
  return response.data;
}
export async function fetchProductDetail(productId) {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data;
}
export async function createProduct(payload) {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description);
  formData.append('price', String(payload.price));
  formData.append('stockQuantity', String(payload.stockQuantity));
  formData.append('categories', JSON.stringify(payload.categories));
  for (const image of payload.images) {
    formData.append('images', image);
  }
  const response = await apiClient.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
export async function updateProduct(productId, payload) {
  const formData = new FormData();
  if (payload.name !== undefined) {
    formData.append('name', payload.name);
  }
  if (payload.description !== undefined) {
    formData.append('description', payload.description);
  }
  if (payload.price !== undefined) {
    formData.append('price', String(payload.price));
  }
  if (payload.stockQuantity !== undefined) {
    formData.append('stockQuantity', String(payload.stockQuantity));
  }
  if (payload.categories !== undefined) {
    formData.append('categories', JSON.stringify(payload.categories));
  }
  if (payload.images !== undefined) {
    for (const image of payload.images) {
      formData.append('images', image);
    }
  }
  const response = await apiClient.patch(`/products/${productId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
export async function deleteProduct(productId) {
  await apiClient.delete(`/products/${productId}`);
}
export async function setProductPolicy(productId, payload) {
  const response = await apiClient.post(`/products/${productId}/policy`, payload);
  return response.data;
}
