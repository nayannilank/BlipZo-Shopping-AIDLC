import type { CatalogueItem } from '@blipzo/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';

import { searchProducts } from '../../api/catalogue.api';

type SearchNavigationProp = NativeStackNavigationProp<{
  ProductDetail: { productId: string };
}>;

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

function SearchResultCard({
  item,
  onPress,
}: {
  item: CatalogueItem;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      className="flex-row bg-white mx-4 my-1 p-3 rounded-lg border border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name}, priced at ${String(item.price)}`}
    >
      <Image
        source={{ uri: item.primaryImageUrl }}
        className="w-20 h-20 rounded-lg"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View className="flex-1 ml-3 justify-center">
        <Text className="text-sm font-medium text-gray-900" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-1 text-base font-bold text-indigo-600">
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

export function SearchScreen(): React.JSX.Element {
  const navigation = useNavigation<SearchNavigationProp>();
  const [searchText, setSearchText] = useState('');
  const debouncedQuery = useDebounce(searchText.trim(), DEBOUNCE_MS);
  const inputRef = useRef<TextInput>(null);

  const isQueryValid = debouncedQuery.length > 0;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['searchProducts', debouncedQuery],
      queryFn: ({ pageParam }) => searchProducts(debouncedQuery, PAGE_SIZE, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: isQueryValid,
    });

  const allResults = data?.pages.flatMap((page) => page.items) ?? [];

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

  const renderResult = useCallback(
    ({ item }: { item: CatalogueItem }) => (
      <SearchResultCard
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
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmptyState = useCallback(() => {
    if (!isQueryValid) {
      return (
        <View className="flex-1 items-center justify-center pt-20">
          <Text className="text-lg text-gray-400">Search for products</Text>
          <Text className="mt-2 text-sm text-gray-400">Type a product name or keyword</Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center pt-20">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-3 text-gray-500">Searching...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View className="flex-1 items-center justify-center pt-20">
          <Text className="text-lg font-semibold text-red-600">Search failed</Text>
          <Text className="mt-2 text-gray-500">Please try again</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center pt-20">
        <Text className="text-lg text-gray-500">No results found</Text>
        <Text className="mt-2 text-sm text-gray-400">Try a different search term</Text>
      </View>
    );
  }, [isQueryValid, isLoading, isError]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            ref={inputRef}
            className="flex-1 text-base text-gray-900"
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search products"
            accessibilityHint="Type to search for products"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={allResults}
        renderItem={renderResult}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
