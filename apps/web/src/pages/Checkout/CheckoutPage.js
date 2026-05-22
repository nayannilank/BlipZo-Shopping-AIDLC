import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link, useNavigate } from 'react-router-dom';

import { useAddresses } from '../../hooks/useAddress';
import { useCart } from '../../hooks/useCart';
import { useCheckout } from '../../hooks/useOrder';
const PAYMENT_METHODS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CreditCard', label: 'Credit Card' },
  { value: 'DebitCard', label: 'Debit Card' },
  { value: 'CashOnDelivery', label: 'Cash on Delivery' },
];
export function Component() {
  const navigate = useNavigate();
  const { data: cart, isLoading: isCartLoading } = useCart();
  const { data: addresses, isLoading: isAddressesLoading } = useAddresses();
  const checkoutMutation = useCheckout();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI');
  // Auto-select default address when addresses load
  if (addresses && !selectedAddressId) {
    const defaultAddress = addresses.find((a) => a.isDefault);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.addressId);
    } else if (addresses.length > 0) {
      setSelectedAddressId(addresses[0].addressId);
    }
  }
  function handlePlaceOrder() {
    if (!selectedAddressId || !cart || cart.items.length === 0) return;
    const request = {
      addressId: selectedAddressId,
      paymentMethod: selectedPaymentMethod,
    };
    checkoutMutation.mutate(request, {
      onSuccess: (order) => {
        void navigate(`/order-confirmation/${order.orderId}`, {
          state: { order },
        });
      },
    });
  }
  const isLoading = isCartLoading || isAddressesLoading;
  const canPlaceOrder =
    selectedAddressId && cart && cart.items.length > 0 && !checkoutMutation.isPending;
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
                _jsx('li', {
                  children: _jsx(Link, {
                    to: '/cart',
                    className: 'hover:text-brand-blue-600',
                    children: 'Cart',
                  }),
                }),
                _jsx('li', { 'aria-hidden': 'true', children: '/' }),
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Checkout' }),
              ],
            }),
          }),
          _jsx('h1', {
            className: 'mb-8 text-2xl font-bold text-gray-900 sm:text-3xl',
            children: 'Checkout',
          }),
          isLoading &&
            _jsxs('div', {
              className: 'animate-pulse space-y-6',
              children: [
                _jsx('div', { className: 'h-40 rounded-lg bg-gray-200' }),
                _jsx('div', { className: 'h-32 rounded-lg bg-gray-200' }),
                _jsx('div', { className: 'h-48 rounded-lg bg-gray-200' }),
              ],
            }),
          !isLoading &&
            cart &&
            cart.items.length === 0 &&
            _jsxs('div', {
              className: 'rounded-lg border border-gray-200 bg-white p-8 text-center',
              children: [
                _jsx('p', { className: 'text-gray-600', children: 'Your cart is empty.' }),
                _jsx(Link, {
                  to: '/',
                  className:
                    'mt-4 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700',
                  children: 'Browse Products',
                }),
              ],
            }),
          !isLoading &&
            cart &&
            cart.items.length > 0 &&
            _jsxs('div', {
              className: 'grid gap-8 lg:grid-cols-3',
              children: [
                _jsxs('div', {
                  className: 'space-y-6 lg:col-span-2',
                  children: [
                    _jsxs('section', {
                      className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
                      children: [
                        _jsx('h2', {
                          className: 'text-lg font-semibold text-gray-900',
                          children: 'Delivery Address',
                        }),
                        addresses &&
                          addresses.length === 0 &&
                          _jsx('div', {
                            className: 'mt-4',
                            children: _jsx('p', {
                              className: 'text-sm text-gray-500',
                              children: 'No saved addresses found. Please add an address first.',
                            }),
                          }),
                        addresses &&
                          addresses.length > 0 &&
                          _jsxs('fieldset', {
                            className: 'mt-4',
                            children: [
                              _jsx('legend', {
                                className: 'sr-only',
                                children: 'Select delivery address',
                              }),
                              _jsx('div', {
                                className: 'space-y-3',
                                children: addresses.map((address) =>
                                  _jsxs(
                                    'label',
                                    {
                                      className: `flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                                        selectedAddressId === address.addressId
                                          ? 'border-brand-blue-500 bg-brand-blue-50'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`,
                                      children: [
                                        _jsx('input', {
                                          type: 'radio',
                                          name: 'address',
                                          value: address.addressId,
                                          checked: selectedAddressId === address.addressId,
                                          onChange: () => {
                                            setSelectedAddressId(address.addressId);
                                          },
                                          className:
                                            'mt-1 h-4 w-4 text-brand-blue-600 focus:ring-brand-blue-500',
                                        }),
                                        _jsxs('div', {
                                          className: 'flex-1',
                                          children: [
                                            _jsxs('p', {
                                              className: 'text-sm font-medium text-gray-900',
                                              children: [
                                                address.fullName,
                                                address.isDefault &&
                                                  _jsx('span', {
                                                    className:
                                                      'ml-2 inline-flex rounded-full bg-brand-blue-100 px-2 py-0.5 text-xs font-medium text-brand-blue-700',
                                                    children: 'Default',
                                                  }),
                                              ],
                                            }),
                                            _jsxs('p', {
                                              className: 'mt-1 text-sm text-gray-600',
                                              children: [
                                                address.line1,
                                                address.line2 ? `, ${address.line2}` : '',
                                              ],
                                            }),
                                            _jsxs('p', {
                                              className: 'text-sm text-gray-600',
                                              children: [
                                                address.city,
                                                ', ',
                                                address.state,
                                                ' ',
                                                address.postalCode,
                                              ],
                                            }),
                                            _jsx('p', {
                                              className: 'text-sm text-gray-500',
                                              children: address.phone,
                                            }),
                                          ],
                                        }),
                                      ],
                                    },
                                    address.addressId,
                                  ),
                                ),
                              }),
                            ],
                          }),
                      ],
                    }),
                    _jsxs('section', {
                      className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
                      children: [
                        _jsx('h2', {
                          className: 'text-lg font-semibold text-gray-900',
                          children: 'Payment Method',
                        }),
                        _jsxs('fieldset', {
                          className: 'mt-4',
                          children: [
                            _jsx('legend', {
                              className: 'sr-only',
                              children: 'Select payment method',
                            }),
                            _jsx('div', {
                              className: 'space-y-3',
                              children: PAYMENT_METHODS.map((method) =>
                                _jsxs(
                                  'label',
                                  {
                                    className: `flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                                      selectedPaymentMethod === method.value
                                        ? 'border-brand-blue-500 bg-brand-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`,
                                    children: [
                                      _jsx('input', {
                                        type: 'radio',
                                        name: 'paymentMethod',
                                        value: method.value,
                                        checked: selectedPaymentMethod === method.value,
                                        onChange: () => {
                                          setSelectedPaymentMethod(method.value);
                                        },
                                        className:
                                          'h-4 w-4 text-brand-blue-600 focus:ring-brand-blue-500',
                                      }),
                                      _jsx('span', {
                                        className: 'text-sm font-medium text-gray-900',
                                        children: method.label,
                                      }),
                                    ],
                                  },
                                  method.value,
                                ),
                              ),
                            }),
                          ],
                        }),
                      ],
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
                      _jsx('ul', {
                        className: 'mt-4 divide-y divide-gray-100',
                        children: cart.items.map((item) =>
                          _jsxs(
                            'li',
                            {
                              className: 'flex items-center gap-3 py-3',
                              children: [
                                _jsx('img', {
                                  src: item.primaryImageUrl,
                                  alt: item.name,
                                  className: 'h-12 w-12 flex-shrink-0 rounded-md object-cover',
                                }),
                                _jsxs('div', {
                                  className: 'flex-1 min-w-0',
                                  children: [
                                    _jsx('p', {
                                      className: 'truncate text-sm font-medium text-gray-900',
                                      children: item.name,
                                    }),
                                    _jsxs('p', {
                                      className: 'text-xs text-gray-500',
                                      children: ['Qty: ', item.quantity],
                                    }),
                                  ],
                                }),
                                _jsxs('p', {
                                  className: 'text-sm font-medium text-gray-900',
                                  children: [
                                    '\u20B9',
                                    item.subtotal.toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                    }),
                                  ],
                                }),
                              ],
                            },
                            item.productId,
                          ),
                        ),
                      }),
                      _jsx('hr', { className: 'my-4 border-gray-200' }),
                      _jsxs('div', {
                        className: 'space-y-2',
                        children: [
                          _jsxs('div', {
                            className: 'flex justify-between text-sm text-gray-600',
                            children: [
                              _jsx('span', { children: 'Subtotal' }),
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
                      checkoutMutation.isError &&
                        _jsx('div', {
                          className: 'mt-4 rounded-md bg-red-50 p-3',
                          children: _jsx('p', {
                            className: 'text-sm text-red-800',
                            children:
                              checkoutMutation.error instanceof Error
                                ? checkoutMutation.error.message
                                : 'Failed to place order. Please try again.',
                          }),
                        }),
                      _jsx('button', {
                        type: 'button',
                        onClick: handlePlaceOrder,
                        disabled: !canPlaceOrder,
                        className:
                          'mt-6 w-full rounded-lg bg-brand-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                        children: checkoutMutation.isPending ? 'Placing Order...' : 'Place Order',
                      }),
                      _jsx(Link, {
                        to: '/cart',
                        className:
                          'mt-3 block text-center text-sm text-brand-blue-600 hover:text-brand-blue-700',
                        children: 'Back to Cart',
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
