import type { CheckoutRequest, OrderRecord, ReturnExchangeRequest } from '@blipzo/shared';
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
  checkout,
  fetchOrders,
  fetchOrderDetail,
  cancelOrder,
  submitReturnExchange,
  fetchReturnExchangeStatus,
  type OrderHistoryResponse,
  type CancelOrderResponse,
  type ReturnExchangePayload,
} from '../api/order.api';

const ORDERS_QUERY_KEY = ['orders'] as const;

export function useCheckout(): UseMutationResult<OrderRecord, Error, CheckoutRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CheckoutRequest) => checkout(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}

export function useOrders(
  limit: number = 20,
): UseInfiniteQueryResult<{ pages: OrderHistoryResponse[]; pageParams: (string | undefined)[] }> {
  return useInfiniteQuery({
    queryKey: [...ORDERS_QUERY_KEY, { limit }],
    queryFn: ({ pageParam }) => fetchOrders({ limit, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOrderDetail(orderId: string): UseQueryResult<OrderRecord> {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, orderId],
    queryFn: () => fetchOrderDetail(orderId),
    enabled: Boolean(orderId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCancelOrder(): UseMutationResult<CancelOrderResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: [...ORDERS_QUERY_KEY, orderId],
      });
    },
  });
}

export function useSubmitReturnExchange(): UseMutationResult<
  ReturnExchangeRequest,
  Error,
  { orderId: string; payload: ReturnExchangePayload }
> {
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

export function useReturnExchangeStatus(requestId: string): UseQueryResult<ReturnExchangeRequest> {
  return useQuery({
    queryKey: ['return-exchange', requestId],
    queryFn: () => fetchReturnExchangeStatus(requestId),
    enabled: Boolean(requestId),
    staleTime: 1000 * 60 * 2,
  });
}
