import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

import type { ProfileStackParamList } from '../../navigation/BuyerTabs';
import { useAuthStore } from '../../stores/auth.store';

type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

function ProfileMenuItem({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      className="bg-white mx-4 my-1.5 rounded-xl p-4 border border-gray-100 flex-row items-center justify-between"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
    >
      <View>
        <Text className="text-base font-medium text-gray-900">{title}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>
      </View>
      <Text className="text-gray-400 text-lg">›</Text>
    </TouchableOpacity>
  );
}

export function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<ProfileNavigationProp>();
  const logout = useAuthStore((state) => state.logout);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  }, [logout]);

  const handleNavigateAddresses = useCallback(() => {
    navigation.navigate('Addresses');
  }, [navigation]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* User Info */}
      <View className="bg-white mx-4 mt-4 rounded-xl p-4 border border-gray-100 items-center">
        <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-3">
          <Text className="text-2xl font-bold text-blue-600">{role?.charAt(0) ?? 'U'}</Text>
        </View>
        <Text className="text-base font-semibold text-gray-900">
          {role === 'Buyer' ? 'Buyer Account' : 'Account'}
        </Text>
        {userId && <Text className="text-xs text-gray-500 mt-1">ID: {userId.slice(0, 8)}...</Text>}
      </View>

      {/* Menu Items */}
      <View className="mt-4">
        <ProfileMenuItem
          title="My Addresses"
          subtitle="Manage delivery addresses"
          onPress={handleNavigateAddresses}
        />
      </View>

      {/* Logout */}
      <View className="mx-4 mt-6">
        <TouchableOpacity
          className="border border-red-300 bg-red-50 rounded-lg py-3.5 items-center"
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Text className="text-sm font-semibold text-red-600">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
