import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchCategories,
  fetchCategoryProducts,
  fetchProductDetail,
  searchProducts,
} from '../api/catalogue.api';
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });
}
export function useCategoryProducts(categoryId) {
  return useInfiniteQuery({
    queryKey: ['categoryProducts', categoryId],
    queryFn: ({ pageParam }) => fetchCategoryProducts(categoryId, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!categoryId,
  });
}
export function useProductDetail(productId) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductDetail(productId),
    enabled: !!productId,
  });
}
export function useSearchProducts(query) {
  return useInfiniteQuery({
    queryKey: ['searchProducts', query],
    queryFn: ({ pageParam }) => searchProducts(query, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: query.trim().length >= 1,
  });
}
