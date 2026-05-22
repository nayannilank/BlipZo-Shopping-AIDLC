import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { fetchCategories, type Category } from '../../api/catalogue.api';

type HomeNavigationProp = NativeStackNavigationProp<{
  Category: { categoryId: string; categoryName: string };
}>;

const CATEGORY_COLORS = [
  '#EFF6FF', // blue-50 (brand primary surface)
  '#F0FDF4', // green-50
  '#FFF7ED', // orange-50
  '#FDF2F8', // pink-50
  '#F0F9FF', // sky-50
  '#FFFBEB', // amber-50
  '#FAF5FF', // purple-50 (brand secondary surface)
  '#ECFDF5', // emerald-50
];

function CategoryCard({
  item,
  index,
  onPress,
}: {
  item: Category;
  index: number;
  onPress: () => void;
}): React.JSX.Element {
  const bgColor = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

  return (
    <TouchableOpacity
      className="flex-1 m-2 rounded-xl p-4 min-h-[120px] justify-center items-center"
      style={{ backgroundColor: bgColor }}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${item.name} category`}
    >
      <Text className="text-base font-semibold text-gray-800 text-center">{item.name}</Text>
    </TouchableOpacity>
  );
}

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeNavigationProp>();

  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const handleCategoryPress = useCallback(
    (category: Category) => {
      navigation.navigate('Category', {
        categoryId: category.categoryId,
        categoryName: category.name,
      });
    },
    [navigation],
  );

  const renderCategory = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <CategoryCard
        item={item}
        index={index}
        onPress={() => {
          handleCategoryPress(item);
        }}
      />
    ),
    [handleCategoryPress],
  );

  const keyExtractor = useCallback((item: Category) => item.categoryId, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-gray-500">Loading categories...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load categories</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-blue-600 px-6 py-3 rounded-lg"
          onPress={() => {
            void refetch();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading categories"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg font-semibold text-gray-700">No categories available</Text>
        <Text className="mt-2 text-gray-500">Check back later for new products</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={keyExtractor}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#2563EB"
          />
        }
        ListHeaderComponent={
          <View className="px-2 py-3">
            <Text className="text-2xl font-bold text-gray-900">Shop by Category</Text>
            <Text className="mt-1 text-gray-500">Browse our collection</Text>
          </View>
        }
      />
    </View>
  );
}
