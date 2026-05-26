import type { CategoryNode, CategoryTreeResponse } from '@blipzo/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { SearchBar } from '../../components/features/SearchBar';

const CATEGORY_ICONS: Record<string, string> = {
  cpu: '💻',
  shirt: '👕',
  home: '🏠',
  book: '📚',
  dumbbell: '🏋️',
  electronics: '💻',
  clothing: '👕',
  'home-kitchen': '🏠',
  books: '📚',
  'sports-outdoors': '🏋️',
};

function getCategoryIcon(icon?: string, slug?: string): string {
  if (icon && CATEGORY_ICONS[icon]) {
    return CATEGORY_ICONS[icon];
  }
  if (slug && CATEGORY_ICONS[slug]) {
    return CATEGORY_ICONS[slug];
  }
  return '📦';
}

async function fetchCategories(): Promise<CategoryNode[]> {
  const response = await apiClient.get<CategoryTreeResponse>('/catalogue/categories');
  return response.data.categories;
}

function CategoryCardSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div className="h-5 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export function Component(): React.JSX.Element {
  const navigate = useNavigate();
  const {
    data: categories,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });

  function handleSearch(query: string): void {
    void navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-2xl font-bold text-brand-blue-600">
              BlipZo
            </Link>
            <div className="w-full sm:max-w-md">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-brand-blue-600">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">Categories</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Browse Categories</h1>
        <p className="mt-2 text-sm text-gray-600">
          Explore our product categories to find what you need.
        </p>

        {isLoading && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load categories.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'An unexpected error occurred.'}
            </p>
          </div>
        )}

        {categories && categories.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.categoryId}
                to={`/browse/${category.categoryId}`}
                className="group flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
              >
                <span className="text-4xl" role="img" aria-label={category.name}>
                  {getCategoryIcon(category.icon, category.slug)}
                </span>
                <h2 className="text-center text-sm font-semibold text-gray-900 group-hover:text-brand-blue-600 sm:text-base">
                  {category.name}
                </h2>
              </Link>
            ))}
          </div>
        )}

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
