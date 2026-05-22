import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link } from 'react-router-dom';

import { useOrders } from '../../hooks/useOrder';
function OrdersSkeleton() {
  return _jsx('div', {
    className: 'animate-pulse space-y-4',
    children: Array.from({ length: 5 }).map((_, i) =>
      _jsx(
        'div',
        {
          className: 'rounded-lg border border-gray-200 bg-white p-4',
          children: _jsxs('div', {
            className: 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
            children: [
              _jsxs('div', {
                className: 'space-y-2',
                children: [
                  _jsx('div', { className: 'h-5 w-40 rounded bg-gray-200' }),
                  _jsx('div', { className: 'h-4 w-28 rounded bg-gray-200' }),
                ],
              }),
              _jsxs('div', {
                className: 'space-y-2 text-right',
                children: [
                  _jsx('div', { className: 'h-5 w-24 rounded bg-gray-200' }),
                  _jsx('div', { className: 'h-4 w-20 rounded bg-gray-200' }),
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
function EmptyOrders() {
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
          d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        }),
      }),
      _jsx('h2', {
        className: 'mt-4 text-lg font-semibold text-gray-900',
        children: 'No orders yet',
      }),
      _jsx('p', {
        className: 'mt-1 text-sm text-gray-500',
        children: 'Start shopping to see your orders here.',
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
function getStatusBadgeClasses(status) {
  switch (status) {
    case 'Confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'Processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'Shipped':
      return 'bg-purple-100 text-purple-800';
    case 'Delivered':
      return 'bg-green-100 text-green-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
export function Component() {
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useOrders(20);
  const orders = data?.pages.flatMap((page) => page.items) ?? [];
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
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Orders' }),
              ],
            }),
          }),
          _jsx('h1', {
            className: 'mb-6 text-2xl font-bold text-gray-900 sm:text-3xl',
            children: 'Order History',
          }),
          isLoading && _jsx(OrdersSkeleton, {}),
          isError &&
            _jsxs('div', {
              className: 'rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load your orders.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children: error instanceof Error ? error.message : 'Something went wrong.',
                }),
              ],
            }),
          !isLoading && !isError && orders.length === 0 && _jsx(EmptyOrders, {}),
          orders.length > 0 &&
            _jsxs('div', {
              className: 'space-y-4',
              children: [
                _jsx('ul', {
                  className: 'space-y-4',
                  'aria-label': 'Order history',
                  children: orders.map((order) =>
                    _jsx(
                      'li',
                      {
                        children: _jsx(Link, {
                          to: `/orders/${order.orderId}`,
                          className:
                            'block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
                          children: _jsxs('div', {
                            className:
                              'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                            children: [
                              _jsxs('div', {
                                className: 'space-y-1',
                                children: [
                                  _jsxs('p', {
                                    className: 'text-sm font-semibold text-gray-900',
                                    children: ['Order #', order.orderId.slice(0, 8).toUpperCase()],
                                  }),
                                  _jsx('p', {
                                    className: 'text-xs text-gray-500',
                                    children: new Date(order.orderTimestamp).toLocaleDateString(
                                      'en-IN',
                                      {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      },
                                    ),
                                  }),
                                  _jsxs('p', {
                                    className: 'text-xs text-gray-500',
                                    children: [
                                      order.items.length,
                                      ' ',
                                      order.items.length === 1 ? 'item' : 'items',
                                      order.items.length > 0 &&
                                        _jsxs('span', {
                                          children: [
                                            ' ',
                                            '\u2014',
                                            ' ',
                                            order.items
                                              .slice(0, 2)
                                              .map((item) => item.name)
                                              .join(', '),
                                            order.items.length > 2 &&
                                              ` +${String(order.items.length - 2)} more`,
                                          ],
                                        }),
                                    ],
                                  }),
                                ],
                              }),
                              _jsxs('div', {
                                className:
                                  'flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2',
                                children: [
                                  _jsxs('p', {
                                    className: 'text-base font-bold text-gray-900',
                                    children: [
                                      '\u20B9',
                                      order.totalAmount.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                      }),
                                    ],
                                  }),
                                  _jsx('span', {
                                    className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(order.orderStatus)}`,
                                    children: order.orderStatus,
                                  }),
                                ],
                              }),
                            ],
                          }),
                        }),
                      },
                      order.orderId,
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
                      children: isFetchingNextPage ? 'Loading...' : 'Load More Orders',
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
