import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { fetchOrders, type OrderRecord } from '../../api/order.api';

type OrdersNavigationProp = NativeStackNavigationProp<{
  OrderDetail: { orderId: string };
}>;

const STATUS_COLORS: Record<OrderRecord['orderStatus'], { bg: string; text: string }> = {
  Confirmed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Processing: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Shipped: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Delivered: { bg: 'bg-green-100', text: 'text-green-700' },
  Cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

function OrderStatusBadge({ status }: { status: OrderRecord['orderStatus'] }): React.JSX.Element {
  const colors = STATUS_COLORS[status];
  return (
    <View
      className={`${colors.bg} rounded-full px-2.5 py-0.5`}
      accessibilityLabel={`Status: ${status}`}
    >
      <Text className={`text-xs font-medium ${colors.text}`}>{status}</Text>
    </View>
  );
}

function OrderListItem({
  order,
  onPress,
}: {
  order: OrderRecord;
  onPress: (orderId: string) => void;
}): React.JSX.Element {
  const formattedDate = new Date(order.orderTimestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const itemsSummary =
    order.items.length === 1
      ? order.items[0].name
      : `${order.items[0].name} +${String(order.items.length - 1)} more`;

  return (
    <TouchableOpacity
      className="bg-white mx-4 my-2 rounded-xl p-4 border border-gray-100"
      onPress={() => {
        onPress(order.orderId);
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderId.slice(0, 8)}, ${formattedDate}, ${order.orderStatus}, total ${String(order.totalAmount)} rupees`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold text-gray-900">
          #{order.orderId.slice(0, 8).toUpperCase()}
        </Text>
        <OrderStatusBadge status={order.orderStatus} />
      </View>
      <Text className="text-sm text-gray-600" numberOfLines={1}>
        {itemsSummary}
      </Text>
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-xs text-gray-500">{formattedDate}</Text>
        <Text className="text-base font-bold text-indigo-600">₹{order.totalAmount.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function OrdersScreen(): React.JSX.Element {
  const navigation = useNavigation<OrdersNavigationProp>();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['orders'],
    queryFn: ({ pageParam }) => fetchOrders(20, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const allOrders = data?.pages.flatMap((page) => page.orders) ?? [];

  const handleOrderPress = useCallback(
    (orderId: string) => {
      navigation.navigate('OrderDetail', { orderId });
    },
    [navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: OrderRecord }) => <OrderListItem order={item} onPress={handleOrderPress} />,
    [handleOrderPress],
  );

  const keyExtractor = useCallback((item: OrderRecord) => item.orderId, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading orders...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load orders</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => {
            void refetch();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading orders"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (allOrders.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-4xl">📦</Text>
        <Text className="text-lg font-semibold text-gray-700 mt-3">No orders yet</Text>
        <Text className="mt-2 text-gray-500 text-center px-8">
          Your order history will appear here once you place an order
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={allOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingVertical: 8 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor="#4F46E5"
          />
        }
        ListHeaderComponent={
          <View className="px-4 py-2">
            <Text className="text-sm text-gray-500">
              {allOrders.length} {allOrders.length === 1 ? 'order' : 'orders'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
