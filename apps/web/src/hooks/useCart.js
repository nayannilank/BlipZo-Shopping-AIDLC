import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchCart, updateCartItem, removeCartItem, clearCart } from '../api/cart.api';
import { useCartStore } from '../stores/cart.store';
const CART_QUERY_KEY = ['cart'];
export function useCart() {
  const setCart = useCartStore((state) => state.setCart);
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchCart();
      setCart(data.items, data.total);
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });
}
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { optimisticUpdateQuantity, setCart } = useCartStore.getState();
  return useMutation({
    mutationFn: ({ productId, quantity }) => updateCartItem(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previousCart = queryClient.getQueryData(CART_QUERY_KEY);
      optimisticUpdateQuantity(productId, quantity);
      return { previousCart };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        setCart(context.previousCart.items, context.previousCart.total);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const { optimisticRemoveItem, setCart } = useCartStore.getState();
  return useMutation({
    mutationFn: (productId) => removeCartItem(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previousCart = queryClient.getQueryData(CART_QUERY_KEY);
      optimisticRemoveItem(productId);
      return { previousCart };
    },
    onError: (_error, _productId, context) => {
      if (context?.previousCart) {
        setCart(context.previousCart.items, context.previousCart.total);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
export function useClearCart() {
  const queryClient = useQueryClient();
  const cartStore = useCartStore.getState();
  return useMutation({
    mutationFn: () => clearCart(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previousCart = queryClient.getQueryData(CART_QUERY_KEY);
      cartStore.clearCart();
      return { previousCart };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        cartStore.setCart(context.previousCart.items, context.previousCart.total);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
