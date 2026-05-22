import type { OrderRecord } from '@blipzo/shared';
import { Link, useParams, useLocation } from 'react-router-dom';

interface LocationState {
  order?: OrderRecord;
}

export function Component(): React.ReactElement {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const order = state?.order;

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

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">Order Placed Successfully!</h1>

          <p className="mt-2 text-gray-600">
            Thank you for your purchase. Your order has been confirmed.
          </p>

          {/* Order Details */}
          <div className="mt-8 rounded-lg bg-gray-50 p-6 text-left">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Order ID</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {orderId ?? order?.orderId ?? '—'}
                </dd>
              </div>

              {order && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd>
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {order.orderStatus}
                      </span>
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                    <dd>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                    <dd className="text-sm text-gray-900">{order.paymentMethod}</dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="text-sm font-bold text-gray-900">
                      ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Order Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(order.orderTimestamp).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>

                  {order.items.length > 0 && (
                    <div className="pt-3">
                      <dt className="text-sm font-medium text-gray-500">Items Ordered</dt>
                      <dd className="mt-2">
                        <ul className="divide-y divide-gray-200">
                          {order.items.map((item) => (
                            <li key={item.productId} className="flex justify-between py-2">
                              <span className="text-sm text-gray-700">
                                {item.name} × {item.quantity}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                ₹
                                {item.subtotal.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Component;
