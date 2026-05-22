import React from 'react';
import { View, Text } from 'react-native';

export function SellerProfileScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold text-gray-900">Seller Profile</Text>
      <Text className="mt-2 text-gray-500">Your seller account settings</Text>
    </View>
  );
}
