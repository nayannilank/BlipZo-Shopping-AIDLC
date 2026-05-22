import { Link } from 'react-router-dom';

import { SearchBar } from '../../components/features/SearchBar';
import { useCategories } from '../../hooks/useCatalogue';

function CategorySkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
      <div className="h-6 w-3/4 rounded bg-gray-200" />
    </div>
  );
}

export function Component(): React.ReactElement {
  const { data: categories, isLoading, isError, error } = useCategories();

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
              <SearchBar />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Browse Categories</h1>
        <p className="mt-2 text-sm text-gray-600">
          Explore our product categories to find what you need.
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <CategorySkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load categories.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'An unexpected error occurred.'}
            </p>
          </div>
        )}

        {/* Categories Grid */}
        {categories && categories.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.categoryId}
                to={`/categories/${category.categoryId}`}
                className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-blue-600">
                    {category.name}
                  </h2>
                  <svg
                    className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {categories && categories.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-gray-600">No categories available yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Check back later for new product categories.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Component;
