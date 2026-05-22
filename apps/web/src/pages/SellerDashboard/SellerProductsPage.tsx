import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useSellerProducts, useDeleteProduct } from '../../hooks/useSellerProducts';

function ProductsSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`skeleton-${String(i)}`}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 rounded bg-gray-200" />
              <div className="h-4 w-32 rounded bg-gray-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded bg-gray-200" />
              <div className="h-8 w-16 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProducts(): React.ReactElement {
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">No products yet</h2>
      <p className="mt-1 text-sm text-gray-500">
        Add your first product to start selling on BlipZo.
      </p>
      <Link
        to="/seller/products/new"
        className="mt-6 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
      >
        Add Product
      </Link>
    </div>
  );
}

export function Component(): React.ReactElement {
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSellerProducts(20);

  const deleteProductMutation = useDeleteProduct();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const products = data?.pages.flatMap((page) => page.items) ?? [];

  function handleDelete(productId: string): void {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    setDeletingId(productId);
    deleteProductMutation.mutate(productId, {
      onSettled: () => {
        setDeletingId(null);
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-brand-blue-600">
              BlipZo
            </Link>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
              Seller Dashboard
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Products</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your product listings</p>
          </div>
          <Link
            to="/seller/products/new"
            className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
          >
            <svg
              className="-ml-0.5 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Product
          </Link>
        </div>

        {/* Loading */}
        {isLoading && <ProductsSkeleton />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load your products.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && products.length === 0 && <EmptyProducts />}

        {/* Products List */}
        {products.length > 0 && (
          <div className="space-y-4">
            <ul className="space-y-3" aria-label="Product list">
              {products.map((product) => (
                <li
                  key={product.productId}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Product Image */}
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {product.imageUrls.length > 0 ? (
                        <img
                          src={product.imageUrls[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <svg
                            className="h-8 w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-gray-900">
                        {product.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="font-medium text-gray-900">
                          ₹
                          {product.price.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span>Stock: {product.stockQuantity}</span>
                        <span>{product.categories.join(', ')}</span>
                        {product.sellerPolicy && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                            Policy set
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/seller/products/${product.productId}/edit`}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-1"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/seller/products/${product.productId}/policy`}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-1"
                      >
                        Policy
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(product.productId);
                        }}
                        disabled={deletingId === product.productId}
                        className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                      >
                        {deletingId === product.productId ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
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
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
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
