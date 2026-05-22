import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useOrderDetail, useCancelOrder, useSubmitReturnExchange } from '../../hooks/useOrder';

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 w-48 rounded bg-gray-200" />
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`item-skeleton-${String(i)}`} className="flex gap-4">
              <div className="h-16 w-16 rounded bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="h-4 w-1/4 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatusBadgeClasses(status: string): string {
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

function getPaymentStatusBadgeClasses(status: string): string {
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

export function Component(): React.ReactElement {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError, error } = useOrderDetail(orderId ?? '');
  const cancelOrderMutation = useCancelOrder();
  const returnExchangeMutation = useSubmitReturnExchange();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnType, setReturnType] = useState<'Return' | 'Exchange'>('Return');
  const [returnExchangeResult, setReturnExchangeResult] = useState<string | null>(null);

  const canCancel = order?.orderStatus === 'Confirmed' || order?.orderStatus === 'Processing';
  const canReturnExchange = order?.orderStatus === 'Delivered';

  function handleCancelOrder(): void {
    if (!orderId) return;
    cancelOrderMutation.mutate(orderId, {
      onSuccess: () => {
        setShowCancelConfirm(false);
      },
    });
  }

  function handleSubmitReturnExchange(): void {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-bold text-brand-blue-600">
            BlipZo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-brand-blue-600">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/orders" className="hover:text-brand-blue-600">
                Orders
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">Order Detail</li>
          </ol>
        </nav>

        {/* Loading */}
        {isLoading && <DetailSkeleton />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load order details.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
            <Link
              to="/orders"
              className="mt-4 inline-flex items-center text-sm text-brand-blue-600 hover:text-brand-blue-700"
            >
              ← Back to Orders
            </Link>
          </div>
        )}

        {/* Order Detail */}
        {order && (
          <div className="space-y-6">
            {/* Title & Status */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Order #{order.orderId.slice(0, 8).toUpperCase()}
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(order.orderStatus)}`}
                >
                  {order.orderStatus}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getPaymentStatusBadgeClasses(order.paymentStatus)}`}
                >
                  Payment: {order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Refund Status (shown after cancellation) */}
            {order.refundStatus && (
              <div
                className={`rounded-lg border p-4 ${
                  order.refundStatus === 'Completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    order.refundStatus === 'Completed' ? 'text-green-800' : 'text-yellow-800'
                  }`}
                >
                  Refund Status: {order.refundStatus}
                </p>
                {order.refundStatus === 'Pending' && (
                  <p className="mt-1 text-xs text-yellow-600">
                    Your refund is being processed. It may take 5-7 business days.
                  </p>
                )}
              </div>
            )}

            {/* Return/Exchange Success */}
            {returnExchangeResult && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Return/Exchange request submitted successfully!
                </p>
                <p className="mt-1 text-xs text-green-600">Request ID: {returnExchangeResult}</p>
              </div>
            )}

            {/* Order Info Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Order Summary */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Order Summary</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Order Date</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(order.orderTimestamp).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Payment Method</dt>
                    <dd className="font-medium text-gray-900">{order.paymentMethod}</dd>
                  </div>
                  {order.transactionId && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Transaction ID</dt>
                      <dd className="font-medium text-gray-900">
                        {order.transactionId.slice(0, 12)}...
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-3">
                    <dt className="font-semibold text-gray-900">Total</dt>
                    <dd className="text-lg font-bold text-gray-900">
                      ₹
                      {order.totalAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Delivery Address */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Delivery Address</h2>
                <address className="space-y-1 text-sm not-italic text-gray-600">
                  <p className="font-medium text-gray-900">
                    {order.deliveryAddressSnapshot.fullName}
                  </p>
                  <p>{order.deliveryAddressSnapshot.line1}</p>
                  {order.deliveryAddressSnapshot.line2 && (
                    <p>{order.deliveryAddressSnapshot.line2}</p>
                  )}
                  <p>
                    {order.deliveryAddressSnapshot.city}, {order.deliveryAddressSnapshot.state}{' '}
                    {order.deliveryAddressSnapshot.postalCode}
                  </p>
                  <p>{order.deliveryAddressSnapshot.country}</p>
                  <p className="pt-1 text-gray-500">Phone: {order.deliveryAddressSnapshot.phone}</p>
                </address>
              </div>
            </div>

            {/* Order Items */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Items ({String(order.items.length)})
              </h2>
              <ul className="divide-y divide-gray-100" aria-label="Order items">
                {order.items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity} × ₹
                        {item.priceAtPurchase.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹
                      {item.subtotal.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Cancel Button - visible for Confirmed/Processing */}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirm(true);
                  }}
                  disabled={cancelOrderMutation.isPending}
                  className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel Order
                </button>
              )}

              {/* Return/Exchange Button - visible for Delivered */}
              {canReturnExchange && !returnExchangeResult && (
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnForm(true);
                  }}
                  disabled={returnExchangeMutation.isPending}
                  className="inline-flex items-center rounded-lg border border-brand-blue-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-blue-700 hover:bg-brand-blue-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Return / Exchange
                </button>
              )}

              <Link
                to="/orders"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
              >
                ← Back to Orders
              </Link>
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelConfirm && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-dialog-title"
              >
                <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                  <h3 id="cancel-dialog-title" className="text-lg font-semibold text-gray-900">
                    Cancel Order
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Are you sure you want to cancel this order? This action cannot be undone.
                  </p>
                  {order.paymentMethod !== 'CashOnDelivery' && (
                    <p className="mt-2 text-xs text-gray-500">
                      A refund will be initiated for your payment.
                    </p>
                  )}

                  {cancelOrderMutation.isError && (
                    <p className="mt-3 text-sm text-red-600">
                      {cancelOrderMutation.error instanceof Error
                        ? cancelOrderMutation.error.message
                        : 'Failed to cancel order. Please try again.'}
                    </p>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelConfirm(false);
                      }}
                      disabled={cancelOrderMutation.isPending}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Keep Order
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={cancelOrderMutation.isPending}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {cancelOrderMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Order'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Return/Exchange Form Modal */}
            {showReturnForm && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="return-dialog-title"
              >
                <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                  <h3 id="return-dialog-title" className="text-lg font-semibold text-gray-900">
                    Return or Exchange
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Select whether you would like to return or exchange this order.
                  </p>

                  {/* Type Selector */}
                  <fieldset className="mt-4">
                    <legend className="text-sm font-medium text-gray-700">Request Type</legend>
                    <div className="mt-2 flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="returnType"
                          value="Return"
                          checked={returnType === 'Return'}
                          onChange={() => {
                            setReturnType('Return');
                          }}
                          className="h-4 w-4 border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500"
                        />
                        <span className="text-sm text-gray-700">Return</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="returnType"
                          value="Exchange"
                          checked={returnType === 'Exchange'}
                          onChange={() => {
                            setReturnType('Exchange');
                          }}
                          className="h-4 w-4 border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500"
                        />
                        <span className="text-sm text-gray-700">Exchange</span>
                      </label>
                    </div>
                  </fieldset>

                  {returnExchangeMutation.isError && (
                    <p className="mt-3 text-sm text-red-600">
                      {returnExchangeMutation.error instanceof Error
                        ? returnExchangeMutation.error.message
                        : 'Failed to submit request. Please try again.'}
                    </p>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReturnForm(false);
                      }}
                      disabled={returnExchangeMutation.isPending}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReturnExchange}
                      disabled={returnExchangeMutation.isPending}
                      className="rounded-lg bg-brand-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {returnExchangeMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Component;
