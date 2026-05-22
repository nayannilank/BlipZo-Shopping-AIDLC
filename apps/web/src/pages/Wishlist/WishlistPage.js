import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link } from 'react-router-dom';

import { useWishlist, useRemoveFromWishlist } from '../../hooks/useWishlist';
function WishlistSkeleton() {
  return _jsx('div', {
    className: 'animate-pulse space-y-4',
    children: Array.from({ length: 3 }).map((_, i) =>
      _jsxs(
        'div',
        {
          className: 'flex gap-4 rounded-lg border border-gray-200 bg-white p-4',
          children: [
            _jsx('div', { className: 'h-24 w-24 flex-shrink-0 rounded-md bg-gray-200' }),
            _jsxs('div', {
              className: 'flex-1 space-y-2',
              children: [
                _jsx('div', { className: 'h-5 w-2/3 rounded bg-gray-200' }),
                _jsx('div', { className: 'h-4 w-1/4 rounded bg-gray-200' }),
                _jsx('div', { className: 'h-4 w-1/6 rounded bg-gray-200' }),
              ],
            }),
          ],
        },
        `skeleton-${String(i)}`,
      ),
    ),
  });
}
function EmptyWishlist() {
  return _jsxs('div', {
    className:
      'flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center',
    children: [
      _jsx('svg', {
        className: 'h-16 w-16 text-gray-300',
        fill: 'none',
        viewBox: '0 0 24 24',
        stroke: 'currentColor',
        'aria-hidden': 'true',
        children: _jsx('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 1.5,
          d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
        }),
      }),
      _jsx('h2', {
        className: 'mt-4 text-lg font-semibold text-gray-900',
        children: 'Your wishlist is empty',
      }),
      _jsx('p', {
        className: 'mt-1 text-sm text-gray-500',
        children: 'Browse products and add items you love to your wishlist.',
      }),
      _jsx(Link, {
        to: '/',
        className:
          'mt-6 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
        children: 'Browse Products',
      }),
    ],
  });
}
export function Component() {
  const { data: wishlist, isLoading, isError, error } = useWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  function handleRemove(productId) {
    removeFromWishlist.mutate(productId);
  }
  return _jsxs('div', {
    className: 'min-h-screen bg-gray-50',
    children: [
      _jsx('header', {
        className: 'border-b border-gray-200 bg-white shadow-sm',
        children: _jsx('div', {
          className: 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8',
          children: _jsx(Link, {
            to: '/',
            className: 'text-2xl font-bold text-brand-blue-600',
            children: 'BlipZo',
          }),
        }),
      }),
      _jsxs('main', {
        className: 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
        children: [
          _jsx('nav', {
            'aria-label': 'Breadcrumb',
            className: 'mb-6',
            children: _jsxs('ol', {
              className: 'flex items-center gap-2 text-sm text-gray-500',
              children: [
                _jsx('li', {
                  children: _jsx(Link, {
                    to: '/',
                    className: 'hover:text-brand-blue-600',
                    children: 'Home',
                  }),
                }),
                _jsx('li', { 'aria-hidden': 'true', children: '/' }),
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Wishlist' }),
              ],
            }),
          }),
          _jsxs('h1', {
            className: 'mb-6 text-2xl font-bold text-gray-900 sm:text-3xl',
            children: [
              'My Wishlist',
              wishlist &&
                wishlist.count > 0 &&
                _jsxs('span', {
                  className: 'ml-2 text-lg font-normal text-gray-500',
                  children: [
                    '(',
                    String(wishlist.count),
                    ' ',
                    wishlist.count === 1 ? 'item' : 'items',
                    ')',
                  ],
                }),
            ],
          }),
          isLoading && _jsx(WishlistSkeleton, {}),
          isError &&
            _jsxs('div', {
              className: 'rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load your wishlist.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children: error instanceof Error ? error.message : 'Something went wrong.',
                }),
              ],
            }),
          wishlist && wishlist.items.length === 0 && _jsx(EmptyWishlist, {}),
          wishlist &&
            wishlist.items.length > 0 &&
            _jsx('ul', {
              className: 'space-y-4',
              'aria-label': 'Wishlist items',
              children: wishlist.items.map((item) =>
                _jsxs(
                  'li',
                  {
                    className:
                      'flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center',
                    children: [
                      _jsx(Link, {
                        to: `/products/${item.productId}`,
                        className: 'flex-shrink-0',
                        children: _jsx('img', {
                          src: item.primaryImageUrl,
                          alt: item.name,
                          className: 'h-24 w-24 rounded-md object-cover',
                        }),
                      }),
                      _jsxs('div', {
                        className: 'flex flex-1 flex-col gap-1',
                        children: [
                          _jsx(Link, {
                            to: `/products/${item.productId}`,
                            className:
                              'text-base font-semibold text-gray-900 hover:text-brand-blue-600 sm:text-lg',
                            children: item.name,
                          }),
                          _jsxs('p', {
                            className: 'text-lg font-bold text-brand-blue-700',
                            children: [
                              '\u20B9',
                              item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                            ],
                          }),
                          item.isAvailable
                            ? _jsx('span', {
                                className:
                                  'inline-flex w-fit items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800',
                                children: 'Available',
                              })
                            : _jsx('span', {
                                className:
                                  'inline-flex w-fit items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800',
                                children: 'Unavailable',
                              }),
                          _jsxs('p', {
                            className: 'text-xs text-gray-400',
                            children: ['Added ', new Date(item.addedAt).toLocaleDateString()],
                          }),
                        ],
                      }),
                      _jsxs('button', {
                        type: 'button',
                        onClick: () => {
                          handleRemove(item.productId);
                        },
                        disabled: removeFromWishlist.isPending,
                        'aria-label': `Remove ${item.name} from wishlist`,
                        className:
                          'inline-flex items-center gap-1.5 self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 sm:self-center',
                        children: [
                          _jsx('svg', {
                            className: 'h-4 w-4',
                            fill: 'none',
                            viewBox: '0 0 24 24',
                            stroke: 'currentColor',
                            'aria-hidden': 'true',
                            children: _jsx('path', {
                              strokeLinecap: 'round',
                              strokeLinejoin: 'round',
                              strokeWidth: 2,
                              d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
                            }),
                          }),
                          'Remove',
                        ],
                      }),
                    ],
                  },
                  item.productId,
                ),
              ),
            }),
        ],
      }),
    ],
  });
}
export default Component;
