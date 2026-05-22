import type { ProductRecord } from '@blipzo/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';

import { fetchSellerProducts, deleteProduct } from '../../api/product.api';

import type { SellerDashboardParamList } from './types';

type NavigationProp = NativeStackNavigationProp<SellerDashboardParamList>;

function ProductCard({
  product,
  onEdit,
  onDelete,
  onConfigurePolicy,
}: {
  product: ProductRecord;
  onEdit: (product: ProductRecord) => void;
  onDelete: (productId: string) => void;
  onConfigurePolicy: (product: ProductRecord) => void;
}): React.JSX.Element {
  const primaryImage = product.imageUrls[0];

  return (
    <View className="bg-white rounded-lg border border-gray-200 p-4 mb-3 mx-4">
      <View className="flex-row">
        {primaryImage ? (
          <Image
            source={{ uri: primaryImage }}
            className="w-20 h-20 rounded-lg"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessibilityLabel={`Image of ${product.name}`}
          />
        ) : (
          <View className="w-20 h-20 rounded-lg bg-gray-200 items-center justify-center">
            <Text className="text-gray-400 text-xs">No Image</Text>
          </View>
        )}

        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
            {product.name}
          </Text>
          <Text className="text-sm text-indigo-600 font-medium mt-1">
            {`₹${product.price.toLocaleString()}`}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-gray-500">
              {`Stock: ${String(product.stockQuantity)}`}
            </Text>
            {product.isDeleted && (
              <View className="ml-2 bg-red-100 rounded px-2 py-0.5">
                <Text className="text-xs text-red-600">Deleted</Text>
              </View>
            )}
          </View>
          {product.categories.length > 0 && (
            <Text className="text-xs text-gray-400 mt-1" numberOfLines={1}>
              {product.categories.join(', ')}
            </Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      {!product.isDeleted && (
        <View className="flex-row mt-3 pt-3 border-t border-gray-100">
          <TouchableOpacity
            className="flex-1 mr-1 bg-indigo-50 rounded-md py-2 items-center"
            onPress={() => {
              onEdit(product);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${product.name}`}
          >
            <Text className="text-indigo-600 text-sm font-medium">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 mx-1 bg-blue-50 rounded-md py-2 items-center"
            onPress={() => {
              onConfigurePolicy(product);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Configure policy for ${product.name}`}
          >
            <Text className="text-blue-600 text-sm font-medium">Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 ml-1 bg-red-50 rounded-md py-2 items-center"
            onPress={() => {
              onDelete(product.productId);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${product.name}`}
          >
            <Text className="text-red-600 text-sm font-medium">Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function SellerProductListScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['sellerProducts'],
    queryFn: () => fetchSellerProducts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sellerProducts'] });
      Alert.alert('Success', 'Product has been deleted.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete product. Please try again.');
    },
  });

  const handleEdit = useCallback(
    (product: ProductRecord) => {
      navigation.navigate('EditProduct', { productId: product.productId });
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (productId: string) => {
      Alert.alert(
        'Delete Product',
        'Are you sure you want to delete this product? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(productId);
            },
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleConfigurePolicy = useCallback(
    (product: ProductRecord) => {
      navigation.navigate('PolicyConfig', { productId: product.productId });
    },
    [navigation],
  );

  const handleAddProduct = useCallback(() => {
    navigation.navigate('AddProduct');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: ProductRecord }) => (
      <ProductCard
        product={item}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onConfigurePolicy={handleConfigurePolicy}
      />
    ),
    [handleEdit, handleDelete, handleConfigurePolicy],
  );

  const renderEmpty = useCallback(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-lg font-semibold text-gray-600">No Products Yet</Text>
        <Text className="mt-2 text-gray-400 text-center px-8">
          Start by adding your first product to your store.
        </Text>
        <TouchableOpacity
          className="mt-4 bg-indigo-600 rounded-lg px-6 py-3"
          onPress={handleAddProduct}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add your first product"
        >
          <Text className="text-white font-semibold">Add Product</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleAddProduct],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading your products...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load products</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-indigo-600 rounded-lg px-6 py-3"
          onPress={() => {
            void refetch();
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retry loading products"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const products = data?.items ?? [];

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.productId}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            colors={['#4F46E5']}
          />
        }
      />

      {/* Floating Add Button */}
      {products.length > 0 && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg"
          onPress={handleAddProduct}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add new product"
        >
          <Text className="text-white text-2xl font-bold">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
