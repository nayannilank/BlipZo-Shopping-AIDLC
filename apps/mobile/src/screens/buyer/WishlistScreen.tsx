import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
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

import {
  fetchWishlist,
  removeFromWishlist,
  type WishlistItemEnriched,
} from '../../api/wishlist.api';

function AvailabilityBadge({ isAvailable }: { isAvailable: boolean }): React.JSX.Element {
  if (isAvailable) {
    return (
      <View className="bg-green-100 rounded-full px-2 py-0.5" accessibilityLabel="Available">
        <Text className="text-xs font-medium text-green-700">Available</Text>
      </View>
    );
  }
  return (
    <View className="bg-red-100 rounded-full px-2 py-0.5" accessibilityLabel="Unavailable">
      <Text className="text-xs font-medium text-red-700">Unavailable</Text>
    </View>
  );
}

function WishlistItem({
  item,
  onRemove,
  isRemoving,
}: {
  item: WishlistItemEnriched;
  onRemove: (productId: string) => void;
  isRemoving: boolean;
}): React.JSX.Element {
  return (
    <View
      className="flex-row bg-white mx-4 my-2 rounded-xl p-3 border border-gray-100"
      accessibilityRole="none"
      accessibilityLabel={`${item.name}, price ${String(item.price)} rupees, ${item.isAvailable ? 'available' : 'unavailable'}`}
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
          <Text className="text-lg font-bold text-indigo-600 mt-1">
            ₹{item.price.toLocaleString()}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <AvailabilityBadge isAvailable={item.isAvailable} />
          <TouchableOpacity
            className="bg-red-50 rounded-lg px-3 py-1.5"
            onPress={() => {
              onRemove(item.productId);
            }}
            disabled={isRemoving}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name} from wishlist`}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text className="text-sm font-medium text-red-600">Remove</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function WishlistScreen(): React.JSX.Element {
  const queryClient = useQueryClient();

  const {
    data: wishlist,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['wishlist'],
    queryFn: fetchWishlist,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to remove item from wishlist. Please try again.');
    },
  });

  const handleRemove = useCallback(
    (productId: string) => {
      removeMutation.mutate(productId);
    },
    [removeMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: WishlistItemEnriched }) => (
      <WishlistItem
        item={item}
        onRemove={handleRemove}
        isRemoving={removeMutation.isPending && removeMutation.variables === item.productId}
      />
    ),
    [handleRemove, removeMutation.isPending, removeMutation.variables],
  );

  const keyExtractor = useCallback((item: WishlistItemEnriched) => item.productId, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading wishlist...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load wishlist</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => {
            void refetch();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading wishlist"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!wishlist || wishlist.items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-4xl">♡</Text>
        <Text className="text-lg font-semibold text-gray-700 mt-3">Your wishlist is empty</Text>
        <Text className="mt-2 text-gray-500 text-center px-8">
          Save items you love to your wishlist and find them here anytime
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={wishlist.items}
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
              {wishlist.count} {wishlist.count === 1 ? 'item' : 'items'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
