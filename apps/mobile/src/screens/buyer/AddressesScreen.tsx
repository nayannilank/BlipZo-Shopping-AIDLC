import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type AddressRecord,
  type CreateAddressRequest,
  type UpdateAddressRequest,
} from '../../api/order.api';

interface AddressFormData {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const EMPTY_FORM: AddressFormData = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

function validateForm(form: AddressFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.fullName.trim() || form.fullName.trim().length > 100) {
    errors.fullName = 'Full name is required (1-100 characters)';
  }

  const e164Regex = /^\+\d{7,15}$/;
  if (!e164Regex.test(form.phone)) {
    errors.phone = 'Phone must be in E.164 format (e.g., +919876543210)';
  }

  if (!form.line1.trim() || form.line1.trim().length > 200) {
    errors.line1 = 'Address line 1 is required (1-200 characters)';
  }

  if (!form.city.trim() || form.city.trim().length > 100) {
    errors.city = 'City is required (1-100 characters)';
  }

  if (!form.state.trim() || form.state.trim().length > 100) {
    errors.state = 'State is required (1-100 characters)';
  }

  if (!form.postalCode.trim()) {
    errors.postalCode = 'Postal code is required';
  }

  if (!form.country.trim()) {
    errors.country = 'Country is required';
  }

  return errors;
}

