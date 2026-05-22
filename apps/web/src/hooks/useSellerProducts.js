import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchSellerProducts,
  fetchProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductPolicy,
} from '../api/product.api';
const SELLER_PRODUCTS_KEY = ['seller-products'];
export function useSellerProducts(limit = 20) {
  return useInfiniteQuery({
    queryKey: [...SELLER_PRODUCTS_KEY, { limit }],
    queryFn: ({ pageParam }) => fetchSellerProducts({ limit, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 2,
  });
}
export function useProductDetail(productId) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductDetail(productId),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 2,
  });
}
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SELLER_PRODUCTS_KEY });
    },
  });
}
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }) => updateProduct(productId, payload),
    onSuccess: (_data, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: SELLER_PRODUCTS_KEY });
      void queryClient.invalidateQueries({
        queryKey: ['product', productId],
      });
    },
  });
}
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SELLER_PRODUCTS_KEY });
    },
  });
}
export function useSetProductPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }) => setProductPolicy(productId, payload),
    onSuccess: (_data, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: SELLER_PRODUCTS_KEY });
      void queryClient.invalidateQueries({
        queryKey: ['product', productId],
      });
    },
  });
}
