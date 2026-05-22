import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HeaderLogo } from '../components/HeaderLogo';
import { SellerProfileScreen } from '../screens/seller/SellerProfileScreen';
import {
  SellerProductListScreen,
  AddProductScreen,
  EditProductScreen,
  PolicyConfigScreen,
} from '../screens/SellerDashboard';
import type { SellerDashboardParamList } from '../screens/SellerDashboard';

import { brandHeaderOptions } from './theme';

export type SellerStackParamList = SellerDashboardParamList & {
  SellerProfile: undefined;
};

const Stack = createNativeStackNavigator<SellerStackParamList>();

export function SellerStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={brandHeaderOptions}>
      <Stack.Screen
        name="ProductList"
        component={SellerProductListScreen}
        options={{ headerTitle: () => <HeaderLogo /> }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: 'Add Product' }}
      />
      <Stack.Screen
        name="EditProduct"
        component={EditProductScreen}
        options={{ title: 'Edit Product' }}
      />
      <Stack.Screen
        name="PolicyConfig"
        component={PolicyConfigScreen}
        options={{ title: 'Return & Exchange Policy' }}
      />
      <Stack.Screen
        name="SellerProfile"
        component={SellerProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
}
