import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { useAuthStore } from '../stores/auth.store';

import { BuyerTabs } from './BuyerTabs';
import { SellerStack } from './SellerStack';

export type RootStackParamList = {
  Auth: undefined;
  BuyerMain: undefined;
  SellerMain: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Otp: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();

function AuthStack(): React.JSX.Element {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
      <AuthStackNav.Screen name="Otp" component={OtpScreen} />
    </AuthStackNav.Navigator>
  );
}

export function RootNavigator(): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);
  const role = useAuthStore((state) => state.role);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    // Could show a splash screen here while store rehydrates
    return <></>;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <RootStack.Screen name="Auth" component={AuthStack} />
      ) : role === 'Seller' ? (
        <RootStack.Screen name="SellerMain" component={SellerStack} />
      ) : (
        <RootStack.Screen name="BuyerMain" component={BuyerTabs} />
      )}
    </RootStack.Navigator>
  );
}
