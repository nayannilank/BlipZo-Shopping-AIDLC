import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

import { fetchCart } from '../../api/cart.api';
import {
  fetchAddresses,
  placeOrder,
  type AddressRecord,
  type PaymentMethod,
} from '../../api/order.api';
import { useCartStore } from '../../stores/cart.store';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: 'UPI', label: 'UPI', description: 'Pay using UPI' },
  { value: 'CreditCard', label: 'Credit Card', description: 'Pay with credit card' },
  { value: 'DebitCard', label: 'Debit Card', description: 'Pay with debit card' },
  { value: 'CashOnDelivery', label: 'Cash on Delivery', description: 'Pay when delivered' },
];

function AddressPicker({
  addresses,
  selectedId,
  onSelect,
}: {
  addresses: AddressRecord[];
  selectedId: string | null;
  onSelect: (addressId: string) => void;
}): React.JSX.Element {
  if (addresses.length === 0) {
    return (
      <View className="bg-yellow-50 rounded-lg p-4">
        <Text className="text-sm text-yellow-700">
          No saved addresses. Please add an address before checkout.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {addresses.map((address) => {
        const isSelected = selectedId === address.addressId;
        return (
          <TouchableOpacity
            key={address.addressId}
            className={`rounded-lg p-3 mb-2 border ${
              isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}
            onPress={() => {
              onSelect(address.addressId);
            }}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${address.fullName}, ${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`}
          >
            <View className="flex-row items-center">
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                  isSelected ? 'border-indigo-600' : 'border-gray-300'
                }`}
              >
                {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-sm font-semibold text-gray-900">{address.fullName}</Text>
                  {address.isDefault && (
                    <View className="ml-2 bg-indigo-100 rounded px-1.5 py-0.5">
                      <Text className="text-xs text-indigo-700">Default</Text>
                    </View>
                  )}
                </View>
                <Text className="text-sm text-gray-600 mt-0.5" numberOfLines={2}>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                </Text>
                <Text className="text-sm text-gray-500">
                  {address.city}, {address.state} {address.postalCode}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PaymentMethodPicker({
  selectedMethod,
  onSelect,
}: {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}): React.JSX.Element {
  return (
    <View>
      {PAYMENT_METHODS.map((method) => {
        const isSelected = selectedMethod === method.value;
        return (
          <TouchableOpacity
            key={method.value}
            className={`rounded-lg p-3 mb-2 border ${
              isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}
            onPress={() => {
              onSelect(method.value);
            }}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${method.label}, ${method.description}`}
          >
            <View className="flex-row items-center">
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                  isSelected ? 'border-indigo-600' : 'border-gray-300'
                }`}
              >
                {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-900">{method.label}</Text>
                <Text className="text-xs text-gray-500">{method.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function CheckoutScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const clearCartStore = useCartStore((state) => state.clearCart);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  const { data: cart, isLoading: isCartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
  });

  const {
    data: addresses,
    isLoading: isAddressesLoading,
    isError: isAddressesError,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  });

  // Auto-select default address
  React.useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((a) => a.isDefault);
      setSelectedAddressId(defaultAddress?.addressId ?? addresses[0].addressId);
    }
  }, [addresses, selectedAddressId]);

  const placeOrderMutation = useMutation({
    mutationFn: () => {
      if (!selectedAddressId || !selectedPaymentMethod) {
        throw new Error('Please select an address and payment method');
      }
      return placeOrder({
        addressId: selectedAddressId,
        paymentMethod: selectedPaymentMethod,
      });
    },
    onSuccess: (order) => {
      clearCartStore();
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('Order Placed', `Your order #${order.orderId.slice(0, 8)} has been confirmed.`, [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      Alert.alert('Order Failed', message);
    },
  });

  const handlePlaceOrder = useCallback(() => {
    if (!selectedAddressId) {
      Alert.alert('Missing Address', 'Please select a delivery address.');
      return;
    }
    if (!selectedPaymentMethod) {
      Alert.alert('Missing Payment', 'Please select a payment method.');
      return;
    }
    placeOrderMutation.mutate();
  }, [selectedAddressId, selectedPaymentMethod, placeOrderMutation]);

  const isLoading = isCartLoading || isAddressesLoading;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading checkout...</Text>
      </View>
    );
  }

  if (isAddressesError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load addresses</Text>
        <Text className="mt-2 text-gray-500 text-center">Please try again later.</Text>
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-lg font-semibold text-gray-700">Your cart is empty</Text>
        <Text className="mt-2 text-gray-500">Add items to proceed with checkout</Text>
      </View>
    );
  }

  const canPlaceOrder =
    selectedAddressId !== null && selectedPaymentMethod !== null && !placeOrderMutation.isPending;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Delivery Address Section */}
        <View className="px-4 pt-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">Delivery Address</Text>
          <AddressPicker
            addresses={addresses ?? []}
            selectedId={selectedAddressId}
            onSelect={setSelectedAddressId}
          />
        </View>

        {/* Payment Method Section */}
        <View className="px-4 pt-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Payment Method</Text>
          <PaymentMethodPicker
            selectedMethod={selectedPaymentMethod}
            onSelect={setSelectedPaymentMethod}
          />
        </View>

        {/* Order Summary Section */}
        <View className="px-4 pt-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Order Summary</Text>
          <View className="bg-white rounded-lg border border-gray-200 p-3">
            {cart.items.map((item) => (
              <View
                key={item.productId}
                className="flex-row justify-between py-2 border-b border-gray-50"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-sm text-gray-800" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Qty: {item.quantity} × ₹{item.price.toLocaleString()}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-gray-900">
                  ₹{item.subtotal.toFixed(2)}
                </Text>
              </View>
            ))}
            <View className="flex-row justify-between pt-3 mt-1">
              <Text className="text-base font-bold text-gray-900">Total</Text>
              <Text className="text-base font-bold text-indigo-600">₹{cart.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View className="bg-white border-t border-gray-200 px-4 py-4">
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${
            canPlaceOrder ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
          onPress={handlePlaceOrder}
          disabled={!canPlaceOrder}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Place order for ${cart.total.toFixed(2)} rupees`}
          accessibilityState={{ disabled: !canPlaceOrder }}
        >
          {placeOrderMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Place Order • ₹{cart.total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
