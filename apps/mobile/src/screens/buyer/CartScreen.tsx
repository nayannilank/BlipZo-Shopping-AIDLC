import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';

import { fetchCart, addToCart, removeFromCart, type CartItemEnriched } from '../../api/cart.api';
import { useCartStore } from '../../stores/cart.store';

type CartNavigationProp = NativeStackNavigationProp<{
  Checkout: undefined;
}>;

function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  disabled,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-lg">
      <TouchableOpacity
        className="w-8 h-8 items-center justify-center"
        onPress={onDecrement}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <Text className="text-lg font-bold text-gray-700">−</Text>
      </TouchableOpacity>
      <View className="w-8 h-8 items-center justify-center">
        <Text
          className="text-sm font-semibold text-gray-900"
          accessibilityLabel={`Quantity ${String(quantity)}`}
        >
          {quantity}
        </Text>
      </View>
      <TouchableOpacity
        className="w-8 h-8 items-center justify-center"
        onPress={onIncrement}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <Text className="text-lg font-bold text-gray-700">+</Text>
      </TouchableOpacity>
    </View>
  );
}

function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating,
}: {
  item: CartItemEnriched;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  isUpdating: boolean;
}): React.JSX.Element {
  const handleIncrement = useCallback(() => {
    onUpdateQuantity(item.productId, item.quantity + 1);
  }, [item.productId, item.quantity, onUpdateQuantity]);

  const handleDecrement = useCallback(() => {
    if (item.quantity <= 1) {
      onRemove(item.productId);
    } else {
      onUpdateQuantity(item.productId, item.quantity - 1);
    }
  }, [item.productId, item.quantity, onUpdateQuantity, onRemove]);

  return (
    <View
      className="flex-row bg-white mx-4 my-2 rounded-xl p-3 border border-gray-100"
      accessibilityRole="none"
      accessibilityLabel={`${item.name}, quantity ${String(item.quantity)}, subtotal ${item.subtotal.toFixed(2)} rupees`}
    >
      <Image
        source={{ uri: item.primaryImageUrl }}
        className="w-20 h-20 rounded-lg bg-gray-100"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${item.name} image`}
      />
      <View className="flex-1 ml-3 justify-between">
        <View>
          <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5">₹{item.price.toLocaleString()} each</Text>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <QuantityStepper
            quantity={item.quantity}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            disabled={isUpdating}
          />
          <Text className="text-base font-bold text-indigo-600">₹{item.subtotal.toFixed(2)}</Text>
        </View>
      </View>
      <TouchableOpacity
        className="absolute top-2 right-2 w-6 h-6 items-center justify-center"
        onPress={() => {
          onRemove(item.productId);
        }}
        disabled={isUpdating}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name} from cart`}
      >
        <Text className="text-gray-400 text-lg">×</Text>
      </TouchableOpacity>
    </View>
  );
}

export function CartScreen(): React.JSX.Element {
  const navigation = useNavigation<CartNavigationProp>();
  const queryClient = useQueryClient();
  const setCart = useCartStore((state) => state.setCart);
  const optimisticUpdateQuantity = useCartStore((state) => state.optimisticUpdateQuantity);
  const optimisticRemoveItem = useCartStore((state) => state.optimisticRemoveItem);

  const {
    data: cart,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
  });

  // Sync server cart data to local store
  useEffect(() => {
    if (cart) {
      setCart(cart.items, cart.total);
    }
  }, [cart, setCart]);

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      addToCart(productId, quantity),
    onMutate: ({ productId, quantity }) => {
      optimisticUpdateQuantity(productId, quantity);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      // Refetch to restore correct state
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromCart(productId),
    onMutate: (productId) => {
      optimisticRemoveItem(productId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Error', 'Failed to remove item. Please try again.');
    },
  });

  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) => {
      updateQuantityMutation.mutate({ productId, quantity });
    },
    [updateQuantityMutation],
  );

  const handleRemove = useCallback(
    (productId: string) => {
      removeMutation.mutate(productId);
    },
    [removeMutation],
  );

  const handleCheckout = useCallback(() => {
    navigation.navigate('Checkout');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: CartItemEnriched }) => (
      <CartItem
        item={item}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemove}
        isUpdating={updateQuantityMutation.isPending || removeMutation.isPending}
      />
    ),
    [
      handleUpdateQuantity,
      handleRemove,
      updateQuantityMutation.isPending,
      removeMutation.isPending,
    ],
  );

  const keyExtractor = useCallback((item: CartItemEnriched) => item.productId, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading cart...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load cart</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => {
            void refetch();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading cart"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-4xl">🛒</Text>
        <Text className="text-lg font-semibold text-gray-700 mt-3">Your cart is empty</Text>
        <Text className="mt-2 text-gray-500 text-center px-8">
          Add items to your cart to see them here
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={cart.items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#4F46E5"
          />
        }
        ListHeaderComponent={
          <View className="px-4 py-2">
            <Text className="text-sm text-gray-500">
              {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        }
      />

      {/* Cart Total & Checkout */}
      <View className="bg-white border-t border-gray-200 px-4 py-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base text-gray-600">Cart Total</Text>
          <Text className="text-xl font-bold text-gray-900">₹{cart.total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          className="bg-indigo-600 rounded-lg py-3.5 items-center"
          onPress={handleCheckout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Proceed to checkout, total ${cart.total.toFixed(2)} rupees`}
        >
          <Text className="text-white font-semibold text-base">Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
