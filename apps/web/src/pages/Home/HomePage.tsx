import type { CategoryNode, CategoryTreeResponse, SubcategoryListResponse } from '@blipzo/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { SearchBar } from '../../components/features/SearchBar';

// --- Types ---

interface ProductListItem {
  productId: string;
  name: string;
  price: number;
  primaryImageUrl?: string;
  imageUrls?: string[];
}

interface ProductsResponse {
  items: ProductListItem[];
  nextCursor?: string;
}

// --- API Functions ---

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

async function fetchSubcategoryProducts(
  subcategoryId: string,
  limit: number = 15,
): Promise<ProductsResponse> {
  const response = await apiClient.get<ProductsResponse>(
    `/catalogue/categories/${subcategoryId}/products`,
    { params: { limit } },
  );
  return response.data;
}

// --- Components ---

function ProductTile({ product }: { product: ProductListItem }): React.JSX.Element {
  const imageUrl = product.primaryImageUrl || (product.imageUrls ?? [])[0] || '';

  return (
    <Link
      to={`/products/${product.productId}`}
      className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:border-brand-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="p-3">
        <h3 className="truncate text-sm font-medium text-gray-900 group-hover:text-brand-blue-600">
          {product.name}
        </h3>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </Link>
  );
}

function ProductGrid({
  products,
  isLoading,
}: {
  products: ProductListItem[];
  isLoading: boolean;
}): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
        {Array.from({ length: 15 }, (_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <div className="aspect-square w-full bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-gray-600">No products found.</p>
        <p className="mt-1 text-sm text-gray-400">Try selecting a different category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
      {products.map((product) => (
        <ProductTile key={product.productId} product={product} />
      ))}
    </div>
  );
}

function CategorySidebar({
  categories,
  expandedCategoryId,
  selectedSubcategoryId,
  onCategoryClick,
  onSubcategoryClick,
  subcategories,
  isLoadingSubcategories,
}: {
  categories: CategoryNode[];
  expandedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onCategoryClick: (categoryId: string) => void;
  onSubcategoryClick: (subcategoryId: string) => void;
  subcategories: CategoryNode[];
  isLoadingSubcategories: boolean;
}): React.JSX.Element {
  return (
    <nav className="space-y-1" aria-label="Categories">
      {categories.map((category) => (
        <div key={category.categoryId}>
          <button
            type="button"
            onClick={() => onCategoryClick(category.categoryId)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              expandedCategoryId === category.categoryId
                ? 'bg-brand-blue-50 text-brand-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>{category.name}</span>
            <svg
              className={`h-4 w-4 transition-transform ${
                expandedCategoryId === category.categoryId ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Subcategories (expanded) */}
          {expandedCategoryId === category.categoryId && (
            <div className="ml-4 mt-1 space-y-0.5">
              {isLoadingSubcategories ? (
                <div className="space-y-1 py-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="h-7 w-3/4 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : subcategories.length > 0 ? (
                subcategories.map((sub) => (
                  <button
                    key={sub.categoryId}
                    type="button"
                    onClick={() => onSubcategoryClick(sub.categoryId)}
                    className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      selectedSubcategoryId === sub.categoryId
                        ? 'bg-brand-blue-100 font-medium text-brand-blue-800'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))
              ) : (
                <p className="px-3 py-1.5 text-xs text-gray-400">No subcategories</p>
              )}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

// --- Main Page Component ---

/**
 * Fetches products across all subcategories of a given category.
 * Distributes the limit evenly across subcategories.
 */
async function fetchProductsAcrossSubcategories(
  categoryId: string,
  totalLimit: number = 15,
): Promise<ProductsResponse> {
  try {
    // First get all subcategories
    const subcategories = await fetchSubcategories(categoryId);
    if (subcategories.length === 0) return { items: [] };

    // Fetch a few products from each subcategory (with error tolerance)
    const perSubcategory = Math.max(3, Math.ceil(totalLimit / subcategories.length));
    const results = await Promise.allSettled(
      subcategories.map((sub) => fetchSubcategoryProducts(sub.categoryId, perSubcategory)),
    );

    // Merge successful results only
    const allItems = results
      .filter((r): r is PromiseFulfilledResult<ProductsResponse> => r.status === 'fulfilled')
      .flatMap((r) => r.value.items);
    return { items: allItems.slice(0, totalLimit) };
  } catch {
    return { items: [] };
  }
}

/**
 * Fetches products across ALL categories (for the home page default view).
 * Gets a few products from each category's subcategories.
 */
async function fetchProductsAcrossAllCategories(
  categories: CategoryNode[],
  totalLimit: number = 15,
): Promise<ProductsResponse> {
  if (categories.length === 0) return { items: [] };

  // Fetch from each category in parallel (with error tolerance)
  const perCategory = Math.max(3, Math.ceil(totalLimit / categories.length));
  const results = await Promise.allSettled(
    categories.map((cat) => fetchProductsAcrossSubcategories(cat.categoryId, perCategory)),
  );

  // Merge successful results only
  const allItems = results
    .filter((r): r is PromiseFulfilledResult<ProductsResponse> => r.status === 'fulfilled')
    .flatMap((r) => r.value.items);
  return { items: allItems.slice(0, totalLimit) };
}

export function Component(): React.JSX.Element {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch subcategories when a category is expanded
  const subcategoriesQuery = useQuery({
    queryKey: ['subcategories', expandedCategoryId],
    queryFn: () => fetchSubcategories(expandedCategoryId as string),
    enabled: !!expandedCategoryId,
    staleTime: 1000 * 60 * 10,
  });

  const categories = categoriesQuery.data ?? [];

  // Fetch products based on selection
  const productsQuery = useQuery({
    queryKey: ['homeProducts', expandedCategoryId ?? 'all', selectedSubcategoryId ?? 'none'],
    queryFn: () => {
      if (selectedSubcategoryId) {
        // Subcategory selected: show products from that subcategory
        return fetchSubcategoryProducts(selectedSubcategoryId, 15);
      }
      if (expandedCategoryId) {
        // Category selected: show products across all its subcategories
        return fetchProductsAcrossSubcategories(expandedCategoryId, 15);
      }
      // Default: show products across all categories
      return fetchProductsAcrossAllCategories(categories, 15);
    },
    enabled: categories.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  function handleCategoryClick(categoryId: string): void {
    if (expandedCategoryId === categoryId) {
      // Collapse
      setExpandedCategoryId(null);
      setSelectedSubcategoryId(null);
    } else {
      setExpandedCategoryId(categoryId);
      setSelectedSubcategoryId(null);
    }
  }

  function handleSubcategoryClick(subcategoryId: string): void {
    setSelectedSubcategoryId(subcategoryId);
  }

  const subcategories = subcategoriesQuery.data ?? [];
  const products = productsQuery.data?.items ?? [];

  // Determine heading
  let heading = 'Top Products';
  if (selectedSubcategoryId) {
    const sub = subcategories.find((s) => s.categoryId === selectedSubcategoryId);
    heading = sub?.name ?? 'Products';
  } else if (expandedCategoryId) {
    const cat = categories.find((c) => c.categoryId === expandedCategoryId);
    heading = cat?.name ?? 'Products';
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
              {/* @ts-expect-error SearchBar onSearch is optional at runtime */}
              <SearchBar />
            </div>
          </div>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Left sidebar — Categories */}
          <aside className="hidden w-64 flex-shrink-0 md:block">
            <div className="sticky top-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Categories
              </h2>
              {categoriesQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : (
                <CategorySidebar
                  categories={categories}
                  expandedCategoryId={expandedCategoryId}
                  selectedSubcategoryId={selectedSubcategoryId}
                  onCategoryClick={handleCategoryClick}
                  onSubcategoryClick={handleSubcategoryClick}
                  subcategories={subcategories}
                  isLoadingSubcategories={subcategoriesQuery.isLoading}
                />
              )}
            </div>
          </aside>

          {/* Right content — Product grid */}
          <main className="min-w-0 flex-1">
            <div className="mb-4 flex items-baseline justify-between">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{heading}</h1>
              {products.length > 0 && (
                <span className="text-sm text-gray-500">
                  {products.length} product{products.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Mobile category selector */}
            <div className="mb-4 md:hidden">
              <select
                value={expandedCategoryId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setExpandedCategoryId(val);
                    setSelectedSubcategoryId(null);
                  } else {
                    setExpandedCategoryId(null);
                    setSelectedSubcategoryId(null);
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <ProductGrid products={products} isLoading={productsQuery.isLoading} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default Component;
