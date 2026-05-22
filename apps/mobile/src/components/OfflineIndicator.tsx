import React from 'react';
import { View, Text } from 'react-native';

import { useUiStore } from '../stores/ui.store';

export function OfflineIndicator(): React.JSX.Element | null {
  const isOnline = useUiStore((state) => state.isOnline);

  if (isOnline) {
    return null;
  }

  return (
    <View className="bg-red-500 px-4 py-2">
      <Text className="text-center text-sm font-medium text-white">
        No internet connection. Some features may be unavailable.
      </Text>
    </View>
  );
}
