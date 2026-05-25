import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link } from 'react-router-dom';

import { useAuthStore } from '../../stores/auth.store';
/**
 * Application header with BlipZo logo and navigation.
 * Shows Login/Sign Up buttons when unauthenticated,
 * and user navigation links when authenticated.
 */
export function Header() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = accessToken !== null;
  return _jsxs('header', {
    className: 'nav-bar justify-between',
    children: [
      _jsxs('div', {
        className: 'flex items-center gap-4',
        children: [
          _jsx(Link, {
            to: '/',
            'aria-label': 'BlipZo Home',
            children: _jsx('img', {
              src: '/logo.png',
              alt: 'BlipZo',
              className: 'h-8 w-auto object-contain sm:h-10 lg:h-12',
            }),
          }),
          isAuthenticated &&
            _jsxs('nav', {
              className: 'hidden items-center gap-3 sm:flex',
              children: [
                role === 'Buyer' &&
                  _jsxs(_Fragment, {
                    children: [
                      _jsx(Link, { to: '/wishlist', className: 'text-sm', children: 'Wishlist' }),
                      _jsx(Link, { to: '/cart', className: 'text-sm', children: 'Cart' }),
                      _jsx(Link, { to: '/orders', className: 'text-sm', children: 'Orders' }),
                    ],
                  }),
                role === 'Seller' &&
                  _jsx(Link, {
                    to: '/seller/products',
                    className: 'text-sm',
                    children: 'My Products',
                  }),
              ],
            }),
        ],
      }),
      _jsx('div', {
        className: 'flex items-center gap-3',
        children: isAuthenticated
          ? _jsxs(_Fragment, {
              children: [
                _jsx('span', {
                  className: 'hidden text-sm text-white/80 sm:inline',
                  children: role,
                }),
                _jsx('button', {
                  onClick: logout,
                  className:
                    'rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors',
                  children: 'Logout',
                }),
              ],
            })
          : _jsxs(_Fragment, {
              children: [
                _jsx(Link, {
                  to: '/login',
                  className:
                    'rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors',
                  children: 'Login',
                }),
                _jsx(Link, {
                  to: '/register',
                  className:
                    'rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors',
                  children: 'Sign Up',
                }),
              ],
            }),
      }),
    ],
  });
}
