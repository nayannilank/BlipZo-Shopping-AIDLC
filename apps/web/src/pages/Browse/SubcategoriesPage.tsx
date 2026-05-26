import type { CategoryNode, CategoryTreeResponse, SubcategoryListResponse } from '@blipzo/shared';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { SearchBar } from '../../components/features/SearchBar';

async function fetchCategories(): Promise<CategoryNode[]> {
  const response = await apiClient.get<CategoryTreeResponse>('/catalogue/categories');
  return response.data.categories;
}

async function fetchSubcategories(categoryId: string): Promise<CategoryNode[]> {
  const response = await apiClient.get<SubcategoryListResponse>(
    `/catalogue/categories/${categoryId}/subcategories`,
  );
  return response.data.subcategories;
}

function SubcategoryCardSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="h-5 w-2/3 rounded bg-gray-200" />
        <div className="h-5 w-5 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export function Component(): React.JSX.Element {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: () => fetchSubcategories(categoryId as string),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 10,
  });

  const parentCategory = categoriesQuery.data?.find((c) => c.categoryId === categoryId);
  const categoryName = parentCategory?.name ?? categoryId ?? 'Category';

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
            <li>
              <Link to="/browse" className="hover:text-brand-blue-600">
                Categories
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">{categoryName}</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{categoryName}</h1>
        <p className="mt-2 text-sm text-gray-600">Browse subcategories under {categoryName}.</p>

        {subcategoriesQuery.isLoading && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <SubcategoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {subcategoriesQuery.isError && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load subcategories.</p>
            <p className="mt-1 text-xs text-red-600">
              {subcategoriesQuery.error instanceof Error
                ? subcategoriesQuery.error.message
                : 'An unexpected error occurred.'}
            </p>
          </div>
        )}

        {subcategoriesQuery.data && subcategoriesQuery.data.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {subcategoriesQuery.data.map((subcategory) => (
              <Link
                key={subcategory.categoryId}
                to={`/browse/${categoryId}/${subcategory.categoryId}`}
                className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-brand-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
              >
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-brand-blue-600">
                  {subcategory.name}
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
              </Link>
            ))}
          </div>
        )}

        {subcategoriesQuery.data && subcategoriesQuery.data.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-gray-600">
              No subcategories available for {categoryName}.
            </p>
            <p className="mt-1 text-sm text-gray-400">Check back later for updates.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Component;
