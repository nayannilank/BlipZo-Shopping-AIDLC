import type { CatalogueListResponse } from '@blipzo/shared';
import type { UseInfiniteQueryResult, UseQueryResult, InfiniteData } from '@tanstack/react-query';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import type { Category, EnrichedProductDetail } from '../api/catalogue.api';
import {
  fetchCategories,
  fetchCategoryProducts,
  fetchProductDetail,
  searchProducts,
} from '../api/catalogue.api';

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCategoryProducts(
  categoryId: string,
): UseInfiniteQueryResult<InfiniteData<CatalogueListResponse>> {
  return useInfiniteQuery({
    queryKey: ['categoryProducts', categoryId],
    queryFn: ({ pageParam }) => fetchCategoryProducts(categoryId, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!categoryId,
  });
}

export function useProductDetail(productId: string): UseQueryResult<EnrichedProductDetail> {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductDetail(productId),
    enabled: !!productId,
  });
}

export function useSearchProducts(
  query: string,
): UseInfiniteQueryResult<InfiniteData<CatalogueListResponse>> {
  return useInfiniteQuery({
    queryKey: ['searchProducts', query],
    queryFn: ({ pageParam }) => searchProducts(query, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: query.trim().length >= 1,
  });
}
