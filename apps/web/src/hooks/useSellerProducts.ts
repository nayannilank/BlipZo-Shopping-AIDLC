import type { ProductRecord, SellerPolicy } from '@blipzo/shared';
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import {
  fetchSellerProducts,
  fetchProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductPolicy,
  type SellerProductsResponse,
  type CreateProductPayload,
  type UpdateProductPayload,
  type SetPolicyPayload,
} from '../api/product.api';

const SELLER_PRODUCTS_KEY = ['seller-products'] as const;

export function useSellerProducts(limit: number = 20): UseInfiniteQueryResult<{
  pages: SellerProductsResponse[];
  pageParams: (string | undefined)[];
}> {
  return useInfiniteQuery({
    queryKey: [...SELLER_PRODUCTS_KEY, { limit }],
    queryFn: ({ pageParam }) => fetchSellerProducts({ limit, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 2,
  });
}

export function useProductDetail(productId: string): UseQueryResult<ProductRecord> {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductDetail(productId),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateProduct(): UseMutationResult<ProductRecord, Error, CreateProductPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SELLER_PRODUCTS_KEY });
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  ProductRecord,
  Error,
  { productId: string; payload: UpdateProductPayload }
> {
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

export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SELLER_PRODUCTS_KEY });
    },
  });
}

export function useSetProductPolicy(): UseMutationResult<
  ProductRecord & { sellerPolicy: SellerPolicy },
  Error,
  { productId: string; payload: SetPolicyPayload }
> {
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
