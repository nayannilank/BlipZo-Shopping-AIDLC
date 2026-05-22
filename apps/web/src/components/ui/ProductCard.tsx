import type { CatalogueItem } from '@blipzo/shared';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: CatalogueItem;
}

function StarRating({ rating }: { rating: number }): React.ReactElement {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1" aria-label={`Rating: ${String(rating)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${
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
      <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps): React.ReactElement {
  return (
    <Link
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
      </div>
    </Link>
  );
}
