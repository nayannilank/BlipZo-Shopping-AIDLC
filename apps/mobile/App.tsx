import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineIndicator } from './src/components/OfflineIndicator';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationTheme } from './src/navigation/theme';
import { useUiStore } from './src/stores/ui.store';
import './src/global.css';

// Prevent the splash screen from auto-hiding until the app is ready
SplashScreen.preventAutoHideAsync();

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
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const cleanup = initListeners();

    // Mark app as ready after initialization
    setAppIsReady(true);

    return cleanup;
  }, [initListeners]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <></>;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navigationTheme}>
          <View className="flex-1" onLayout={onLayoutRootView}>
            <OfflineIndicator />
            <RootNavigator />
          </View>
        </NavigationContainer>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
