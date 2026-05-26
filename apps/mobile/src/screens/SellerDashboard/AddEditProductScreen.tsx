import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { createProduct, updateProduct, fetchProductDetail } from '../../api/product.api';
import type { CreateProductPayload, UpdateProductPayload } from '../../api/product.api';

import type { SellerDashboardParamList } from './types';

type AddProductNavigationProp = NativeStackNavigationProp<SellerDashboardParamList, 'AddProduct'>;
type EditProductRouteProp = RouteProp<SellerDashboardParamList, 'EditProduct'>;

interface ImageItem {
  uri: string;
  filename: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  stockQuantity: string;
  categories: string;
  images: ImageItem[];
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  stockQuantity?: string;
  categories?: string;
  images?: string;
}

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function getContentType(uri: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function validateForm(form: FormState, isEdit: boolean): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Product name is required';
  } else if (form.name.trim().length > 200) {
    errors.name = 'Product name must be at most 200 characters';
  }

  if (!form.description.trim()) {
    errors.description = 'Product description is required';
  } else if (form.description.trim().length > 2000) {
    errors.description = 'Description must be at most 2000 characters';
  }

  const price = parseFloat(form.price);
  if (!form.price.trim() || isNaN(price)) {
    errors.price = 'Price is required';
  } else if (price <= 0) {
    errors.price = 'Price must be greater than 0';
  } else if (price > 9999999.99) {
    errors.price = 'Price must be at most 9,999,999.99';
  }

  const stock = parseInt(form.stockQuantity, 10);
  if (!form.stockQuantity.trim() || isNaN(stock)) {
    errors.stockQuantity = 'Stock quantity is required';
  } else if (stock < 0) {
    errors.stockQuantity = 'Stock quantity must be at least 0';
  } else if (stock > 999999) {
    errors.stockQuantity = 'Stock quantity must be at most 999,999';
  }

  const categories = form.categories
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (categories.length === 0) {
    errors.categories = 'At least one category is required';
  }

  if (!isEdit && form.images.length === 0) {
    errors.images = 'At least one image is required';
  } else if (form.images.length > MAX_IMAGES) {
    errors.images = 'At most 10 images are allowed';
  }

  return errors;
}

export function AddProductScreen(): React.JSX.Element {
  return <ProductForm mode="add" />;
}

export function EditProductScreen(): React.JSX.Element {
  const route = useRoute<EditProductRouteProp>();
  const { productId } = route.params;
  return <ProductForm mode="edit" productId={productId} />;
}

