import { registerSchema } from '@blipzo/shared';
import type { RegisterSchemaInput } from '@blipzo/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { apiClient } from '../../api/client';
import type { AuthStackParamList } from '../../navigation/RootNavigator';

type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface FormErrors {
  email?: string;
  phone?: string;
  password?: string;
  role?: string;
  general?: string;
}

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<RegisterNavigationProp>();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Buyer' | 'Seller'>('Buyer');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validateForm(): boolean {
    const input: RegisterSchemaInput = {
      password,
      role,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    };

    const result = registerSchema.safeParse(input);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors | undefined;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    if (!email.trim() && !phone.trim()) {
      setErrors({ general: 'Please provide either an email or phone number' });
      return false;
    }

    setErrors({});
    return true;
  }

  async function handleRegister(): Promise<void> {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const payload: RegisterSchemaInput = {
        password,
        role,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      };

      await apiClient.post('/auth/register', payload);
      navigation.navigate('Login');
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 409) {
        setErrors({ general: 'An account with this email or phone already exists' });
      } else if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data as { error?: { message?: string } };
        setErrors({ general: data.error?.message ?? 'Registration failed. Please try again.' });
      } else {
        setErrors({ general: 'Network error. Please check your connection.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900">Create Account</Text>
          <Text className="mt-2 text-base text-gray-500">Sign up to start shopping on BlipZo</Text>
        </View>

        {errors.general ? (
          <View className="mb-4 rounded-lg bg-red-50 p-3">
            <Text className="text-sm text-red-700">{errors.general}</Text>
          </View>
        ) : null}

        {/* Email Input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
          <TextInput
            className={`rounded-lg border px-4 py-3 text-base text-gray-900 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email address"
          />
          {errors.email ? <Text className="mt-1 text-xs text-red-500">{errors.email}</Text> : null}
        </View>

        {/* Phone Input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Phone (optional)</Text>
          <TextInput
            className={`rounded-lg border px-4 py-3 text-base text-gray-900 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+919876543210"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            accessibilityLabel="Phone number"
            accessibilityHint="Enter your phone number in E.164 format"
          />
          {errors.phone ? <Text className="mt-1 text-xs text-red-500">{errors.phone}</Text> : null}
        </View>

        {/* Password Input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700">Password</Text>
          <View className="relative">
            <TextInput
              className={`rounded-lg border px-4 py-3 pr-16 text-base text-gray-900 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Min 8 characters"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="newPassword"
              accessibilityLabel="Password"
              accessibilityHint="Enter a password with at least 8 characters, one uppercase, one lowercase, and one digit"
            />
            <TouchableOpacity
              className="absolute right-3 top-3"
              onPress={() => {
                setShowPassword(!showPassword);
              }}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
            >
              <Text className="text-sm font-medium text-indigo-600">
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text className="mt-1 text-xs text-red-500">{errors.password}</Text>
          ) : null}
          <Text className="mt-1 text-xs text-gray-400">
            Must include uppercase, lowercase, and a digit
          </Text>
        </View>

        {/* Role Selector */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-gray-700">I want to</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 rounded-lg border-2 px-4 py-3 ${
                role === 'Buyer' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'
              }`}
              onPress={() => {
                setRole('Buyer');
              }}
              accessibilityLabel="Register as Buyer"
              accessibilityRole="radio"
              accessibilityState={{ selected: role === 'Buyer' }}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  role === 'Buyer' ? 'text-indigo-700' : 'text-gray-600'
                }`}
              >
                Buy Products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg border-2 px-4 py-3 ${
                role === 'Seller' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'
              }`}
              onPress={() => {
                setRole('Seller');
              }}
              accessibilityLabel="Register as Seller"
              accessibilityRole="radio"
              accessibilityState={{ selected: role === 'Seller' }}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  role === 'Seller' ? 'text-indigo-700' : 'text-gray-600'
                }`}
              >
                Sell Products
              </Text>
            </TouchableOpacity>
          </View>
          {errors.role ? <Text className="mt-1 text-xs text-red-500">{errors.role}</Text> : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`rounded-lg px-4 py-4 ${isLoading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
          onPress={() => void handleRegister()}
          disabled={isLoading}
          accessibilityLabel="Create account"
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Navigation Links */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-sm text-gray-500">Already have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('Login');
            }}
            accessibilityLabel="Go to login"
            accessibilityRole="link"
          >
            <Text className="text-sm font-semibold text-indigo-600">Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isAxiosError(error: unknown): error is { response?: { status?: number; data?: unknown } } {
  return typeof error === 'object' && error !== null && 'response' in error;
}
