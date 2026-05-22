import type { ProductRecord } from '@blipzo/shared';

import { apiClient } from './client';

export interface SellerProductListResponse {
  items: ProductRecord[];
  nextCursor?: string;
  count: number;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categories: string[];
  images: Array<{
    uri: string;
    filename: string;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
  }>;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stockQuantity?: number;
  categories?: string[];
  images?: Array<{
    uri: string;
    filename: string;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
  }>;
}

export interface PolicyPayload {
  returnWindowDays: number;
  exchangeAllowed: boolean;
  conditions?: string;
}

export async function fetchSellerProducts(cursor?: string): Promise<SellerProductListResponse> {
  const params: Record<string, string> = {};
  if (cursor) {
    params.cursor = cursor;
  }
  const response = await apiClient.get<SellerProductListResponse>('/products/seller/me', {
    params,
  });
  return response.data;
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductRecord> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description);
  formData.append('price', String(payload.price));
  formData.append('stockQuantity', String(payload.stockQuantity));
  formData.append('categories', JSON.stringify(payload.categories));

  payload.images.forEach((image) => {
    formData.append('images', {
      uri: image.uri,
      name: image.filename,
      type: image.contentType,
    });
  });

  const response = await apiClient.post<ProductRecord>('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
): Promise<ProductRecord> {
  const response = await apiClient.patch<ProductRecord>(`/products/${productId}`, payload);
  return response.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}`);
}

export async function setProductPolicy(
  productId: string,
  payload: PolicyPayload,
): Promise<ProductRecord> {
  const response = await apiClient.post<ProductRecord>(`/products/${productId}/policy`, payload);
  return response.data;
}

export async function fetchProductDetail(productId: string): Promise<ProductRecord> {
  const response = await apiClient.get<ProductRecord>(`/products/${productId}`);
  return response.data;
}
