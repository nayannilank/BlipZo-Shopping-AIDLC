import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link, useParams } from 'react-router-dom';

import { useOrderDetail, useCancelOrder, useSubmitReturnExchange } from '../../hooks/useOrder';
function DetailSkeleton() {
  return _jsxs('div', {
    className: 'animate-pulse space-y-6',
    children: [
      _jsx('div', { className: 'h-6 w-48 rounded bg-gray-200' }),
      _jsx('div', {
        className: 'rounded-lg border border-gray-200 bg-white p-6',
        children: _jsxs('div', {
          className: 'space-y-4',
          children: [
            _jsx('div', { className: 'h-5 w-32 rounded bg-gray-200' }),
            _jsx('div', { className: 'h-4 w-64 rounded bg-gray-200' }),
            _jsx('div', { className: 'h-4 w-48 rounded bg-gray-200' }),
          ],
        }),
      }),
      _jsx('div', {
        className: 'rounded-lg border border-gray-200 bg-white p-6',
        children: _jsx('div', {
          className: 'space-y-3',
          children: Array.from({ length: 3 }).map((_, i) =>
            _jsxs(
              'div',
              {
                className: 'flex gap-4',
                children: [
                  _jsx('div', { className: 'h-16 w-16 rounded bg-gray-200' }),
                  _jsxs('div', {
                    className: 'flex-1 space-y-2',
                    children: [
                      _jsx('div', { className: 'h-4 w-2/3 rounded bg-gray-200' }),
                      _jsx('div', { className: 'h-4 w-1/4 rounded bg-gray-200' }),
                    ],
                  }),
                ],
              },
              `item-skeleton-${String(i)}`,
            ),
          ),
        }),
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
function getPaymentStatusBadgeClasses(status) {
  switch (status) {
    case 'Paid':
      return 'bg-green-100 text-green-800';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'Refunded':
      return 'bg-blue-100 text-blue-800';
    case 'RefundPending':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
export function Component() {
  const { orderId } = useParams();
  const { data: order, isLoading, isError, error } = useOrderDetail(orderId ?? '');
  const cancelOrderMutation = useCancelOrder();
  const returnExchangeMutation = useSubmitReturnExchange();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnType, setReturnType] = useState('Return');
  const [returnExchangeResult, setReturnExchangeResult] = useState(null);
  const canCancel = order?.orderStatus === 'Confirmed' || order?.orderStatus === 'Processing';
  const canReturnExchange = order?.orderStatus === 'Delivered';
  function handleCancelOrder() {
    if (!orderId) return;
    cancelOrderMutation.mutate(orderId, {
      onSuccess: () => {
        setShowCancelConfirm(false);
      },
    });
  }
  function handleSubmitReturnExchange() {
    if (!orderId) return;
    returnExchangeMutation.mutate(
      { orderId, payload: { type: returnType } },
      {
        onSuccess: (data) => {
          setShowReturnForm(false);
          setReturnExchangeResult(data.requestId);
        },
      },
    );
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
                _jsx('li', {
                  children: _jsx(Link, {
                    to: '/orders',
                    className: 'hover:text-brand-blue-600',
                    children: 'Orders',
                  }),
                }),
                _jsx('li', { 'aria-hidden': 'true', children: '/' }),
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Order Detail' }),
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
                  children: 'Failed to load order details.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children: error instanceof Error ? error.message : 'Something went wrong.',
                }),
                _jsx(Link, {
                  to: '/orders',
                  className:
                    'mt-4 inline-flex items-center text-sm text-brand-blue-600 hover:text-brand-blue-700',
                  children: '\u2190 Back to Orders',
                }),
              ],
            }),
          order &&
            _jsxs('div', {
              className: 'space-y-6',
              children: [
                _jsxs('div', {
                  className: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                  children: [
                    _jsxs('h1', {
                      className: 'text-xl font-bold text-gray-900 sm:text-2xl',
                      children: ['Order #', order.orderId.slice(0, 8).toUpperCase()],
                    }),
                    _jsxs('div', {
                      className: 'flex items-center gap-3',
                      children: [
                        _jsx('span', {
                          className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(order.orderStatus)}`,
                          children: order.orderStatus,
                        }),
                        _jsxs('span', {
                          className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getPaymentStatusBadgeClasses(order.paymentStatus)}`,
                          children: ['Payment: ', order.paymentStatus],
                        }),
                      ],
                    }),
                  ],
                }),
                order.refundStatus &&
                  _jsxs('div', {
                    className: `rounded-lg border p-4 ${
                      order.refundStatus === 'Completed'
                        ? 'border-green-200 bg-green-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`,
                    children: [
                      _jsxs('p', {
                        className: `text-sm font-medium ${order.refundStatus === 'Completed' ? 'text-green-800' : 'text-yellow-800'}`,
                        children: ['Refund Status: ', order.refundStatus],
                      }),
                      order.refundStatus === 'Pending' &&
                        _jsx('p', {
                          className: 'mt-1 text-xs text-yellow-600',
                          children:
                            'Your refund is being processed. It may take 5-7 business days.',
                        }),
                    ],
                  }),
                returnExchangeResult &&
                  _jsxs('div', {
                    className: 'rounded-lg border border-green-200 bg-green-50 p-4',
                    children: [
                      _jsx('p', {
                        className: 'text-sm font-medium text-green-800',
                        children: 'Return/Exchange request submitted successfully!',
                      }),
                      _jsxs('p', {
                        className: 'mt-1 text-xs text-green-600',
                        children: ['Request ID: ', returnExchangeResult],
                      }),
                    ],
                  }),
                _jsxs('div', {
                  className: 'grid gap-6 md:grid-cols-2',
                  children: [
                    _jsxs('div', {
                      className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
                      children: [
                        _jsx('h2', {
                          className: 'mb-4 text-base font-semibold text-gray-900',
                          children: 'Order Summary',
                        }),
                        _jsxs('dl', {
                          className: 'space-y-3 text-sm',
                          children: [
                            _jsxs('div', {
                              className: 'flex justify-between',
                              children: [
                                _jsx('dt', { className: 'text-gray-500', children: 'Order Date' }),
                                _jsx('dd', {
                                  className: 'font-medium text-gray-900',
                                  children: new Date(order.orderTimestamp).toLocaleDateString(
                                    'en-IN',
                                    {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  ),
                                }),
                              ],
                            }),
                            _jsxs('div', {
                              className: 'flex justify-between',
                              children: [
                                _jsx('dt', {
                                  className: 'text-gray-500',
                                  children: 'Payment Method',
                                }),
                                _jsx('dd', {
                                  className: 'font-medium text-gray-900',
                                  children: order.paymentMethod,
                                }),
                              ],
                            }),
                            order.transactionId &&
                              _jsxs('div', {
                                className: 'flex justify-between',
                                children: [
                                  _jsx('dt', {
                                    className: 'text-gray-500',
                                    children: 'Transaction ID',
                                  }),
                                  _jsxs('dd', {
                                    className: 'font-medium text-gray-900',
                                    children: [order.transactionId.slice(0, 12), '...'],
                                  }),
                                ],
                              }),
                            _jsxs('div', {
                              className: 'flex justify-between border-t border-gray-100 pt-3',
                              children: [
                                _jsx('dt', {
                                  className: 'font-semibold text-gray-900',
                                  children: 'Total',
                                }),
                                _jsxs('dd', {
                                  className: 'text-lg font-bold text-gray-900',
                                  children: [
                                    '\u20B9',
                                    order.totalAmount.toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
                      children: [
                        _jsx('h2', {
                          className: 'mb-4 text-base font-semibold text-gray-900',
                          children: 'Delivery Address',
                        }),
                        _jsxs('address', {
                          className: 'space-y-1 text-sm not-italic text-gray-600',
                          children: [
                            _jsx('p', {
                              className: 'font-medium text-gray-900',
                              children: order.deliveryAddressSnapshot.fullName,
                            }),
                            _jsx('p', { children: order.deliveryAddressSnapshot.line1 }),
                            order.deliveryAddressSnapshot.line2 &&
                              _jsx('p', { children: order.deliveryAddressSnapshot.line2 }),
                            _jsxs('p', {
                              children: [
                                order.deliveryAddressSnapshot.city,
                                ', ',
                                order.deliveryAddressSnapshot.state,
                                ' ',
                                order.deliveryAddressSnapshot.postalCode,
                              ],
                            }),
                            _jsx('p', { children: order.deliveryAddressSnapshot.country }),
                            _jsxs('p', {
                              className: 'pt-1 text-gray-500',
                              children: ['Phone: ', order.deliveryAddressSnapshot.phone],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                _jsxs('div', {
                  className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
                  children: [
                    _jsxs('h2', {
                      className: 'mb-4 text-base font-semibold text-gray-900',
                      children: ['Items (', String(order.items.length), ')'],
                    }),
                    _jsx('ul', {
                      className: 'divide-y divide-gray-100',
                      'aria-label': 'Order items',
                      children: order.items.map((item) =>
                        _jsxs(
                          'li',
                          {
                            className:
                              'flex items-center justify-between py-3 first:pt-0 last:pb-0',
                            children: [
                              _jsxs('div', {
                                className: 'flex-1',
                                children: [
                                  _jsx('p', {
                                    className: 'text-sm font-medium text-gray-900',
                                    children: item.name,
                                  }),
                                  _jsxs('p', {
                                    className: 'text-xs text-gray-500',
                                    children: [
                                      'Qty: ',
                                      item.quantity,
                                      ' \u00D7 \u20B9',
                                      item.priceAtPurchase.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              _jsxs('p', {
                                className: 'text-sm font-semibold text-gray-900',
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
                  ],
                }),
                _jsxs('div', {
                  className: 'flex flex-wrap gap-3',
                  children: [
                    canCancel &&
                      _jsx('button', {
                        type: 'button',
                        onClick: () => {
                          setShowCancelConfirm(true);
                        },
                        disabled: cancelOrderMutation.isPending,
                        className:
                          'inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50',
                        children: 'Cancel Order',
                      }),
                    canReturnExchange &&
                      !returnExchangeResult &&
                      _jsx('button', {
                        type: 'button',
                        onClick: () => {
                          setShowReturnForm(true);
                        },
                        disabled: returnExchangeMutation.isPending,
                        className:
                          'inline-flex items-center rounded-lg border border-brand-blue-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-blue-700 hover:bg-brand-blue-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                        children: 'Return / Exchange',
                      }),
                    _jsx(Link, {
                      to: '/orders',
                      className:
                        'inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                      children: '\u2190 Back to Orders',
                    }),
                  ],
                }),
                showCancelConfirm &&
                  _jsx('div', {
                    className:
                      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-labelledby': 'cancel-dialog-title',
                    children: _jsxs('div', {
                      className: 'w-full max-w-md rounded-lg bg-white p-6 shadow-xl',
                      children: [
                        _jsx('h3', {
                          id: 'cancel-dialog-title',
                          className: 'text-lg font-semibold text-gray-900',
                          children: 'Cancel Order',
                        }),
                        _jsx('p', {
                          className: 'mt-2 text-sm text-gray-600',
                          children:
                            'Are you sure you want to cancel this order? This action cannot be undone.',
                        }),
                        order.paymentMethod !== 'CashOnDelivery' &&
                          _jsx('p', {
                            className: 'mt-2 text-xs text-gray-500',
                            children: 'A refund will be initiated for your payment.',
                          }),
                        cancelOrderMutation.isError &&
                          _jsx('p', {
                            className: 'mt-3 text-sm text-red-600',
                            children:
                              cancelOrderMutation.error instanceof Error
                                ? cancelOrderMutation.error.message
                                : 'Failed to cancel order. Please try again.',
                          }),
                        _jsxs('div', {
                          className: 'mt-6 flex justify-end gap-3',
                          children: [
                            _jsx('button', {
                              type: 'button',
                              onClick: () => {
                                setShowCancelConfirm(false);
                              },
                              disabled: cancelOrderMutation.isPending,
                              className:
                                'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50',
                              children: 'Keep Order',
                            }),
                            _jsx('button', {
                              type: 'button',
                              onClick: handleCancelOrder,
                              disabled: cancelOrderMutation.isPending,
                              className:
                                'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50',
                              children: cancelOrderMutation.isPending
                                ? 'Cancelling...'
                                : 'Yes, Cancel Order',
                            }),
                          ],
                        }),
                      ],
                    }),
                  }),
                showReturnForm &&
                  _jsx('div', {
                    className:
                      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-labelledby': 'return-dialog-title',
                    children: _jsxs('div', {
                      className: 'w-full max-w-md rounded-lg bg-white p-6 shadow-xl',
                      children: [
                        _jsx('h3', {
                          id: 'return-dialog-title',
                          className: 'text-lg font-semibold text-gray-900',
                          children: 'Return or Exchange',
                        }),
                        _jsx('p', {
                          className: 'mt-2 text-sm text-gray-600',
                          children:
                            'Select whether you would like to return or exchange this order.',
                        }),
                        _jsxs('fieldset', {
                          className: 'mt-4',
                          children: [
                            _jsx('legend', {
                              className: 'text-sm font-medium text-gray-700',
                              children: 'Request Type',
                            }),
                            _jsxs('div', {
                              className: 'mt-2 flex gap-4',
                              children: [
                                _jsxs('label', {
                                  className: 'flex items-center gap-2 cursor-pointer',
                                  children: [
                                    _jsx('input', {
                                      type: 'radio',
                                      name: 'returnType',
                                      value: 'Return',
                                      checked: returnType === 'Return',
                                      onChange: () => {
                                        setReturnType('Return');
                                      },
                                      className:
                                        'h-4 w-4 border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500',
                                    }),
                                    _jsx('span', {
                                      className: 'text-sm text-gray-700',
                                      children: 'Return',
                                    }),
                                  ],
                                }),
                                _jsxs('label', {
                                  className: 'flex items-center gap-2 cursor-pointer',
                                  children: [
                                    _jsx('input', {
                                      type: 'radio',
                                      name: 'returnType',
                                      value: 'Exchange',
                                      checked: returnType === 'Exchange',
                                      onChange: () => {
                                        setReturnType('Exchange');
                                      },
                                      className:
                                        'h-4 w-4 border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500',
                                    }),
                                    _jsx('span', {
                                      className: 'text-sm text-gray-700',
                                      children: 'Exchange',
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                        returnExchangeMutation.isError &&
                          _jsx('p', {
                            className: 'mt-3 text-sm text-red-600',
                            children:
                              returnExchangeMutation.error instanceof Error
                                ? returnExchangeMutation.error.message
                                : 'Failed to submit request. Please try again.',
                          }),
                        _jsxs('div', {
                          className: 'mt-6 flex justify-end gap-3',
                          children: [
                            _jsx('button', {
                              type: 'button',
                              onClick: () => {
                                setShowReturnForm(false);
                              },
                              disabled: returnExchangeMutation.isPending,
                              className:
                                'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50',
                              children: 'Cancel',
                            }),
                            _jsx('button', {
                              type: 'button',
                              onClick: handleSubmitReturnExchange,
                              disabled: returnExchangeMutation.isPending,
                              className:
                                'rounded-lg bg-brand-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                              children: returnExchangeMutation.isPending
                                ? 'Submitting...'
                                : 'Submit Request',
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
  });
}
export default Component;
