import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { fetchProductDetail, setProductPolicy } from '../../api/product.api';
import type { PolicyPayload } from '../../api/product.api';

import type { SellerDashboardParamList } from './types';

type NavigationProp = NativeStackNavigationProp<SellerDashboardParamList, 'PolicyConfig'>;
type PolicyConfigRouteProp = RouteProp<SellerDashboardParamList, 'PolicyConfig'>;

interface PolicyFormState {
  returnWindowDays: string;
  exchangeAllowed: boolean;
  conditions: string;
}

interface PolicyFormErrors {
  returnWindowDays?: string;
}

function validatePolicyForm(form: PolicyFormState): PolicyFormErrors {
  const errors: PolicyFormErrors = {};

  const days = parseInt(form.returnWindowDays, 10);
  if (form.returnWindowDays.trim() === '' || isNaN(days)) {
    errors.returnWindowDays = 'Return window days is required';
  } else if (days < 0) {
    errors.returnWindowDays = 'Return window days must be at least 0';
  } else if (days > 30) {
    errors.returnWindowDays = 'Return window days must be at most 30';
  }

  return errors;
}

export function PolicyConfigScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PolicyConfigRouteProp>();
  const { productId } = route.params;
  const queryClient = useQueryClient();

  const [form, setForm] = useState<PolicyFormState>({
    returnWindowDays: '7',
    exchangeAllowed: true,
    conditions: '',
  });
  const [errors, setErrors] = useState<PolicyFormErrors>({});

  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['productDetail', productId],
    queryFn: () => fetchProductDetail(productId),
  });

  // Populate form with existing policy data
  useEffect(() => {
    if (product?.sellerPolicy) {
      setForm({
        returnWindowDays: String(product.sellerPolicy.returnWindowDays),
        exchangeAllowed: product.sellerPolicy.exchangeAllowed,
        conditions: product.sellerPolicy.conditions ?? '',
      });
    }
  }, [product]);

  const policyMutation = useMutation({
    mutationFn: (payload: PolicyPayload) => setProductPolicy(productId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sellerProducts'] });
      void queryClient.invalidateQueries({ queryKey: ['productDetail', productId] });
      Alert.alert('Success', 'Policy has been updated.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update policy';
      Alert.alert('Error', message);
    },
  });

  const handleSubmit = useCallback(() => {
    const validationErrors = validatePolicyForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const payload: PolicyPayload = {
      returnWindowDays: parseInt(form.returnWindowDays, 10),
      exchangeAllowed: form.exchangeAllowed,
    };

    if (form.conditions.trim()) {
      payload.conditions = form.conditions.trim();
    }

    policyMutation.mutate(payload);
  }, [form, policyMutation]);

  if (isLoadingProduct) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading product policy...</Text>
      </View>
    );
  }

  const returnDays = parseInt(form.returnWindowDays, 10);
  const isNonReturnable = !isNaN(returnDays) && returnDays === 0;

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
        {/* Product Info Header */}
        {product && (
          <View className="bg-gray-50 rounded-lg p-4 mb-6">
            <Text className="text-sm text-gray-500">Configuring policy for:</Text>
            <Text className="text-base font-semibold text-gray-900 mt-1">{product.name}</Text>
          </View>
        )}

        {/* Return Window Days */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-1">Return Window (Days) *</Text>
          <Text className="text-xs text-gray-400 mb-2">
            Set to 0 for non-returnable products. Maximum 30 days.
          </Text>
          <TextInput
            className={`border rounded-lg px-3 py-3 text-base text-gray-900 ${
              errors.returnWindowDays ? 'border-red-400' : 'border-gray-300'
            }`}
            value={form.returnWindowDays}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, returnWindowDays: text }));
              setErrors((prev) => ({ ...prev, returnWindowDays: undefined }));
            }}
            placeholder="7"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            accessibilityLabel="Return window in days"
          />
          {errors.returnWindowDays && (
            <Text className="text-xs text-red-500 mt-1">{errors.returnWindowDays}</Text>
          )}
          {isNonReturnable && (
            <View className="mt-2 bg-yellow-50 rounded-md p-2">
              <Text className="text-xs text-yellow-700">
                ⚠ Setting return window to 0 makes this product non-returnable and non-exchangeable.
              </Text>
            </View>
          )}
        </View>

        {/* Exchange Allowed Toggle */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-medium text-gray-700">Allow Exchanges</Text>
              <Text className="text-xs text-gray-400 mt-1">
                Enable buyers to exchange this product for another.
              </Text>
            </View>
            <Switch
              value={form.exchangeAllowed}
              onValueChange={(value) => {
                setForm((prev) => ({ ...prev, exchangeAllowed: value }));
              }}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={form.exchangeAllowed ? '#4F46E5' : '#F3F4F6'}
              accessibilityLabel="Allow exchanges toggle"
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* Conditions */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-1">Conditions (Optional)</Text>
          <Text className="text-xs text-gray-400 mb-2">
            Specify any conditions for returns or exchanges.
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900"
            value={form.conditions}
            onChangeText={(text) => {
              setForm((prev) => ({ ...prev, conditions: text }));
            }}
            placeholder="e.g. Product must be unused and in original packaging"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
            accessibilityLabel="Return and exchange conditions"
          />
        </View>

        {/* Policy Summary */}
        <View className="bg-blue-50 rounded-lg p-4 mb-6">
          <Text className="text-sm font-semibold text-gray-800 mb-2">Policy Summary</Text>
          <Text className="text-sm text-gray-600">
            {isNonReturnable
              ? '• Non-returnable'
              : `• ${form.returnWindowDays || '0'}-day return window`}
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            {`• Exchange: ${form.exchangeAllowed ? 'Allowed' : 'Not allowed'}`}
          </Text>
          {form.conditions.trim() ? (
            <Text className="text-sm text-gray-600 mt-1">
              {`• Conditions: ${form.conditions.trim()}`}
            </Text>
          ) : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`rounded-lg py-4 items-center ${
            policyMutation.isPending ? 'bg-indigo-400' : 'bg-indigo-600'
          }`}
          onPress={handleSubmit}
          disabled={policyMutation.isPending}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Save policy"
        >
          {policyMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">Save Policy</Text>
          )}
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
