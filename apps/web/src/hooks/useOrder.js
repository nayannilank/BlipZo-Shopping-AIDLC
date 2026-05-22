import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  checkout,
  fetchOrders,
  fetchOrderDetail,
  cancelOrder,
  submitReturnExchange,
  fetchReturnExchangeStatus,
} from '../api/order.api';
const ORDERS_QUERY_KEY = ['orders'];
export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request) => checkout(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}
export function useOrders(limit = 20) {
  return useInfiniteQuery({
    queryKey: [...ORDERS_QUERY_KEY, { limit }],
    queryFn: ({ pageParam }) => fetchOrders({ limit, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 2,
  });
}
export function useOrderDetail(orderId) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, orderId],
    queryFn: () => fetchOrderDetail(orderId),
    enabled: Boolean(orderId),
    staleTime: 1000 * 60 * 2,
  });
}
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId) => cancelOrder(orderId),
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: [...ORDERS_QUERY_KEY, orderId],
      });
    },
  });
}
export function useSubmitReturnExchange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }) => submitReturnExchange(orderId, payload),
    onSuccess: (_data, { orderId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...ORDERS_QUERY_KEY, orderId],
      });
    },
  });
}
export function useReturnExchangeStatus(requestId) {
  return useQuery({
    queryKey: ['return-exchange', requestId],
    queryFn: () => fetchReturnExchangeStatus(requestId),
    enabled: Boolean(requestId),
    staleTime: 1000 * 60 * 2,
  });
}
