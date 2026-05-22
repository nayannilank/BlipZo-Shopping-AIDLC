import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

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
    <HomeStack.Navigator>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home' }} />
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
    <SearchStack.Navigator>
      <SearchStack.Screen
        name="SearchMain"
        component={SearchScreen}
        options={{ title: 'Search' }}
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
    <CartStack.Navigator>
      <CartStack.Screen name="CartMain" component={CartScreen} options={{ title: 'Cart' }} />
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
    <OrdersStack.Navigator>
      <OrdersStack.Screen
        name="OrdersMain"
        component={OrdersScreen}
        options={{ title: 'Orders' }}
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
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
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
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
        },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="SearchTab" component={SearchStackScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="CartTab" component={CartStackScreen} options={{ title: 'Cart' }} />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: 'Wishlist', headerShown: true }}
      />
      <Tab.Screen name="OrdersTab" component={OrdersStackScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStackScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
