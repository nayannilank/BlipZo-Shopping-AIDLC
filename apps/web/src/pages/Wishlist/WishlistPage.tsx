import { Link } from 'react-router-dom';

import { useWishlist, useRemoveFromWishlist } from '../../hooks/useWishlist';

function WishlistSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`skeleton-${String(i)}`}
          className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="h-24 w-24 flex-shrink-0 rounded-md bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-1/4 rounded bg-gray-200" />
            <div className="h-4 w-1/6 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyWishlist(): React.ReactElement {
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
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">Your wishlist is empty</h2>
      <p className="mt-1 text-sm text-gray-500">
        Browse products and add items you love to your wishlist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
      >
        Browse Products
      </Link>
    </div>
  );
}

export function Component(): React.ReactElement {
  const { data: wishlist, isLoading, isError, error } = useWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  function handleRemove(productId: string): void {
    removeFromWishlist.mutate(productId);
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
            <li className="font-medium text-gray-900">Wishlist</li>
          </ol>
        </nav>

        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">
          My Wishlist
          {wishlist && wishlist.count > 0 && (
            <span className="ml-2 text-lg font-normal text-gray-500">
              ({String(wishlist.count)} {wishlist.count === 1 ? 'item' : 'items'})
            </span>
          )}
        </h1>

        {/* Loading */}
        {isLoading && <WishlistSkeleton />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load your wishlist.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {wishlist && wishlist.items.length === 0 && <EmptyWishlist />}

        {/* Wishlist Items */}
        {wishlist && wishlist.items.length > 0 && (
          <ul className="space-y-4" aria-label="Wishlist items">
            {wishlist.items.map((item) => (
              <li
                key={item.productId}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                {/* Product Image */}
                <Link to={`/products/${item.productId}`} className="flex-shrink-0">
                  <img
                    src={item.primaryImageUrl}
                    alt={item.name}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                </Link>

                {/* Product Info */}
                <div className="flex flex-1 flex-col gap-1">
                  <Link
                    to={`/products/${item.productId}`}
                    className="text-base font-semibold text-gray-900 hover:text-brand-blue-600 sm:text-lg"
                  >
                    {item.name}
                  </Link>

                  <p className="text-lg font-bold text-brand-blue-700">
                    ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>

                  {/* Availability Badge */}
                  {item.isAvailable ? (
                    <span className="inline-flex w-fit items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex w-fit items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      Unavailable
                    </span>
                  )}

                  <p className="text-xs text-gray-400">
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleRemove(item.productId);
                  }}
                  disabled={removeFromWishlist.isPending}
                  aria-label={`Remove ${item.name} from wishlist`}
                  className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 sm:self-center"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default Component;
