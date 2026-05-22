import { jsx as _jsx } from 'react/jsx-runtime';
import { createBrowserRouter } from 'react-router-dom';

import App from './App';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SellerRoute } from './components/SellerRoute';
export const router = createBrowserRouter([
  {
    path: '/',
    element: _jsx(App, {}),
    children: [
      // Public auth routes
      {
        path: 'register',
        lazy: () => import('./pages/Auth/RegisterPage'),
      },
      {
        path: 'login',
        lazy: () => import('./pages/Auth/LoginPage'),
      },
      {
        path: 'otp',
        lazy: () => import('./pages/Auth/OtpPage'),
      },
      // Public catalogue routes
      {
        index: true,
        lazy: () => import('./pages/Home/HomePage'),
      },
      {
        path: 'categories/:categoryId',
        lazy: () => import('./pages/Home/CategoryPage'),
      },
      {
        path: 'products/:productId',
        lazy: () => import('./pages/ProductDetail/ProductDetailPage'),
      },
      {
        path: 'search',
        lazy: () => import('./pages/Search/SearchPage'),
      },
      // Protected routes (any authenticated user)
      {
        element: _jsx(ProtectedRoute, {}),
        children: [
          {
            path: 'addresses',
            lazy: () => import('./pages/Profile/AddressesPage'),
          },
          {
            path: 'wishlist',
            lazy: () => import('./pages/Wishlist/WishlistPage'),
          },
          {
            path: 'cart',
            lazy: () => import('./pages/Cart/CartPage'),
          },
          {
            path: 'checkout',
            lazy: () => import('./pages/Checkout/CheckoutPage'),
          },
          {
            path: 'order-confirmation/:orderId',
            lazy: () => import('./pages/Checkout/OrderConfirmationPage'),
          },
          {
            path: 'orders',
            lazy: () => import('./pages/Orders/OrdersPage'),
          },
          {
            path: 'orders/:orderId',
            lazy: () => import('./pages/Orders/OrderDetailPage'),
          },
        ],
      },
      // Seller-only routes (requires role === 'Seller')
      {
        element: _jsx(SellerRoute, {}),
        children: [
          {
            path: 'seller/products',
            lazy: () => import('./pages/SellerDashboard/SellerProductsPage'),
          },
          {
            path: 'seller/products/new',
            lazy: () => import('./pages/SellerDashboard/AddProductPage'),
          },
          {
            path: 'seller/products/:productId/edit',
            lazy: () => import('./pages/SellerDashboard/EditProductPage'),
          },
          {
            path: 'seller/products/:productId/policy',
            lazy: () => import('./pages/SellerDashboard/PolicyPage'),
          },
        ],
      },
    ],
  },
]);
