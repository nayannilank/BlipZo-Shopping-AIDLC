import { otpRequestSchema, otpVerifySchema } from '@blipzo/shared';
import type { OtpRequestSchemaInput, OtpVerifySchemaInput, AuthResponse } from '@blipzo/shared';
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

type OtpNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Otp'>;

type OtpStep = 'request' | 'verify';

interface FormErrors {
  phone?: string;
  otp?: string;
  general?: string;
}

export function OtpScreen(): React.JSX.Element {
  const navigation = useNavigation<OtpNavigationProp>();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [step, setStep] = useState<OtpStep>('request');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function validatePhoneStep(): boolean {
    const input: OtpRequestSchemaInput = { phone: phone.trim() };
    const result = otpRequestSchema.safeParse(input);

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

  function validateVerifyStep(): boolean {
    const input: OtpVerifySchemaInput = { phone: phone.trim(), otp: otp.trim() };
    const result = otpVerifySchema.safeParse(input);

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

  async function handleRequestOtp(): Promise<void> {
    if (!validatePhoneStep()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const payload: OtpRequestSchemaInput = { phone: phone.trim() };
      await apiClient.post('/auth/otp/request', payload);
      setStep('verify');
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        setErrors({ general: 'Phone number not registered. Please sign up first.' });
      } else if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data as { error?: { message?: string } };
        setErrors({ general: data.error?.message ?? 'Failed to send OTP. Please try again.' });
      } else {
        setErrors({ general: 'Network error. Please check your connection.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(): Promise<void> {
    if (!validateVerifyStep()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const payload: OtpVerifySchemaInput = { phone: phone.trim(), otp: otp.trim() };
      const response = await apiClient.post<AuthResponse>('/auth/otp/verify', payload);
      const { accessToken, refreshToken, userId, role } = response.data;

      setAuth({ accessToken, refreshToken, userId, role });
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 400) {
        const data = error.response.data as { error?: { code?: string; message?: string } };
        if (data.error?.code === 'OTP_EXPIRED') {
          setErrors({ general: 'OTP has expired. Please request a new one.' });
          setStep('request');
          setOtp('');
        } else if (data.error?.code === 'OTP_INVALID') {
          setErrors({ otp: 'Incorrect OTP. Please try again.' });
        } else {
          setErrors({ general: data.error?.message ?? 'Verification failed.' });
        }
      } else if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data as { error?: { message?: string } };
        setErrors({ general: data.error?.message ?? 'Verification failed. Please try again.' });
      } else {
        setErrors({ general: 'Network error. Please check your connection.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleResendOtp(): void {
    setOtp('');
    setErrors({});
    setStep('request');
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
          <Text className="text-3xl font-bold text-gray-900">
            {step === 'request' ? 'Phone Login' : 'Verify OTP'}
          </Text>
          <Text className="mt-2 text-base text-gray-500">
            {step === 'request'
              ? 'Enter your phone number to receive a one-time code'
              : `Enter the 6-digit code sent to ${phone}`}
          </Text>
        </View>

        {errors.general ? (
          <View className="mb-4 rounded-lg bg-red-50 p-3">
            <Text className="text-sm text-red-700">{errors.general}</Text>
          </View>
        ) : null}

        {step === 'request' ? (
          <>
            {/* Phone Input */}
            <View className="mb-6">
              <Text className="mb-1 text-sm font-medium text-gray-700">Phone Number</Text>
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
                accessibilityHint="Enter your registered phone number in E.164 format"
              />
              {errors.phone ? (
                <Text className="mt-1 text-xs text-red-500">{errors.phone}</Text>
              ) : null}
              <Text className="mt-1 text-xs text-gray-400">
                Include country code (e.g., +91 for India)
              </Text>
            </View>

            {/* Request OTP Button */}
            <TouchableOpacity
              className={`rounded-lg px-4 py-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={() => void handleRequestOtp()}
              disabled={isLoading}
              accessibilityLabel="Send OTP"
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* OTP Input */}
            <View className="mb-6">
              <Text className="mb-1 text-sm font-medium text-gray-700">One-Time Code</Text>
              <TextInput
                className={`rounded-lg border px-4 py-3 text-center text-2xl font-bold tracking-widest text-gray-900 ${
                  errors.otp ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="000000"
                placeholderTextColor="#9CA3AF"
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                }}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                accessibilityLabel="OTP code"
                accessibilityHint="Enter the 6-digit code sent to your phone"
              />
              {errors.otp ? <Text className="mt-1 text-xs text-red-500">{errors.otp}</Text> : null}
              <Text className="mt-2 text-xs text-gray-400">Code expires in 10 minutes</Text>
            </View>

            {/* Verify OTP Button */}
            <TouchableOpacity
              className={`rounded-lg px-4 py-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={() => void handleVerifyOtp()}
              disabled={isLoading}
              accessibilityLabel="Verify OTP"
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  Verify & Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend OTP */}
            <TouchableOpacity
              className="mt-4"
              onPress={handleResendOtp}
              accessibilityLabel="Resend OTP"
              accessibilityRole="button"
            >
              <Text className="text-center text-sm font-medium text-blue-600">
                Didn&apos;t receive the code? Resend
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Back to Login */}
        <View className="mt-6 flex-row items-center justify-center">
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('Login');
            }}
            accessibilityLabel="Back to email login"
            accessibilityRole="link"
          >
            <Text className="text-sm font-semibold text-blue-600">← Back to Email Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isAxiosError(error: unknown): error is { response?: { status?: number; data?: unknown } } {
  return typeof error === 'object' && error !== null && 'response' in error;
}
