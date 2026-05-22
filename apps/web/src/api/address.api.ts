import type { AddressRecord, AddressSchemaInput, UpdateAddressSchemaInput } from '@blipzo/shared';

import { apiClient } from './client';

export interface AddressListResponse {
  addresses: AddressRecord[];
}

export async function fetchAddresses(): Promise<AddressRecord[]> {
  const response = await apiClient.get<AddressListResponse>('/addresses');
  return response.data.addresses;
}

export async function createAddress(data: AddressSchemaInput): Promise<AddressRecord> {
  const response = await apiClient.post<AddressRecord>('/addresses', data);
  return response.data;
}

export async function updateAddress(
  addressId: string,
  data: UpdateAddressSchemaInput,
): Promise<AddressRecord> {
  const response = await apiClient.patch<AddressRecord>(`/addresses/${addressId}`, data);
  return response.data;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiClient.delete(`/addresses/${addressId}`);
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  await apiClient.post(`/addresses/${addressId}/default`);
}
