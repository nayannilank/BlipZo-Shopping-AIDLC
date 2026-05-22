import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineIndicator } from './src/components/OfflineIndicator';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useUiStore } from './src/stores/ui.store';
import './src/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function App(): React.JSX.Element {
  const initListeners = useUiStore((state) => state.initListeners);

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <View className="flex-1">
            <OfflineIndicator />
            <RootNavigator />
          </View>
        </NavigationContainer>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
