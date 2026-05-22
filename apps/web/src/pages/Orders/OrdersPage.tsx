import { Link } from 'react-router-dom';

import { useOrders } from '../../hooks/useOrder';

function OrdersSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`skeleton-${String(i)}`}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-gray-200" />
              <div className="h-4 w-28 rounded bg-gray-200" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-5 w-24 rounded bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyOrders(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
      <svg
        className="h-16 w-16 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">No orders yet</h2>
      <p className="mt-1 text-sm text-gray-500">Start shopping to see your orders here.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
      >
        Browse Products
      </Link>
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

export function Component(): React.ReactElement {
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useOrders(20);

  const orders = data?.pages.flatMap((page) => page.items) ?? [];

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
            <li className="font-medium text-gray-900">Orders</li>
          </ol>
        </nav>

        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">Order History</h1>

        {/* Loading */}
        {isLoading && <OrdersSkeleton />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load your orders.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && orders.length === 0 && <EmptyOrders />}

        {/* Orders List */}
        {orders.length > 0 && (
          <div className="space-y-4">
            <ul className="space-y-4" aria-label="Order history">
              {orders.map((order) => (
                <li key={order.orderId}>
                  <Link
                    to={`/orders/${order.orderId}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: Order ID & Date */}
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">
                          Order #{order.orderId.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.orderTimestamp).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {/* Item summary */}
                        <p className="text-xs text-gray-500">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                          {order.items.length > 0 && (
                            <span>
                              {' '}
                              &mdash;{' '}
                              {order.items
                                .slice(0, 2)
                                .map((item) => item.name)
                                .join(', ')}
                              {order.items.length > 2 && ` +${String(order.items.length - 2)} more`}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Right: Total & Status */}
                      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                        <p className="text-base font-bold text-gray-900">
                          ₹
                          {order.totalAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(order.orderStatus)}`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Load More */}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    void fetchNextPage();
                  }}
                  disabled={isFetchingNextPage}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Orders'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Component;
