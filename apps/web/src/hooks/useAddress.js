import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '../api/address.api';
const ADDRESS_QUERY_KEY = ['addresses'];
export function useAddresses() {
  return useQuery({
    queryKey: ADDRESS_QUERY_KEY,
    queryFn: fetchAddresses,
    staleTime: 1000 * 60 * 5,
  });
}
export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}
export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, data }) => updateAddress(addressId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}
export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}
export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}
