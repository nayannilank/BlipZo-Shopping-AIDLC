import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'react/jsx-runtime';
import { Link, useParams, useLocation } from 'react-router-dom';
export function Component() {
  const { orderId } = useParams();
  const location = useLocation();
  const state = location.state;
  const order = state?.order;
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
      _jsx('main', {
        className: 'mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8',
        children: _jsxs('div', {
          className: 'rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm',
          children: [
            _jsx('div', {
              className:
                'mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100',
              children: _jsx('svg', {
                className: 'h-8 w-8 text-green-600',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor',
                'aria-hidden': 'true',
                children: _jsx('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  strokeWidth: 2,
                  d: 'M5 13l4 4L19 7',
                }),
              }),
            }),
            _jsx('h1', {
              className: 'mt-6 text-2xl font-bold text-gray-900',
              children: 'Order Placed Successfully!',
            }),
            _jsx('p', {
              className: 'mt-2 text-gray-600',
              children: 'Thank you for your purchase. Your order has been confirmed.',
            }),
            _jsx('div', {
              className: 'mt-8 rounded-lg bg-gray-50 p-6 text-left',
              children: _jsxs('dl', {
                className: 'space-y-3',
                children: [
                  _jsxs('div', {
                    className: 'flex justify-between',
                    children: [
                      _jsx('dt', {
                        className: 'text-sm font-medium text-gray-500',
                        children: 'Order ID',
                      }),
                      _jsx('dd', {
                        className: 'text-sm font-semibold text-gray-900',
                        children: orderId ?? order?.orderId ?? '—',
                      }),
                    ],
                  }),
                  order &&
                    _jsxs(_Fragment, {
                      children: [
                        _jsxs('div', {
                          className: 'flex justify-between',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Status',
                            }),
                            _jsx('dd', {
                              children: _jsx('span', {
                                className:
                                  'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800',
                                children: order.orderStatus,
                              }),
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'flex justify-between',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Payment Status',
                            }),
                            _jsx('dd', {
                              children: _jsx('span', {
                                className: `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  order.paymentStatus === 'Paid'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`,
                                children: order.paymentStatus,
                              }),
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'flex justify-between',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Payment Method',
                            }),
                            _jsx('dd', {
                              className: 'text-sm text-gray-900',
                              children: order.paymentMethod,
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'flex justify-between',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Total Amount',
                            }),
                            _jsxs('dd', {
                              className: 'text-sm font-bold text-gray-900',
                              children: [
                                '\u20B9',
                                order.totalAmount.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                }),
                              ],
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'flex justify-between',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Order Date',
                            }),
                            _jsx('dd', {
                              className: 'text-sm text-gray-900',
                              children: new Date(order.orderTimestamp).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }),
                            }),
                          ],
                        }),
                        order.items.length > 0 &&
                          _jsxs('div', {
                            className: 'pt-3',
                            children: [
                              _jsx('dt', {
                                className: 'text-sm font-medium text-gray-500',
                                children: 'Items Ordered',
                              }),
                              _jsx('dd', {
                                className: 'mt-2',
                                children: _jsx('ul', {
                                  className: 'divide-y divide-gray-200',
                                  children: order.items.map((item) =>
                                    _jsxs(
                                      'li',
                                      {
                                        className: 'flex justify-between py-2',
                                        children: [
                                          _jsxs('span', {
                                            className: 'text-sm text-gray-700',
                                            children: [item.name, ' \u00D7 ', item.quantity],
                                          }),
                                          _jsxs('span', {
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
                              }),
                            ],
                          }),
                      ],
                    }),
                ],
              }),
            }),
            _jsx('div', {
              className: 'mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center',
              children: _jsx(Link, {
                to: '/',
                className:
                  'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                children: 'Continue Shopping',
              }),
            }),
          ],
        }),
      }),
    ],
  });
}
export default Component;
