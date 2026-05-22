import type { CatalogueItem } from '@blipzo/shared';

import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: CatalogueItem[];
}

export function ProductGrid({ products }: ProductGridProps): React.ReactElement {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
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
        <p className="mt-4 text-lg font-medium text-gray-600">No products found</p>
        <p className="mt-1 text-sm text-gray-400">
          Try browsing a different category or adjusting your search.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
      {products.map((product) => (
        <ProductCard key={product.productId} product={product} />
      ))}
    </div>
  );
}
