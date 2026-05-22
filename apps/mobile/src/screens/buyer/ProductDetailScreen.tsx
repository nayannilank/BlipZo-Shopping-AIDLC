import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';

import { addToCart } from '../../api/cart.api';
import { fetchProductDetail } from '../../api/catalogue.api';
import { addToWishlist } from '../../api/wishlist.api';
import { useAuthStore } from '../../stores/auth.store';
import { useCartStore } from '../../stores/cart.store';

type ProductDetailRouteProp = RouteProp<{ ProductDetail: { productId: string } }, 'ProductDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ImageCarousel({ imageUrls }: { imageUrls: string[] }): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

  const renderImage = useCallback(
    ({ item }: { item: string }) => (
      <Image
        source={{ uri: item }}
        style={{ width: SCREEN_WIDTH, height: 300 }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityLabel="Product image"
      />
    ),
    [],
  );

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={imageUrls}
        renderItem={renderImage}
        keyExtractor={(_, index) => `image-${String(index)}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      {imageUrls.length > 1 && (
        <View className="flex-row justify-center py-2">
          {imageUrls.map((_, index) => (
            <View
              key={`dot-${String(index)}`}
              className={`w-2 h-2 rounded-full mx-1 ${
                index === activeIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function ProductDetailScreen(): React.JSX.Element {
  const route = useRoute<ProductDetailRouteProp>();
  const { productId } = route.params;
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);
  const optimisticAddItem = useCartStore((state) => state.optimisticAddItem);

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['productDetail', productId],
    queryFn: () => fetchProductDetail(productId),
  });

  const addToCartMutation = useMutation({
    mutationFn: () => addToCart(productId, 1),
    onSuccess: () => {
      if (product) {
        optimisticAddItem({
          productId: product.productId,
          name: product.name,
          price: product.price,
          primaryImageUrl: product.imageUrls[0] ?? '',
          quantity: 1,
          subtotal: product.price,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Added to Cart', `${product?.name ?? 'Item'} has been added to your cart.`);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: () => addToWishlist(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      Alert.alert(
        'Added to Wishlist',
        `${product?.name ?? 'Item'} has been saved to your wishlist.`,
      );
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add item to wishlist. Please try again.');
    },
  });

  const handleAddToCart = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to add items to your cart.');
      return;
    }
    addToCartMutation.mutate();
  }, [isAuthenticated, addToCartMutation]);

  const handleAddToWishlist = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to add items to your wishlist.');
      return;
    }
    addToWishlistMutation.mutate();
  }, [isAuthenticated, addToWishlistMutation]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-gray-500">Loading product details...</Text>
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-semibold text-red-600">Product not found</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'Unable to load product details'}
        </Text>
      </View>
    );
  }

  const inStock = product.stockQuantity > 0;

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Image Carousel */}
        <ImageCarousel imageUrls={product.imageUrls} />

        {/* Product Info */}
        <View className="px-4 py-4">
          <Text className="text-2xl font-bold text-gray-900">{product.name}</Text>

          <Text className="mt-2 text-2xl font-bold text-blue-600">
            ₹{product.price.toLocaleString()}
          </Text>

          {/* Rating & Seller */}
          <View className="flex-row items-center mt-2">
            {product.averageRating !== undefined && (
              <Text className="text-sm text-yellow-600">★ {product.averageRating.toFixed(1)}</Text>
            )}
            {product.sellerName && (
              <Text className="text-sm text-gray-500 ml-3">Sold by {product.sellerName}</Text>
            )}
          </View>

          {/* Stock Status */}
          <View className="mt-3">
            {inStock ? (
              <Text className="text-sm font-medium text-green-600">
                In Stock ({product.stockQuantity} available)
              </Text>
            ) : (
              <Text className="text-sm font-medium text-red-600">Out of Stock</Text>
            )}
          </View>

          {/* Description */}
          <View className="mt-4">
            <Text className="text-base font-semibold text-gray-800">Description</Text>
            <Text className="mt-2 text-sm text-gray-600 leading-5">{product.description}</Text>
          </View>

          {/* Categories */}
          {product.categories.length > 0 && (
            <View className="mt-4">
              <Text className="text-base font-semibold text-gray-800">Categories</Text>
              <View className="flex-row flex-wrap mt-2">
                {product.categories.map((category) => (
                  <View key={category} className="bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2">
                    <Text className="text-xs text-gray-700">{category}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Return/Exchange Policy */}
          {product.sellerPolicy && (
            <View className="mt-4 bg-blue-50 rounded-lg p-3">
              <Text className="text-base font-semibold text-gray-800">
                Return & Exchange Policy
              </Text>
              <View className="mt-2">
                {product.sellerPolicy.returnWindowDays > 0 ? (
                  <Text className="text-sm text-gray-600">
                    • {product.sellerPolicy.returnWindowDays}-day return window
                  </Text>
                ) : (
                  <Text className="text-sm text-gray-600">• Non-returnable</Text>
                )}
                <Text className="text-sm text-gray-600 mt-1">
                  • Exchange: {product.sellerPolicy.exchangeAllowed ? 'Available' : 'Not available'}
                </Text>
                {product.sellerPolicy.conditions && (
                  <Text className="text-sm text-gray-500 mt-1">
                    • {product.sellerPolicy.conditions}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="flex-row px-4 py-3 border-t border-gray-200 bg-white">
        <TouchableOpacity
          className="flex-1 mr-2 border border-blue-600 rounded-lg py-3 items-center"
          onPress={handleAddToWishlist}
          disabled={addToWishlistMutation.isPending}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add to wishlist"
        >
          {addToWishlistMutation.isPending ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text className="text-blue-600 font-semibold">♡ Wishlist</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 ml-2 rounded-lg py-3 items-center ${
            inStock ? 'bg-blue-600' : 'bg-gray-300'
          }`}
          onPress={handleAddToCart}
          disabled={!inStock || addToCartMutation.isPending}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={inStock ? 'Add to cart' : 'Out of stock'}
        >
          {addToCartMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">
              {inStock ? 'Add to Cart' : 'Out of Stock'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
