import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HeaderLogo } from '../components/HeaderLogo';
import { AddressesScreen } from '../screens/buyer/AddressesScreen';
import { CartScreen } from '../screens/buyer/CartScreen';
import { CategoryScreen } from '../screens/buyer/CategoryScreen';
import { CheckoutScreen } from '../screens/buyer/CheckoutScreen';
import { HomeScreen } from '../screens/buyer/HomeScreen';
import { OrderDetailScreen } from '../screens/buyer/OrderDetailScreen';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { ProductDetailScreen } from '../screens/buyer/ProductDetailScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import { SearchScreen } from '../screens/buyer/SearchScreen';
import { WishlistScreen } from '../screens/buyer/WishlistScreen';

import { brandHeaderOptions, brandTabBarOptions } from './theme';

export type HomeStackParamList = {
  HomeMain: undefined;
  Category: { categoryId: string; categoryName: string };
  ProductDetail: { productId: string };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  ProductDetail: { productId: string };
};

export type CartStackParamList = {
  CartMain: undefined;
  Checkout: undefined;
};

export type OrdersStackParamList = {
  OrdersMain: undefined;
  OrderDetail: { orderId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Addresses: undefined;
};

export type BuyerTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CartTab: undefined;
  Wishlist: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<BuyerTabParamList>();

function HomeStackScreen(): React.JSX.Element {
  return (
    <HomeStack.Navigator screenOptions={brandHeaderOptions}>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerTitle: () => <HeaderLogo /> }}
      />
      <HomeStack.Screen
        name="Category"
        component={CategoryScreen}
        options={({ route }) => ({ title: route.params.categoryName })}
      />
      <HomeStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Product Details' }}
      />
    </HomeStack.Navigator>
  );
}

function SearchStackScreen(): React.JSX.Element {
  return (
    <SearchStack.Navigator screenOptions={brandHeaderOptions}>
      <SearchStack.Screen
        name="SearchMain"
        component={SearchScreen}
        options={{ headerTitle: () => <HeaderLogo /> }}
      />
      <SearchStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Product Details' }}
      />
    </SearchStack.Navigator>
  );
}

function CartStackScreen(): React.JSX.Element {
  return (
    <CartStack.Navigator screenOptions={brandHeaderOptions}>
      <CartStack.Screen
        name="CartMain"
        component={CartScreen}
        options={{ headerTitle: () => <HeaderLogo /> }}
      />
      <CartStack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
    </CartStack.Navigator>
  );
}

function OrdersStackScreen(): React.JSX.Element {
  return (
    <OrdersStack.Navigator screenOptions={brandHeaderOptions}>
      <OrdersStack.Screen
        name="OrdersMain"
        component={OrdersScreen}
        options={{ headerTitle: () => <HeaderLogo /> }}
      />
      <OrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
    </OrdersStack.Navigator>
  );
}

function ProfileStackScreen(): React.JSX.Element {
  return (
    <ProfileStack.Navigator screenOptions={brandHeaderOptions}>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerTitle: () => <HeaderLogo /> }}
      />
      <ProfileStack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: 'My Addresses' }}
      />
    </ProfileStack.Navigator>
  );
}

export function BuyerTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        ...brandTabBarOptions,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="SearchTab" component={SearchStackScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="CartTab" component={CartStackScreen} options={{ title: 'Cart' }} />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          title: 'Wishlist',
          headerShown: true,
          ...brandHeaderOptions,
          headerTitle: () => <HeaderLogo />,
        }}
      />
      <Tab.Screen name="OrdersTab" component={OrdersStackScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStackScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
