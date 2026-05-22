import type { CatalogueListResponse, ProductRecord } from '@blipzo/shared';

import { apiClient } from './client';

export interface Category {
  categoryId: string;
  name: string;
}

export interface CategoriesResponse {
  categories: Category[];
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiClient.get<CategoriesResponse>('/catalogue/categories');
  return response.data.categories;
}

export async function fetchCategoryProducts(
  categoryId: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<CatalogueListResponse> {
  const response = await apiClient.get<CatalogueListResponse>(
    `/catalogue/categories/${categoryId}`,
    { params: { limit: params.limit ?? 20, cursor: params.cursor } },
  );
  return response.data;
}

export async function fetchProductDetail(productId: string): Promise<ProductRecord> {
  const response = await apiClient.get<ProductRecord>(`/catalogue/products/${productId}`);
  return response.data;
}

export async function searchProducts(
  query: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<CatalogueListResponse> {
  const response = await apiClient.get<CatalogueListResponse>('/catalogue/search', {
    params: { q: query, limit: params.limit ?? 20, cursor: params.cursor },
  });
  return response.data;
}