function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  required,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
}): React.JSX.Element {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      <TextInput
        className={`border rounded-lg px-3 py-2.5 text-sm text-gray-900 ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
        accessibilityLabel={label}
      />
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}

function AddressFormModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AddressFormData) => void;
  isSubmitting: boolean;
  initialData?: AddressFormData;
  title: string;
}): React.JSX.Element {
  const [form, setForm] = useState<AddressFormData>(initialData ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      setForm(initialData ?? EMPTY_FORM);
      setErrors({});
    }
  }, [visible, initialData]);

  const updateField = useCallback((field: keyof AddressFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const { [field]: _, ...next } = prev;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(form);
  }, [form, onSubmit]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-2xl max-h-[90%]">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-3 border-b border-gray-100">
              <Text className="text-lg font-bold text-gray-900">{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Close form"
              >
                <Text className="text-2xl text-gray-400">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
              <FormField
                label="Full Name"
                value={form.fullName}
                onChangeText={(v) => {
                  updateField('fullName', v);
                }}
                error={errors.fullName}
                placeholder="John Doe"
                required
                autoCapitalize="words"
              />
              <FormField
                label="Phone"
                value={form.phone}
                onChangeText={(v) => {
                  updateField('phone', v);
                }}
                error={errors.phone}
                placeholder="+919876543210"
                required
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <FormField
                label="Address Line 1"
                value={form.line1}
                onChangeText={(v) => {
                  updateField('line1', v);
                }}
                error={errors.line1}
                placeholder="123 Main Street"
                required
              />
              <FormField
                label="Address Line 2"
                value={form.line2}
                onChangeText={(v) => {
                  updateField('line2', v);
                }}
                placeholder="Apartment, suite, etc. (optional)"
              />
              <FormField
                label="City"
                value={form.city}
                onChangeText={(v) => {
                  updateField('city', v);
                }}
                error={errors.city}
                placeholder="Mumbai"
                required
                autoCapitalize="words"
              />
              <FormField
                label="State"
                value={form.state}
                onChangeText={(v) => {
                  updateField('state', v);
                }}
                error={errors.state}
                placeholder="Maharashtra"
                required
                autoCapitalize="words"
              />
              <FormField
                label="Postal Code"
                value={form.postalCode}
                onChangeText={(v) => {
                  updateField('postalCode', v);
                }}
                error={errors.postalCode}
                placeholder="400001"
                required
                keyboardType="numeric"
              />
              <FormField
                label="Country"
                value={form.country}
                onChangeText={(v) => {
                  updateField('country', v);
                }}
                error={errors.country}
                placeholder="India"
                required
                autoCapitalize="words"
              />
            </ScrollView>

            <View className="px-6 py-4 border-t border-gray-100">
              <TouchableOpacity
                className={`rounded-lg py-3.5 items-center ${
                  isSubmitting ? 'bg-gray-300' : 'bg-indigo-600'
                }`}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Save address`}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">Save Address</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
  isSettingDefault,
}: {
  address: AddressRecord;
  onEdit: (address: AddressRecord) => void;
  onDelete: (addressId: string) => void;
  onSetDefault: (addressId: string) => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
}): React.JSX.Element {
  return (
    <View
      className={`bg-white mx-4 my-2 rounded-xl p-4 border ${
        address.isDefault ? 'border-indigo-300' : 'border-gray-100'
      }`}
      accessibilityLabel={`${address.fullName}, ${address.line1}, ${address.city}${address.isDefault ? ', default address' : ''}`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className="text-sm font-semibold text-gray-900">{address.fullName}</Text>
          {address.isDefault && (
            <View className="ml-2 bg-indigo-100 rounded px-1.5 py-0.5">
              <Text className="text-xs font-medium text-indigo-700">Default</Text>
            </View>
          )}
        </View>
      </View>

      <Text className="text-sm text-gray-600">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}
      </Text>
      <Text className="text-sm text-gray-600">
        {address.city}, {address.state} {address.postalCode}
      </Text>
      <Text className="text-sm text-gray-600">{address.country}</Text>
      <Text className="text-xs text-gray-500 mt-1">Phone: {address.phone}</Text>

      <View className="flex-row items-center mt-3 pt-3 border-t border-gray-50">
        {!address.isDefault && (
          <TouchableOpacity
            className="mr-4"
            onPress={() => {
              onSetDefault(address.addressId);
            }}
            disabled={isSettingDefault}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Set as default address"
          >
            {isSettingDefault ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text className="text-xs font-medium text-indigo-600">Set Default</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="mr-4"
          onPress={() => {
            onEdit(address);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Edit address for ${address.fullName}`}
        >
          <Text className="text-xs font-medium text-gray-600">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            onDelete(address.addressId);
          }}
          disabled={isDeleting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Delete address for ${address.fullName}`}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Text className="text-xs font-medium text-red-600">Delete</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function AddressesScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);

  const {
    data: addresses,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAddressRequest) => createAddress(data),
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create address. Please try again.';
      Alert.alert('Error', message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ addressId, data }: { addressId: string; data: UpdateAddressRequest }) =>
      updateAddress(addressId, data),
    onSuccess: () => {
      setEditingAddress(null);
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update address. Please try again.';
      Alert.alert('Error', message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (addressId: string) => deleteAddress(addressId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to delete address. Please try again.';
      Alert.alert('Error', message);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (addressId: string) => setDefaultAddress(addressId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to set default address. Please try again.';
      Alert.alert('Error', message);
    },
  });

  const handleCreate = useCallback(
    (formData: AddressFormData) => {
      const request: CreateAddressRequest = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        line1: formData.line1.trim(),
        ...(formData.line2.trim() ? { line2: formData.line2.trim() } : {}),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim(),
      };
      createMutation.mutate(request);
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (formData: AddressFormData) => {
      if (!editingAddress) return;
      const data: UpdateAddressRequest = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        line1: formData.line1.trim(),
        line2: formData.line2.trim() || undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim(),
      };
      updateMutation.mutate({ addressId: editingAddress.addressId, data });
    },
    [editingAddress, updateMutation],
  );

  const handleEdit = useCallback((address: AddressRecord) => {
    setEditingAddress(address);
  }, []);

  const handleDelete = useCallback(
    (addressId: string) => {
      Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(addressId);
          },
        },
      ]);
    },
    [deleteMutation],
  );

  const handleSetDefault = useCallback(
    (addressId: string) => {
      setDefaultMutation.mutate(addressId);
    },
    [setDefaultMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: AddressRecord }) => (
      <AddressCard
        address={item}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        isDeleting={deleteMutation.isPending && deleteMutation.variables === item.addressId}
        isSettingDefault={
          setDefaultMutation.isPending && setDefaultMutation.variables === item.addressId
        }
      />
    ),
    [handleEdit, handleDelete, handleSetDefault, deleteMutation, setDefaultMutation],
  );

  const keyExtractor = useCallback((item: AddressRecord) => item.addressId, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading addresses...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load addresses</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => {
            void refetch();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading addresses"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addressList = addresses ?? [];

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={addressList}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#4F46E5"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-4xl">📍</Text>
            <Text className="text-lg font-semibold text-gray-700 mt-3">No addresses saved</Text>
            <Text className="mt-2 text-gray-500 text-center">
              Add a delivery address to get started
            </Text>
          </View>
        }
        ListHeaderComponent={
          addressList.length > 0 ? (
            <View className="px-4 py-2">
              <Text className="text-sm text-gray-500">
                {addressList.length} {addressList.length === 1 ? 'address' : 'addresses'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Add Address Button */}
      <View className="bg-white border-t border-gray-200 px-4 py-4">
        <TouchableOpacity
          className="bg-indigo-600 rounded-lg py-3.5 items-center"
          onPress={() => {
            setShowForm(true);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add new address"
        >
          <Text className="text-white font-semibold text-base">Add New Address</Text>
        </TouchableOpacity>
      </View>

      {/* Create Address Modal */}
      <AddressFormModal
        visible={showForm}
        onClose={() => {
          setShowForm(false);
        }}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
        title="Add Address"
      />

      {/* Edit Address Modal */}
      <AddressFormModal
        visible={editingAddress !== null}
        onClose={() => {
          setEditingAddress(null);
        }}
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
        initialData={
          editingAddress
            ? {
                fullName: editingAddress.fullName,
                phone: editingAddress.phone,
                line1: editingAddress.line1,
                line2: editingAddress.line2 ?? '',
                city: editingAddress.city,
                state: editingAddress.state,
                postalCode: editingAddress.postalCode,
                country: editingAddress.country,
              }
            : undefined
        }
        title="Edit Address"
      />
    </View>
  );
}
