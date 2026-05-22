import { apiClient } from './client';
export async function fetchAddresses() {
  const response = await apiClient.get('/addresses');
  return response.data.addresses;
}
export async function createAddress(data) {
  const response = await apiClient.post('/addresses', data);
  return response.data;
}
export async function updateAddress(addressId, data) {
  const response = await apiClient.patch(`/addresses/${addressId}`, data);
  return response.data;
}
export async function deleteAddress(addressId) {
  await apiClient.delete(`/addresses/${addressId}`);
}
export async function setDefaultAddress(addressId) {
  await apiClient.post(`/addresses/${addressId}/default`);
}
