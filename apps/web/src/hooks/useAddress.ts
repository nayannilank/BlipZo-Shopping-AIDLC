import type { AddressRecord, AddressSchemaInput, UpdateAddressSchemaInput } from '@blipzo/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '../api/address.api';

const ADDRESS_QUERY_KEY = ['addresses'] as const;

export function useAddresses(): UseQueryResult<AddressRecord[]> {
  return useQuery({
    queryKey: ADDRESS_QUERY_KEY,
    queryFn: fetchAddresses,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAddress(): UseMutationResult<AddressRecord, Error, AddressSchemaInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}

export function useUpdateAddress(): UseMutationResult<
  AddressRecord,
  Error,
  { addressId: string; data: UpdateAddressSchemaInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, data }) => updateAddress(addressId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}

export function useDeleteAddress(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}

export function useSetDefaultAddress(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}
