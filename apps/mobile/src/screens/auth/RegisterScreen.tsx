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
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: string;
  dateOfBirth?: string;
  gender?: string;
  companyName?: string;
  companyUrl?: string;
  companyAddress?: string;
  tanPanNumber?: string;
  gstNumber?: string;
  inceptionDate?: string;
  general?: string;
}

type GenderValue = 'Male' | 'Female' | 'Other' | 'PreferNotToSay';

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<RegisterNavigationProp>();

  // Common fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Buyer' | 'Seller'>('Buyer');

  // Buyer fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<GenderValue | ''>('');

  // Seller fields
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [tanPanNumber, setTanPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [inceptionDate, setInceptionDate] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function buildPayload(): RegisterSchemaInput {
    const common = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };

    if (role === 'Buyer') {
      return {
        ...common,
        role: 'Buyer' as const,
        dateOfBirth: dateOfBirth.trim(),
        gender: gender as GenderValue,
      };
    }

    return {
      ...common,
      role: 'Seller' as const,
      companyName: companyName.trim(),
      companyUrl: companyUrl.trim(),
      companyAddress: companyAddress.trim(),
      tanPanNumber: tanPanNumber.trim(),
      gstNumber: gstNumber.trim(),
      inceptionDate: inceptionDate.trim(),
    };
  }

  function validateForm(): boolean {
    const input = buildPayload();
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

    setErrors({});
    return true;
  }

  async function handleRegister(): Promise<void> {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const payload = buildPayload();
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

  function renderInput(
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    fieldKey: keyof FormErrors,
    options: {
      placeholder?: string;
      keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
      secureTextEntry?: boolean;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
      textContentType?: string;
      accessibilityHint?: string;
    } = {},
  ): React.JSX.Element {
    return (
      <View className="mb-4">
        <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
        <TextInput
          className={`rounded-lg border px-4 py-3 text-base text-gray-900 ${
            errors[fieldKey] ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={options.placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={options.keyboardType ?? 'default'}
          secureTextEntry={options.secureTextEntry}
          autoCapitalize={options.autoCapitalize ?? 'none'}
          autoCorrect={false}
          accessibilityLabel={label}
          accessibilityHint={options.accessibilityHint}
        />
        {errors[fieldKey] ? (
          <Text className="mt-1 text-xs text-red-500">{errors[fieldKey]}</Text>
        ) : null}
      </View>
    );
  }

  const genderOptions: Array<{ value: GenderValue; label: string }> = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
    { value: 'PreferNotToSay', label: 'Prefer not to say' },
  ];

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
          <Text className="mt-2 text-base text-gray-500">Sign up to start using BlipZo</Text>
        </View>

        {errors.general ? (
          <View className="mb-4 rounded-lg bg-red-50 p-3">
            <Text className="text-sm text-red-700">{errors.general}</Text>
          </View>
        ) : null}

        {/* Role Selector */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-gray-700">I want to</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 rounded-lg border-2 px-4 py-3 ${
                role === 'Buyer' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'
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
                  role === 'Buyer' ? 'text-blue-700' : 'text-gray-600'
                }`}
              >
                Buy Products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg border-2 px-4 py-3 ${
                role === 'Seller' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'
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
                  role === 'Seller' ? 'text-blue-700' : 'text-gray-600'
                }`}
              >
                Sell Products
              </Text>
            </TouchableOpacity>
          </View>
          {errors.role ? <Text className="mt-1 text-xs text-red-500">{errors.role}</Text> : null}
        </View>

        {/* Common Fields */}
        {renderInput('First Name', firstName, setFirstName, 'firstName', {
          placeholder: 'John',
          autoCapitalize: 'words',
          accessibilityHint: 'Enter your first name',
        })}
        {renderInput('Last Name', lastName, setLastName, 'lastName', {
          placeholder: 'Doe',
          autoCapitalize: 'words',
          accessibilityHint: 'Enter your last name',
        })}
        {renderInput('Username', username, setUsername, 'username', {
          placeholder: 'johndoe123',
          accessibilityHint:
            'Enter a username with 3-30 alphanumeric characters, underscores, or hyphens',
        })}
        {renderInput('Email', email, setEmail, 'email', {
          placeholder: 'you@example.com',
          keyboardType: 'email-address',
          accessibilityHint: 'Enter your email address',
        })}
        {renderInput('Phone Number', phone, setPhone, 'phone', {
          placeholder: '+919876543210',
          keyboardType: 'phone-pad',
          accessibilityHint: 'Enter your phone number in E.164 format',
        })}

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
              <Text className="text-sm font-medium text-blue-600">
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

        {/* Buyer-specific fields */}
        {role === 'Buyer' ? (
          <View>
            {renderInput('Date of Birth', dateOfBirth, setDateOfBirth, 'dateOfBirth', {
              placeholder: 'YYYY-MM-DD',
              accessibilityHint: 'Enter your date of birth in YYYY-MM-DD format',
            })}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">Gender</Text>
              <View className="flex-row flex-wrap gap-2">
                {genderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    className={`rounded-lg border px-3 py-2 ${
                      gender === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white'
                    }`}
                    onPress={() => {
                      setGender(option.value);
                    }}
                    accessibilityLabel={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: gender === option.value }}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        gender === option.value ? 'text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender ? (
                <Text className="mt-1 text-xs text-red-500">{errors.gender}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Seller-specific fields */}
        {role === 'Seller' ? (
          <View>
            {renderInput('Company Name', companyName, setCompanyName, 'companyName', {
              placeholder: 'Acme Corp',
              autoCapitalize: 'words',
              accessibilityHint: 'Enter your company name',
            })}
            {renderInput('Company URL', companyUrl, setCompanyUrl, 'companyUrl', {
              placeholder: 'https://example.com',
              keyboardType: 'url',
              accessibilityHint: 'Enter your company website URL starting with https://',
            })}
            {renderInput('Company Address', companyAddress, setCompanyAddress, 'companyAddress', {
              placeholder: '123 Business St, City, Country',
              autoCapitalize: 'sentences',
              accessibilityHint: 'Enter your company address',
            })}
            {renderInput('TAN/PAN Number', tanPanNumber, setTanPanNumber, 'tanPanNumber', {
              placeholder: 'ABCDE1234F',
              accessibilityHint: 'Enter your 10-character PAN number',
            })}
            {renderInput('GST Number', gstNumber, setGstNumber, 'gstNumber', {
              placeholder: '22ABCDE1234F1Z5',
              accessibilityHint: 'Enter your 15-character GST number',
            })}
            {renderInput('Inception Date', inceptionDate, setInceptionDate, 'inceptionDate', {
              placeholder: 'YYYY-MM-DD',
              accessibilityHint: 'Enter your company inception date in YYYY-MM-DD format',
            })}
          </View>
        ) : null}

        {/* Submit Button */}
        <TouchableOpacity
          className={`rounded-lg px-4 py-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
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
            <Text className="text-sm font-semibold text-blue-600">Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isAxiosError(error: unknown): error is { response?: { status?: number; data?: unknown } } {
  return typeof error === 'object' && error !== null && 'response' in error;
}
