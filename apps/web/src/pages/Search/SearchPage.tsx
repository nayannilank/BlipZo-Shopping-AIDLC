import type { CatalogueItem } from '@blipzo/shared';
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import { SearchBar } from '../../components/features/SearchBar';
import { ProductGrid } from '../../components/ui/ProductGrid';
import { useSearchProducts } from '../../hooks/useCatalogue';

function ProductGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white"
        >
          <div className="aspect-square w-full bg-gray-200" />
          <div className="p-3 sm:p-4">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="mt-2 h-5 w-1/2 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-1/3 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Component(): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const [searchQuery, setSearchQuery] = useState(queryParam);

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearchProducts(searchQuery);

  const allProducts: CatalogueItem[] = data?.pages.flatMap((page) => page.items) ?? [];

  function handleSearch(query: string): void {
    setSearchQuery(query);
    setSearchParams({ q: query });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-2xl font-bold text-brand-blue-600">
              BlipZo
            </Link>
            <div className="w-full sm:max-w-md">
              <SearchBar initialQuery={searchQuery} onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
            <li className="font-medium text-gray-900">Search</li>
          </ol>
        </nav>

        {searchQuery ? (
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Results for &ldquo;{searchQuery}&rdquo;
          </h1>
        ) : (
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Search Products</h1>
        )}

        {/* No query state */}
        {!searchQuery && (
          <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-600">
              Enter a search term to find products
            </p>
          </div>
        )}

        {/* Loading */}
        {searchQuery && isLoading && (
          <div className="mt-8">
            <ProductGridSkeleton />
          </div>
        )}

        {/* Error */}
        {searchQuery && isError && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Search failed.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'An unexpected error occurred.'}
            </p>
          </div>
        )}

        {/* Results */}
        {searchQuery && !isLoading && !isError && (
          <div className="mt-8">
            <ProductGrid products={allProducts} />

            {/* Load More */}
            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-lg bg-brand-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Results'}
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
