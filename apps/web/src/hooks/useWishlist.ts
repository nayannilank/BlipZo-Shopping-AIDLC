import type { WishlistResponse } from '@blipzo/shared';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';

import { fetchWishlist, addToWishlist, removeFromWishlist } from '../api/wishlist.api';

const WISHLIST_QUERY_KEY = ['wishlist'] as const;

export function useWishlist(): UseQueryResult<WishlistResponse> {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: fetchWishlist,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddToWishlist(): UseMutationResult<WishlistResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => addToWishlist(productId),
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });

      const previousWishlist = queryClient.getQueryData<WishlistResponse>(WISHLIST_QUERY_KEY);

      if (previousWishlist) {
        const alreadyExists = previousWishlist.items.some((item) => item.productId === productId);
        if (!alreadyExists) {
          queryClient.setQueryData<WishlistResponse>(WISHLIST_QUERY_KEY, {
            ...previousWishlist,
            items: [
              {
                productId,
                name: '',
                price: 0,
                primaryImageUrl: '',
                isAvailable: true,
                addedAt: new Date().toISOString(),
              },
              ...previousWishlist.items,
            ],
            count: previousWishlist.count + 1,
          });
        }
      }

      return { previousWishlist };
    },
    onError: (_error, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData<WishlistResponse>(WISHLIST_QUERY_KEY, context.previousWishlist);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}

export function useRemoveFromWishlist(): UseMutationResult<WishlistResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });

      const previousWishlist = queryClient.getQueryData<WishlistResponse>(WISHLIST_QUERY_KEY);

      if (previousWishlist) {
        queryClient.setQueryData<WishlistResponse>(WISHLIST_QUERY_KEY, {
          ...previousWishlist,
          items: previousWishlist.items.filter((item) => item.productId !== productId),
          count: Math.max(0, previousWishlist.count - 1),
        });
      }

      return { previousWishlist };
    },
    onError: (_error, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData<WishlistResponse>(WISHLIST_QUERY_KEY, context.previousWishlist);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}
