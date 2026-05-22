import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useParams, Link } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { useProductDetail } from '../../hooks/useCatalogue';
import { useAddToWishlist } from '../../hooks/useWishlist';
import { useAuthStore } from '../../stores/auth.store';
function DetailSkeleton() {
  return _jsx('div', {
    className: 'animate-pulse',
    children: _jsxs('div', {
      className: 'grid grid-cols-1 gap-8 md:grid-cols-2',
      children: [
        _jsx('div', { className: 'aspect-square w-full rounded-lg bg-gray-200' }),
        _jsxs('div', {
          className: 'space-y-4',
          children: [
            _jsx('div', { className: 'h-8 w-3/4 rounded bg-gray-200' }),
            _jsx('div', { className: 'h-6 w-1/3 rounded bg-gray-200' }),
            _jsx('div', { className: 'h-4 w-full rounded bg-gray-200' }),
            _jsx('div', { className: 'h-4 w-full rounded bg-gray-200' }),
            _jsx('div', { className: 'h-4 w-2/3 rounded bg-gray-200' }),
            _jsx('div', { className: 'mt-6 h-12 w-full rounded bg-gray-200' }),
          ],
        }),
      ],
    }),
  });
}
export function Component() {
  const { productId } = useParams();
  const { data: product, isLoading, isError, error } = useProductDetail(productId ?? '');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedImage, setSelectedImage] = useState(0);
  const [cartMessage, setCartMessage] = useState(null);
  const [wishlistMessage, setWishlistMessage] = useState(null);
  const addToWishlistMutation = useAddToWishlist();
  async function handleAddToCart() {
    if (!product) return;
    try {
      await apiClient.put('/cart/items', {
        productId: product.productId,
        quantity: 1,
      });
      setCartMessage('Added to cart!');
      setTimeout(() => {
        setCartMessage(null);
      }, 3000);
    } catch {
      setCartMessage('Failed to add to cart.');
      setTimeout(() => {
        setCartMessage(null);
      }, 3000);
    }
  }
  function handleAddToWishlist() {
    if (!product) return;
    addToWishlistMutation.mutate(product.productId, {
      onSuccess: () => {
        setWishlistMessage('Added to wishlist!');
        setTimeout(() => {
          setWishlistMessage(null);
        }, 3000);
      },
      onError: () => {
        setWishlistMessage('Failed to add to wishlist.');
        setTimeout(() => {
          setWishlistMessage(null);
        }, 3000);
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
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Product Detail' }),
              ],
            }),
          }),
          isLoading && _jsx(DetailSkeleton, {}),
          isError &&
            _jsxs('div', {
              className: 'rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load product details.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children: error instanceof Error ? error.message : 'Product not found.',
                }),
                _jsx(Link, {
                  to: '/',
                  className:
                    'mt-4 inline-block text-sm font-medium text-brand-blue-600 hover:underline',
                  children: '\u2190 Back to Home',
                }),
              ],
            }),
          product &&
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-8 lg:grid-cols-2',
              children: [
                _jsxs('div', {
                  children: [
                    _jsx('div', {
                      className: 'aspect-square w-full overflow-hidden rounded-lg bg-gray-100',
                      children: _jsx('img', {
                        src: product.imageUrls[selectedImage] ?? product.imageUrls[0],
                        alt: product.name,
                        className: 'h-full w-full object-cover',
                      }),
                    }),
                    product.imageUrls.length > 1 &&
                      _jsx('div', {
                        className: 'mt-4 flex gap-2 overflow-x-auto',
                        children: product.imageUrls.map((url, index) =>
                          _jsx(
                            'button',
                            {
                              type: 'button',
                              onClick: () => {
                                setSelectedImage(index);
                              },
                              className: `h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                                selectedImage === index
                                  ? 'border-brand-blue-500'
                                  : 'border-gray-200 hover:border-gray-400'
                              }`,
                              'aria-label': `View image ${String(index + 1)}`,
                              children: _jsx('img', {
                                src: url,
                                alt: `${product.name} - image ${String(index + 1)}`,
                                className: 'h-full w-full object-cover',
                              }),
                            },
                            url,
                          ),
                        ),
                      }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('h1', {
                      className: 'text-2xl font-bold text-gray-900 sm:text-3xl',
                      children: product.name,
                    }),
                    _jsxs('p', {
                      className: 'mt-3 text-3xl font-bold text-brand-blue-700',
                      children: [
                        '\u20B9',
                        product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                      ],
                    }),
                    _jsx('div', {
                      className: 'mt-3',
                      children:
                        product.stockQuantity > 0
                          ? _jsxs('span', {
                              className:
                                'inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800',
                              children: [
                                'In Stock (',
                                String(product.stockQuantity),
                                ' available)',
                              ],
                            })
                          : _jsx('span', {
                              className:
                                'inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800',
                              children: 'Out of Stock',
                            }),
                    }),
                    _jsxs('div', {
                      className: 'mt-6',
                      children: [
                        _jsx('h2', {
                          className: 'text-sm font-semibold uppercase tracking-wide text-gray-500',
                          children: 'Description',
                        }),
                        _jsx('p', {
                          className:
                            'mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700',
                          children: product.description,
                        }),
                      ],
                    }),
                    product.categories.length > 0 &&
                      _jsxs('div', {
                        className: 'mt-6',
                        children: [
                          _jsx('h2', {
                            className:
                              'text-sm font-semibold uppercase tracking-wide text-gray-500',
                            children: 'Categories',
                          }),
                          _jsx('div', {
                            className: 'mt-2 flex flex-wrap gap-2',
                            children: product.categories.map((cat) =>
                              _jsx(
                                Link,
                                {
                                  to: `/categories/${cat}`,
                                  className:
                                    'rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-brand-blue-50 hover:text-brand-blue-700',
                                  children: cat,
                                },
                                cat,
                              ),
                            ),
                          }),
                        ],
                      }),
                    product.sellerPolicy &&
                      _jsxs('div', {
                        className: 'mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4',
                        children: [
                          _jsx('h2', {
                            className:
                              'text-sm font-semibold uppercase tracking-wide text-gray-500',
                            children: 'Return & Exchange Policy',
                          }),
                          _jsxs('div', {
                            className: 'mt-2 space-y-1 text-sm text-gray-700',
                            children: [
                              _jsxs('p', {
                                children: [
                                  _jsx('span', {
                                    className: 'font-medium',
                                    children: 'Return Window:',
                                  }),
                                  ' ',
                                  product.sellerPolicy.returnWindowDays === 0
                                    ? 'Non-returnable'
                                    : `${String(product.sellerPolicy.returnWindowDays)} days`,
                                ],
                              }),
                              _jsxs('p', {
                                children: [
                                  _jsx('span', { className: 'font-medium', children: 'Exchange:' }),
                                  ' ',
                                  product.sellerPolicy.exchangeAllowed ? 'Allowed' : 'Not allowed',
                                ],
                              }),
                              product.sellerPolicy.conditions &&
                                _jsxs('p', {
                                  children: [
                                    _jsx('span', {
                                      className: 'font-medium',
                                      children: 'Conditions:',
                                    }),
                                    ' ',
                                    product.sellerPolicy.conditions,
                                  ],
                                }),
                            ],
                          }),
                        ],
                      }),
                    _jsxs('div', {
                      className: 'mt-8 flex flex-col gap-3 sm:flex-row',
                      children: [
                        _jsx('button', {
                          type: 'button',
                          onClick: () => void handleAddToCart(),
                          disabled: !accessToken || product.stockQuantity === 0,
                          className:
                            'flex-1 rounded-lg bg-brand-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                          children: product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart',
                        }),
                        _jsx('button', {
                          type: 'button',
                          onClick: () => {
                            handleAddToWishlist();
                          },
                          disabled: !accessToken || addToWishlistMutation.isPending,
                          className:
                            'flex-1 rounded-lg border-2 border-brand-purple-500 px-6 py-3 text-sm font-semibold text-brand-purple-600 transition-colors hover:bg-brand-purple-50 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                          children: 'Add to Wishlist',
                        }),
                      ],
                    }),
                    !accessToken &&
                      _jsxs('p', {
                        className: 'mt-2 text-xs text-gray-500',
                        children: [
                          _jsx(Link, {
                            to: '/login',
                            className: 'text-brand-blue-600 hover:underline',
                            children: 'Sign in',
                          }),
                          ' ',
                          'to add items to your cart or wishlist.',
                        ],
                      }),
                    cartMessage &&
                      _jsx('p', {
                        className: 'mt-2 text-sm font-medium text-green-700',
                        role: 'status',
                        'aria-live': 'polite',
                        children: cartMessage,
                      }),
                    wishlistMessage &&
                      _jsx('p', {
                        className: 'mt-2 text-sm font-medium text-green-700',
                        role: 'status',
                        'aria-live': 'polite',
                        children: wishlistMessage,
                      }),
                    _jsx('div', {
                      className: 'mt-8 border-t border-gray-200 pt-4',
                      children: _jsxs('dl', {
                        className: 'grid grid-cols-2 gap-2 text-xs text-gray-500',
                        children: [
                          _jsxs('div', {
                            children: [
                              _jsx('dt', { className: 'font-medium', children: 'Product ID' }),
                              _jsx('dd', {
                                className: 'mt-0.5 font-mono',
                                children: product.productId,
                              }),
                            ],
                          }),
                          _jsxs('div', {
                            children: [
                              _jsx('dt', { className: 'font-medium', children: 'Listed' }),
                              _jsx('dd', {
                                className: 'mt-0.5',
                                children: new Date(product.createdAt).toLocaleDateString(),
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  ],
                }),
              ],
            }),
        ],
      }),
    ],
  });
}
export default Component;
