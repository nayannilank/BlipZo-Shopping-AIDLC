import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link } from 'react-router-dom';

import { useSellerProducts, useDeleteProduct } from '../../hooks/useSellerProducts';
function ProductsSkeleton() {
  return _jsx('div', {
    className: 'animate-pulse space-y-4',
    children: Array.from({ length: 5 }).map((_, i) =>
      _jsx(
        'div',
        {
          className: 'rounded-lg border border-gray-200 bg-white p-4',
          children: _jsxs('div', {
            className: 'flex items-center gap-4',
            children: [
              _jsx('div', { className: 'h-16 w-16 rounded bg-gray-200' }),
              _jsxs('div', {
                className: 'flex-1 space-y-2',
                children: [
                  _jsx('div', { className: 'h-5 w-48 rounded bg-gray-200' }),
                  _jsx('div', { className: 'h-4 w-32 rounded bg-gray-200' }),
                ],
              }),
              _jsxs('div', {
                className: 'flex gap-2',
                children: [
                  _jsx('div', { className: 'h-8 w-16 rounded bg-gray-200' }),
                  _jsx('div', { className: 'h-8 w-16 rounded bg-gray-200' }),
                ],
              }),
            ],
          }),
        },
        `skeleton-${String(i)}`,
      ),
    ),
  });
}
function EmptyProducts() {
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
          d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
        }),
      }),
      _jsx('h2', {
        className: 'mt-4 text-lg font-semibold text-gray-900',
        children: 'No products yet',
      }),
      _jsx('p', {
        className: 'mt-1 text-sm text-gray-500',
        children: 'Add your first product to start selling on BlipZo.',
      }),
      _jsx(Link, {
        to: '/seller/products/new',
        className:
          'mt-6 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
        children: 'Add Product',
      }),
    ],
  });
}
export function Component() {
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSellerProducts(20);
  const deleteProductMutation = useDeleteProduct();
  const [deletingId, setDeletingId] = useState(null);
  const products = data?.pages.flatMap((page) => page.items) ?? [];
  function handleDelete(productId) {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    setDeletingId(productId);
    deleteProductMutation.mutate(productId, {
      onSettled: () => {
        setDeletingId(null);
      },
    });
  }
  return _jsxs('div', {
    className: 'min-h-screen bg-gray-50',
    children: [
      _jsx('header', {
        className: 'border-b border-gray-200 bg-white shadow-sm',
        children: _jsx('div', {
          className: 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8',
          children: _jsxs('div', {
            className: 'flex items-center justify-between',
            children: [
              _jsx(Link, {
                to: '/',
                className: 'text-2xl font-bold text-brand-blue-600',
                children: 'BlipZo',
              }),
              _jsx('span', {
                className:
                  'rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800',
                children: 'Seller Dashboard',
              }),
            ],
          }),
        }),
      }),
      _jsxs('main', {
        className: 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
        children: [
          _jsxs('div', {
            className: 'mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
            children: [
              _jsxs('div', {
                children: [
                  _jsx('h1', {
                    className: 'text-2xl font-bold text-gray-900 sm:text-3xl',
                    children: 'My Products',
                  }),
                  _jsx('p', {
                    className: 'mt-1 text-sm text-gray-500',
                    children: 'Manage your product listings',
                  }),
                ],
              }),
              _jsxs(Link, {
                to: '/seller/products/new',
                className:
                  'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                children: [
                  _jsx('svg', {
                    className: '-ml-0.5 mr-2 h-4 w-4',
                    fill: 'none',
                    viewBox: '0 0 24 24',
                    stroke: 'currentColor',
                    'aria-hidden': 'true',
                    children: _jsx('path', {
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeWidth: 2,
                      d: 'M12 4v16m8-8H4',
                    }),
                  }),
                  'Add Product',
                ],
              }),
            ],
          }),
          isLoading && _jsx(ProductsSkeleton, {}),
          isError &&
            _jsxs('div', {
              className: 'rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load your products.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children: error instanceof Error ? error.message : 'Something went wrong.',
                }),
              ],
            }),
          !isLoading && !isError && products.length === 0 && _jsx(EmptyProducts, {}),
          products.length > 0 &&
            _jsxs('div', {
              className: 'space-y-4',
              children: [
                _jsx('ul', {
                  className: 'space-y-3',
                  'aria-label': 'Product list',
                  children: products.map((product) =>
                    _jsx(
                      'li',
                      {
                        className: 'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
                        children: _jsxs('div', {
                          className: 'flex flex-col gap-4 sm:flex-row sm:items-center',
                          children: [
                            _jsx('div', {
                              className:
                                'h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100',
                              children:
                                (product.imageUrls ?? []).length > 0
                                  ? _jsx('img', {
                                      src: product.imageUrls[0],
                                      alt: product.name,
                                      className: 'h-full w-full object-cover',
                                    })
                                  : _jsx('div', {
                                      className:
                                        'flex h-full w-full items-center justify-center text-gray-400',
                                      children: _jsx('svg', {
                                        className: 'h-8 w-8',
                                        fill: 'none',
                                        viewBox: '0 0 24 24',
                                        stroke: 'currentColor',
                                        'aria-hidden': 'true',
                                        children: _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 1.5,
                                          d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
                                        }),
                                      }),
                                    }),
                            }),
                            _jsxs('div', {
                              className: 'min-w-0 flex-1',
                              children: [
                                _jsx('h3', {
                                  className: 'truncate text-sm font-semibold text-gray-900',
                                  children: product.name,
                                }),
                                _jsxs('div', {
                                  className:
                                    'mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500',
                                  children: [
                                    _jsxs('span', {
                                      className: 'font-medium text-gray-900',
                                      children: [
                                        '\u20B9',
                                        product.price.toLocaleString('en-IN', {
                                          minimumFractionDigits: 2,
                                        }),
                                      ],
                                    }),
                                    _jsxs('span', { children: ['Stock: ', product.stockQuantity] }),
                                    _jsx('span', {
                                      children:
                                        (product.categories ?? []).join(', ') ||
                                        product.subcategoryId ||
                                        '',
                                    }),
                                    product.sellerPolicy &&
                                      _jsx('span', {
                                        className:
                                          'rounded-full bg-green-100 px-2 py-0.5 text-green-700',
                                        children: 'Policy set',
                                      }),
                                  ],
                                }),
                              ],
                            }),
                            _jsxs('div', {
                              className: 'flex items-center gap-2',
                              children: [
                                _jsx(Link, {
                                  to: `/seller/products/${product.productId}/edit`,
                                  className:
                                    'inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-1',
                                  children: 'Edit',
                                }),
                                _jsx(Link, {
                                  to: `/seller/products/${product.productId}/policy`,
                                  className:
                                    'inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-1',
                                  children: 'Policy',
                                }),
                                _jsx('button', {
                                  type: 'button',
                                  onClick: () => {
                                    handleDelete(product.productId);
                                  },
                                  disabled: deletingId === product.productId,
                                  className:
                                    'inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50',
                                  children:
                                    deletingId === product.productId ? 'Deleting...' : 'Delete',
                                }),
                              ],
                            }),
                          ],
                        }),
                      },
                      product.productId,
                    ),
                  ),
                }),
                hasNextPage &&
                  _jsx('div', {
                    className: 'flex justify-center pt-4',
                    children: _jsx('button', {
                      type: 'button',
                      onClick: () => {
                        void fetchNextPage();
                      },
                      disabled: isFetchingNextPage,
                      className:
                        'inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                      children: isFetchingNextPage ? 'Loading...' : 'Load More',
                    }),
                  }),
              ],
            }),
        ],
      }),
    ],
  });
}
export default Component;