function ProductForm({
  mode,
  productId,
}: {
  mode: 'add' | 'edit';
  productId?: string;
}): React.JSX.Element {
  const navigation = useNavigation<AddProductNavigationProp>();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    price: '',
    stockQuantity: '',
    categories: '',
    images: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch existing product data for edit mode
  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['productDetail', productId],
    queryFn: () => fetchProductDetail(productId ?? ''),
    enabled: mode === 'edit' && !!productId,
  });

  // Populate form with existing product data
  useEffect(() => {
    if (existingProduct && mode === 'edit') {
      setForm({
        name: existingProduct.name,
        description: existingProduct.description,
        price: String(existingProduct.price),
        stockQuantity: String(existingProduct.stockQuantity),
        categories: (existingProduct.categories ?? []).join(', '),
        images: existingProduct.imageUrls.map((url, index) => ({
          uri: url,
          filename: `existing-image-${String(index)}.jpg`,
          contentType: 'image/jpeg' as const,
          sizeBytes: 0,
        })),
      });
    }
  }, [existingProduct, mode]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sellerProducts'] });
      Alert.alert('Success', 'Product created successfully.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create product';
      Alert.alert('Error', message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProductPayload) => updateProduct(productId ?? '', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sellerProducts'] });
      void queryClient.invalidateQueries({ queryKey: ['productDetail', productId] });
      Alert.alert('Success', 'Product updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update product';
      Alert.alert('Error', message);
    },
  });

  const pickImages = useCallback(async () => {
    const remainingSlots = MAX_IMAGES - form.images.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can add at most 10 images.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to add product images.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (result.canceled) return;

    const newImages: ImageItem[] = [];
    for (const asset of result.assets) {
      const sizeBytes = asset.fileSize ?? 0;
      if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
        Alert.alert('Image Too Large', `"${asset.fileName ?? 'Image'}" exceeds the 10 MB limit.`);
        continue;
      }

      newImages.push({
        uri: asset.uri,
        filename: asset.fileName ?? `image-${String(Date.now())}.jpg`,
        contentType: getContentType(asset.uri),
        sizeBytes,
      });
    }

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages].slice(0, MAX_IMAGES),
    }));
    setErrors((prev) => ({ ...prev, images: undefined }));
  }, [form.images.length]);

  const removeImage = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    const validationErrors = validateForm(form, mode === 'edit');
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const categories = form.categories
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (mode === 'add') {
      const payload: CreateProductPayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity, 10),
        categories,
        images: form.images,
      };
      createMutation.mutate(payload);
    } else {
      const payload: UpdateProductPayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity, 10),
        categories,
      };
      // Only include images if new ones were added (not existing URLs)
      const newImages = form.images.filter((img) => img.sizeBytes > 0);
      if (newImages.length > 0) {
        payload.images = newImages;
      }
      updateMutation.mutate(payload);
    }
  }, [form, mode, createMutation, updateMutation]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (mode === 'edit' && isLoadingProduct) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-gray-500">Loading product...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product Name */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1">Product Name *</Text>
          <TextInput
            className={`border rounded-lg px-3 py-3 text-base text-gray-900 ${
              errors.name ? 'border-red-400' : 'border-gray-300'
            }`}
            value={form.name}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, name: text }));
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Enter product name (1-200 characters)"
            placeholderTextColor="#9CA3AF"
            maxLength={200}
            accessibilityLabel="Product name"
          />
          {errors.name && <Text className="text-xs text-red-500 mt-1">{errors.name}</Text>}
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1">Description *</Text>
          <TextInput
            className={`border rounded-lg px-3 py-3 text-base text-gray-900 ${
              errors.description ? 'border-red-400' : 'border-gray-300'
            }`}
            value={form.description}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, description: text }));
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            placeholder="Enter product description (1-2000 characters)"
            placeholderTextColor="#9CA3AF"
            maxLength={2000}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100 }}
            accessibilityLabel="Product description"
          />
          {errors.description && (
            <Text className="text-xs text-red-500 mt-1">{errors.description}</Text>
          )}
          <Text className="text-xs text-gray-400 mt-1 text-right">
            {String(form.description.length)}/2000
          </Text>
        </View>

        {/* Price */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1">Price (₹) *</Text>
          <TextInput
            className={`border rounded-lg px-3 py-3 text-base text-gray-900 ${
              errors.price ? 'border-red-400' : 'border-gray-300'
            }`}
            value={form.price}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, price: text }));
              setErrors((prev) => ({ ...prev, price: undefined }));
            }}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            accessibilityLabel="Product price"
          />
          {errors.price && <Text className="text-xs text-red-500 mt-1">{errors.price}</Text>}
        </View>

        {/* Stock Quantity */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1">Stock Quantity *</Text>
          <TextInput
            className={`border rounded-lg px-3 py-3 text-base text-gray-900 ${
              errors.stockQuantity ? 'border-red-400' : 'border-gray-300'
            }`}
            value={form.stockQuantity}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, stockQuantity: text }));
              setErrors((prev) => ({ ...prev, stockQuantity: undefined }));
            }}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            accessibilityLabel="Stock quantity"
          />
          {errors.stockQuantity && (
            <Text className="text-xs text-red-500 mt-1">{errors.stockQuantity}</Text>
          )}
        </View>

        {/* Categories */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Categories * (comma-separated)
          </Text>
          <TextInput
            className={`border rounded-lg px-3 py-3 text-base text-gray-900 ${
              errors.categories ? 'border-red-400' : 'border-gray-300'
            }`}
            value={form.categories}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, categories: text }));
              setErrors((prev) => ({ ...prev, categories: undefined }));
            }}
            placeholder="e.g. Electronics, Gadgets"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel="Product categories"
          />
          {errors.categories && (
            <Text className="text-xs text-red-500 mt-1">{errors.categories}</Text>
          )}
        </View>

        {/* Images */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-1">
            {`Images * (${String(form.images.length)}/${String(MAX_IMAGES)})`}
          </Text>
          {errors.images && <Text className="text-xs text-red-500 mb-2">{errors.images}</Text>}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {form.images.map((image, index) => (
              <View key={`${image.uri}-${String(index)}`} className="mr-2 relative">
                <Image
                  source={{ uri: image.uri }}
                  className="w-24 h-24 rounded-lg"
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={`Product image ${String(index + 1)}`}
                />
                <TouchableOpacity
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                  onPress={() => {
                    removeImage(index);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove image ${String(index + 1)}`}
                >
                  <Text className="text-white text-xs font-bold">✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {form.images.length < MAX_IMAGES && (
              <TouchableOpacity
                className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center"
                onPress={() => {
                  void pickImages();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Add product images"
              >
                <Text className="text-gray-400 text-2xl">+</Text>
                <Text className="text-gray-400 text-xs mt-1">Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Text className="text-xs text-gray-400">JPEG, PNG, or WebP. Max 10 MB each.</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`rounded-lg py-4 items-center ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600'}`}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={mode === 'add' ? 'Create product' : 'Update product'}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {mode === 'add' ? 'Create Product' : 'Update Product'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
