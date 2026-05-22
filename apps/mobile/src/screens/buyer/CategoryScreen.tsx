import type { CatalogueItem } from '@blipzo/shared';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';

import { fetchCategoryProducts } from '../../api/catalogue.api';

type CategoryScreenRouteProp = RouteProp<
  { Category: { categoryId: string; categoryName: string } },
  'Category'
>;

type CategoryNavigationProp = NativeStackNavigationProp<{
  ProductDetail: { productId: string };
}>;

const PAGE_SIZE = 20;

function ProductCard({
  item,
  onPress,
}: {
  item: CatalogueItem;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      className="flex-1 m-2 bg-white rounded-xl border border-gray-100 overflow-hidden"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name}, priced at ${String(item.price)}`}
    >
      <Image
        source={{ uri: item.primaryImageUrl }}
        className="w-full h-40"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View className="p-3">
        <Text className="text-sm font-medium text-gray-900" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-1 text-base font-bold text-blue-600">
          ₹{item.price.toLocaleString()}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-xs text-yellow-600">★ {item.averageRating.toFixed(1)}</Text>
          <Text className="text-xs text-gray-400 ml-2">{item.sellerName}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function CategoryScreen(): React.JSX.Element {
  const route = useRoute<CategoryScreenRouteProp>();
  const navigation = useNavigation<CategoryNavigationProp>();
  const { categoryId, categoryName } = route.params;

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['categoryProducts', categoryId],
      queryFn: ({ pageParam }) => fetchCategoryProducts(categoryId, PAGE_SIZE, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  const allProducts = data?.pages.flatMap((page) => page.items) ?? [];

  const handleProductPress = useCallback(
    (productId: string) => {
      navigation.navigate('ProductDetail', { productId });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderProduct = useCallback(
    ({ item }: { item: CatalogueItem }) => (
      <ProductCard
        item={item}
        onPress={() => {
          handleProductPress(item.productId);
        }}
      />
    ),
    [handleProductPress],
  );

  const keyExtractor = useCallback((item: CatalogueItem) => item.productId, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#2563EB" />
        <Text className="mt-2 text-xs text-gray-500">Loading more...</Text>
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-gray-500">Loading products...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load products</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
      </View>
    );
  }

  if (allProducts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg font-semibold text-gray-700">No products found</Text>
        <Text className="mt-2 text-gray-500">No products available in {categoryName}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={allProducts}
        renderItem={renderProduct}
        keyExtractor={keyExtractor}
        numColumns={2}
        contentContainerStyle={{ padding: 4 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListHeaderComponent={
          <View className="px-4 py-3">
            <Text className="text-xl font-bold text-gray-900">{categoryName}</Text>
          </View>
        }
      />
    </View>
  );
}
