import type {
  CategoryNode,
  CategoryTreeResponse,
  ProductListItem,
  SubcategoryListResponse,
} from '@blipzo/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { SearchBar } from '../../components/features/SearchBar';

/**
 * Response shape for the subcategory products endpoint.
 * Includes items, pagination cursor, total count, and filter facets.
 */
interface SubcategoryProductsResponse {
  items: ProductListItem[];
  nextCursor?: string;
  total: number;
  filters: Record<string, Record<string, number>>;
}

interface FetchProductsParams {
  subcategoryId: string;
  cursor?: string;
  limit?: number;
  filters?: Record<string, string>;
}

async function fetchSubcategoryProducts(
  params: FetchProductsParams,
): Promise<SubcategoryProductsResponse> {
  const { subcategoryId, cursor, limit = 20, filters = {} } = params;
  const queryParams: Record<string, string | number> = { limit };
  if (cursor) {
    queryParams.cursor = cursor;
  }
  // Add dynamic filter params
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      queryParams[key] = value;
    }
  }
  const response = await apiClient.get<SubcategoryProductsResponse>(
    `/catalogue/categories/${subcategoryId}/products`,
    { params: queryParams },
  );
  return response.data;
}

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

function StarRating({ rating }: { rating: number }): React.JSX.Element {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${String(rating)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${
            i < fullStars
              ? 'text-yellow-400'
              : i === fullStars && hasHalf
                ? 'text-yellow-300'
                : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

function ProductCardSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="aspect-square w-full bg-gray-200" />
      <div className="p-3 sm:p-4">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-5 w-1/2 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-1/3 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function PreviewAttributes({
  attributes,
}: {
  attributes: Record<string, string | number | boolean | string[]>;
}): React.JSX.Element | null {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {entries.slice(0, 3).map(([key, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
        return (
          <span
            key={key}
            className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
          >
            {displayValue}
          </span>
        );
      })}
    </div>
  );
}

export function Component(): React.JSX.Element {
  const { categoryId, subcategoryId } = useParams<{
    categoryId: string;
    subcategoryId: string;
  }>();
  const navigate = useNavigate();

  // Fetch parent category name for breadcrumb
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch subcategories to get the current subcategory name for breadcrumb
  const subcategoriesQuery = useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: () => fetchSubcategories(categoryId as string),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 10,
  });

  // Infinite query for paginated products
  const productsQuery = useInfiniteQuery({
    queryKey: ['subcategoryProducts', subcategoryId],
    queryFn: ({ pageParam }) =>
      fetchSubcategoryProducts({
        subcategoryId: subcategoryId as string,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!subcategoryId,
  });

  const parentCategory = categoriesQuery.data?.find((c) => c.categoryId === categoryId);
  const categoryName = parentCategory?.name ?? 'Category';

  const currentSubcategory = subcategoriesQuery.data?.find((s) => s.categoryId === subcategoryId);
  const subcategoryName = currentSubcategory?.name ?? 'Subcategory';

  const allProducts = productsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = productsQuery.data?.pages[0]?.total ?? 0;

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
              <Link to="/browse" className="hover:text-brand-blue-600">
                Categories
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/browse/${categoryId}`} className="hover:text-brand-blue-600">
                {categoryName}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">{subcategoryName}</li>
          </ol>
        </nav>

        {/* Page heading */}
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{subcategoryName}</h1>
            {!productsQuery.isLoading && (
              <p className="mt-1 text-sm text-gray-600">
                {totalCount} {totalCount === 1 ? 'product' : 'products'} found
              </p>
            )}
          </div>
        </div>

        {/* Loading state */}
        {productsQuery.isLoading && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {Array.from({ length: 10 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {productsQuery.isError && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load products.</p>
            <p className="mt-1 text-xs text-red-600">
              {productsQuery.error instanceof Error
                ? productsQuery.error.message
                : 'An unexpected error occurred.'}
            </p>
          </div>
        )}

        {/* Product grid */}
        {!productsQuery.isLoading && !productsQuery.isError && allProducts.length > 0 && (
          <div className="mt-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {allProducts.map((product) => (
                <Link
                  key={product.productId}
                  to={`/products/${product.productId}`}
                  className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                >
                  <div className="aspect-square w-full overflow-hidden bg-gray-100">
                    <img
                      src={product.primaryImageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="line-clamp-2 text-sm font-medium text-gray-900 sm:text-base">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-lg font-bold text-brand-blue-700">
                      ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <StarRating rating={product.averageRating} />
                    <p className="mt-1 text-xs text-gray-500">by {product.sellerName}</p>
                    <PreviewAttributes attributes={product.previewAttributes} />
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More button */}
            {productsQuery.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => void productsQuery.fetchNextPage()}
                  disabled={productsQuery.isFetchingNextPage}
                  className="rounded-lg bg-brand-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {productsQuery.isFetchingNextPage ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!productsQuery.isLoading && !productsQuery.isError && allProducts.length === 0 && (
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-600">
              No products found in {subcategoryName}.
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Check back later for new listings in this category.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Component;
