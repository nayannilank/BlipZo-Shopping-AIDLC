import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link, useNavigate } from 'react-router-dom';

import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '../../hooks/useCart';
function CartSkeleton() {
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
function EmptyCart() {
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
          d: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
        }),
      }),
      _jsx('h2', {
        className: 'mt-4 text-lg font-semibold text-gray-900',
        children: 'Your cart is empty',
      }),
      _jsx('p', {
        className: 'mt-1 text-sm text-gray-500',
        children: 'Browse products and add items to your cart.',
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
  const navigate = useNavigate();
  const { data: cart, isLoading, isError, error } = useCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const clearCartMutation = useClearCart();
  function handleQuantityChange(productId, newQuantity) {
    if (newQuantity <= 0) {
      removeCartItem.mutate(productId);
    } else {
      updateCartItem.mutate({ productId, quantity: newQuantity });
    }
  }
  function handleRemove(productId) {
    removeCartItem.mutate(productId);
  }
  function handleClearCart() {
    clearCartMutation.mutate();
  }
  function handleProceedToCheckout() {
    void navigate('/checkout');
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
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Cart' }),
              ],
            }),
          }),
          _jsxs('h1', {
            className: 'mb-6 text-2xl font-bold text-gray-900 sm:text-3xl',
            children: [
              'Shopping Cart',
              cart &&
                cart.items.length > 0 &&
                _jsxs('span', {
                  className: 'ml-2 text-lg font-normal text-gray-500',
                  children: [
                    '(',
                    String(cart.items.length),
                    ' ',
                    cart.items.length === 1 ? 'item' : 'items',
                    ')',
                  ],
                }),
            ],
          }),
          isLoading && _jsx(CartSkeleton, {}),
          isError &&
            _jsxs('div', {
              className: 'rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load your cart.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children: error instanceof Error ? error.message : 'Something went wrong.',
                }),
              ],
            }),
          cart && cart.items.length === 0 && _jsx(EmptyCart, {}),
          cart &&
            cart.items.length > 0 &&
            _jsxs('div', {
              className: 'grid gap-8 lg:grid-cols-3',
              children: [
                _jsxs('div', {
                  className: 'lg:col-span-2',
                  children: [
                    _jsx('ul', {
                      className: 'space-y-4',
                      'aria-label': 'Cart items',
                      children: cart.items.map((item) =>
                        _jsxs(
                          'li',
                          {
                            className:
                              'flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row',
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
                                className: 'flex flex-1 flex-col gap-2',
                                children: [
                                  _jsx(Link, {
                                    to: `/products/${item.productId}`,
                                    className:
                                      'text-base font-semibold text-gray-900 hover:text-brand-blue-600',
                                    children: item.name,
                                  }),
                                  _jsxs('p', {
                                    className: 'text-sm text-gray-500',
                                    children: [
                                      '\u20B9',
                                      item.price.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                      }),
                                      ' each',
                                    ],
                                  }),
                                  _jsxs('div', {
                                    className: 'flex items-center gap-2',
                                    children: [
                                      _jsx('label', {
                                        htmlFor: `qty-${item.productId}`,
                                        className: 'text-sm text-gray-600',
                                        children: 'Qty:',
                                      }),
                                      _jsxs('div', {
                                        className:
                                          'flex items-center rounded-md border border-gray-300',
                                        children: [
                                          _jsx('button', {
                                            type: 'button',
                                            onClick: () => {
                                              handleQuantityChange(
                                                item.productId,
                                                item.quantity - 1,
                                              );
                                            },
                                            disabled:
                                              updateCartItem.isPending || removeCartItem.isPending,
                                            'aria-label': `Decrease quantity of ${item.name}`,
                                            className:
                                              'px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50',
                                            children: '\u2212',
                                          }),
                                          _jsx('span', {
                                            id: `qty-${item.productId}`,
                                            className:
                                              'min-w-[2rem] px-2 py-1 text-center text-sm font-medium',
                                            children: item.quantity,
                                          }),
                                          _jsx('button', {
                                            type: 'button',
                                            onClick: () => {
                                              handleQuantityChange(
                                                item.productId,
                                                item.quantity + 1,
                                              );
                                            },
                                            disabled:
                                              updateCartItem.isPending || item.quantity >= 999,
                                            'aria-label': `Increase quantity of ${item.name}`,
                                            className:
                                              'px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50',
                                            children: '+',
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              _jsxs('div', {
                                className: 'flex flex-col items-end justify-between gap-2',
                                children: [
                                  _jsxs('p', {
                                    className: 'text-lg font-bold text-gray-900',
                                    children: [
                                      '\u20B9',
                                      item.subtotal.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                      }),
                                    ],
                                  }),
                                  _jsxs('button', {
                                    type: 'button',
                                    onClick: () => {
                                      handleRemove(item.productId);
                                    },
                                    disabled: removeCartItem.isPending,
                                    'aria-label': `Remove ${item.name} from cart`,
                                    className:
                                      'inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50',
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
                              }),
                            ],
                          },
                          item.productId,
                        ),
                      ),
                    }),
                    _jsx('div', {
                      className: 'mt-4 flex justify-end',
                      children: _jsx('button', {
                        type: 'button',
                        onClick: handleClearCart,
                        disabled: clearCartMutation.isPending,
                        className:
                          'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                        children: 'Clear Cart',
                      }),
                    }),
                  ],
                }),
                _jsx('div', {
                  className: 'lg:col-span-1',
                  children: _jsxs('div', {
                    className:
                      'sticky top-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
                    children: [
                      _jsx('h2', {
                        className: 'text-lg font-semibold text-gray-900',
                        children: 'Order Summary',
                      }),
                      _jsxs('div', {
                        className: 'mt-4 space-y-3',
                        children: [
                          _jsxs('div', {
                            className: 'flex justify-between text-sm text-gray-600',
                            children: [
                              _jsxs('span', {
                                children: [
                                  'Subtotal (',
                                  String(cart.items.length),
                                  ' ',
                                  cart.items.length === 1 ? 'item' : 'items',
                                  ')',
                                ],
                              }),
                              _jsxs('span', {
                                children: [
                                  '\u20B9',
                                  cart.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                                ],
                              }),
                            ],
                          }),
                          _jsxs('div', {
                            className: 'flex justify-between text-sm text-gray-600',
                            children: [
                              _jsx('span', { children: 'Shipping' }),
                              _jsx('span', { className: 'text-green-600', children: 'Free' }),
                            ],
                          }),
                          _jsx('hr', { className: 'border-gray-200' }),
                          _jsxs('div', {
                            className: 'flex justify-between text-base font-bold text-gray-900',
                            children: [
                              _jsx('span', { children: 'Total' }),
                              _jsxs('span', {
                                children: [
                                  '\u20B9',
                                  cart.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsx('button', {
                        type: 'button',
                        onClick: handleProceedToCheckout,
                        className:
                          'mt-6 w-full rounded-lg bg-brand-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                        children: 'Proceed to Checkout',
                      }),
                      _jsx(Link, {
                        to: '/',
                        className:
                          'mt-3 block text-center text-sm text-brand-blue-600 hover:text-brand-blue-700',
                        children: 'Continue Shopping',
                      }),
                    ],
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
