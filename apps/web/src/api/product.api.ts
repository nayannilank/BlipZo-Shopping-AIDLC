import type { ProductRecord, SellerPolicy } from '@blipzo/shared';

import { apiClient } from './client';

/** Response for seller's product list */
export interface SellerProductsResponse {
  items: ProductRecord[];
  nextCursor?: string;
}

/** Payload for creating a product (form data with files) */
export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categories: string[];
  images: File[];
}

/** Payload for updating a product */
export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stockQuantity?: number;
  categories?: string[];
  images?: File[];
}

/** Payload for setting seller policy */
export interface SetPolicyPayload {
  returnWindowDays: number;
  exchangeAllowed: boolean;
  conditions?: string;
}

export async function fetchSellerProducts(params?: {
  limit?: number;
  cursor?: string;
}): Promise<SellerProductsResponse> {
  const response = await apiClient.get<SellerProductsResponse>('/products/seller/me', {
    params: {
      limit: params?.limit ?? 20,
      cursor: params?.cursor,
    },
  });
  return response.data;
}

export async function fetchProductDetail(productId: string): Promise<ProductRecord> {
  const response = await apiClient.get<ProductRecord>(`/products/${productId}`);
  return response.data;
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductRecord> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description);
  formData.append('price', String(payload.price));
  formData.append('stockQuantity', String(payload.stockQuantity));
  formData.append('categories', JSON.stringify(payload.categories));

  for (const image of payload.images) {
    formData.append('images', image);
  }

  const response = await apiClient.post<ProductRecord>('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
): Promise<ProductRecord> {
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

  const response = await apiClient.patch<ProductRecord>(`/products/${productId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}`);
}

export async function setProductPolicy(
  productId: string,
  payload: SetPolicyPayload,
): Promise<ProductRecord & { sellerPolicy: SellerPolicy }> {
  const response = await apiClient.post<ProductRecord & { sellerPolicy: SellerPolicy }>(
    `/products/${productId}/policy`,
    payload,
  );
  return response.data;
}
