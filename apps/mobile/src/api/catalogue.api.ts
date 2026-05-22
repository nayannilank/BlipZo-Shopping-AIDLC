import type { CatalogueListResponse } from '@blipzo/shared';

import { apiClient } from './client';

export interface Category {
  categoryId: string;
  name: string;
  imageUrl?: string;
}

export interface ProductDetail {
  productId: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categories: string[];
  imageUrls: string[];
  sellerName?: string;
  averageRating?: number;
  sellerPolicy?: {
    returnWindowDays: number;
    exchangeAllowed: boolean;
    conditions?: string;
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiClient.get<Category[]>('/catalogue/categories');
  return response.data;
}

export async function fetchCategoryProducts(
  categoryId: string,
  limit: number = 20,
  cursor?: string,
): Promise<CatalogueListResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  const response = await apiClient.get<CatalogueListResponse>(
    `/catalogue/categories/${categoryId}`,
    { params },
  );
  return response.data;
}

export async function fetchProductDetail(productId: string): Promise<ProductDetail> {
  const response = await apiClient.get<ProductDetail>(`/catalogue/products/${productId}`);
  return response.data;
}

export async function searchProducts(
  query: string,
  limit: number = 20,
  cursor?: string,
): Promise<CatalogueListResponse> {
  const params: Record<string, string | number> = { q: query, limit };
  if (cursor) {
    params.cursor = cursor;
  }
  const response = await apiClient.get<CatalogueListResponse>('/catalogue/search', { params });
  return response.data;
}
