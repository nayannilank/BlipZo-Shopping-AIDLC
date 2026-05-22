import { loginSchema } from '@blipzo/shared';
import type { LoginSchemaInput, AuthResponse } from '@blipzo/shared';
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
import { useAuthStore } from '../../stores/auth.store';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<LoginNavigationProp>();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validateForm(): boolean {
    const input: LoginSchemaInput = {
      email: email.trim(),
      password,
    };

    const result = loginSchema.safeParse(input);

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

    setErrors({});
    return true;
  }

  async function handleLogin(): Promise<void> {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const payload: LoginSchemaInput = {
        email: email.trim(),
        password,
      };

      const response = await apiClient.post<AuthResponse>('/auth/login', payload);
      const { accessToken, refreshToken, userId, role } = response.data;

      setAuth({ accessToken, refreshToken, userId, role });
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        setErrors({ general: 'Invalid email or password' });
      } else if (isAxiosError(error) && error.response?.status === 423) {
        setErrors({
          general:
            'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
        });
      } else if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data as { error?: { message?: string } };
        setErrors({ general: data.error?.message ?? 'Login failed. Please try again.' });
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
          <Text className="text-3xl font-bold text-gray-900">Welcome Back</Text>
          <Text className="mt-2 text-base text-gray-500">Sign in to your BlipZo account</Text>
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
            accessibilityHint="Enter your registered email address"
          />
          {errors.email ? <Text className="mt-1 text-xs text-red-500">{errors.email}</Text> : null}
        </View>

        {/* Password Input */}
        <View className="mb-6">
          <Text className="mb-1 text-sm font-medium text-gray-700">Password</Text>
          <View className="relative">
            <TextInput
              className={`rounded-lg border px-4 py-3 pr-16 text-base text-gray-900 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
              accessibilityLabel="Password"
              accessibilityHint="Enter your account password"
            />
            <TouchableOpacity
              className="absolute right-3 top-3"
              onPress={() => {
                setShowPassword(!showPassword);
              }}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
            >
              <Text className="text-sm font-medium text-blue-600">
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text className="mt-1 text-xs text-red-500">{errors.password}</Text>
          ) : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`rounded-lg px-4 py-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
          onPress={() => void handleLogin()}
          disabled={isLoading}
          accessibilityLabel="Sign in"
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* OTP Login Link */}
        <TouchableOpacity
          className="mt-4 rounded-lg border border-gray-300 px-4 py-4"
          onPress={() => {
            navigation.navigate('Otp');
          }}
          accessibilityLabel="Sign in with OTP"
          accessibilityRole="button"
        >
          <Text className="text-center text-base font-semibold text-gray-700">
            Sign in with Phone OTP
          </Text>
        </TouchableOpacity>

        {/* Navigation Links */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-sm text-gray-500">Don&apos;t have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('Register');
            }}
            accessibilityLabel="Go to registration"
            accessibilityRole="link"
          >
            <Text className="text-sm font-semibold text-blue-600">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isAxiosError(error: unknown): error is { response?: { status?: number; data?: unknown } } {
  return typeof error === 'object' && error !== null && 'response' in error;
}
