import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchWishlist, addToWishlist, removeFromWishlist } from '../api/wishlist.api';
const WISHLIST_QUERY_KEY = ['wishlist'];
export function useWishlist() {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: fetchWishlist,
    staleTime: 1000 * 60 * 5,
  });
}
export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => addToWishlist(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previousWishlist = queryClient.getQueryData(WISHLIST_QUERY_KEY);
      if (previousWishlist) {
        const alreadyExists = previousWishlist.items.some((item) => item.productId === productId);
        if (!alreadyExists) {
          queryClient.setQueryData(WISHLIST_QUERY_KEY, {
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
        queryClient.setQueryData(WISHLIST_QUERY_KEY, context.previousWishlist);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}
export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => removeFromWishlist(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previousWishlist = queryClient.getQueryData(WISHLIST_QUERY_KEY);
      if (previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEY, {
          ...previousWishlist,
          items: previousWishlist.items.filter((item) => item.productId !== productId),
          count: Math.max(0, previousWishlist.count - 1),
        });
      }
      return { previousWishlist };
    },
    onError: (_error, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEY, context.previousWishlist);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}
