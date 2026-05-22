import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { useProductDetail } from '../../hooks/useCatalogue';
import { useAddToWishlist } from '../../hooks/useWishlist';
import { useAuthStore } from '../../stores/auth.store';

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-square w-full rounded-lg bg-gray-200" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-gray-200" />
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="mt-6 h-12 w-full rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function Component(): React.ReactElement {
  const { productId } = useParams<{ productId: string }>();
  const { data: product, isLoading, isError, error } = useProductDetail(productId ?? '');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedImage, setSelectedImage] = useState(0);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [wishlistMessage, setWishlistMessage] = useState<string | null>(null);
  const addToWishlistMutation = useAddToWishlist();

  async function handleAddToCart(): Promise<void> {
    if (!product) return;
    try {
      await apiClient.put('/cart/items', {
        productId: product.productId,
        quantity: 1,
      });
      setCartMessage('Added to cart!');
      setTimeout(() => {
        setCartMessage(null);
      }, 3000);
    } catch {
      setCartMessage('Failed to add to cart.');
      setTimeout(() => {
        setCartMessage(null);
      }, 3000);
    }
  }

  function handleAddToWishlist(): void {
    if (!product) return;
    addToWishlistMutation.mutate(product.productId, {
      onSuccess: () => {
        setWishlistMessage('Added to wishlist!');
        setTimeout(() => {
          setWishlistMessage(null);
        }, 3000);
      },
      onError: () => {
        setWishlistMessage('Failed to add to wishlist.');
        setTimeout(() => {
          setWishlistMessage(null);
        }, 3000);
      },
    });
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
            <li className="font-medium text-gray-900">Product Detail</li>
          </ol>
        </nav>

        {/* Loading */}
        {isLoading && <DetailSkeleton />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load product details.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Product not found.'}
            </p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-medium text-brand-blue-600 hover:underline"
            >
              ← Back to Home
            </Link>
          </div>
        )}

        {/* Product Detail */}
        {product && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Image Gallery */}
            <div>
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={product.imageUrls[selectedImage] ?? product.imageUrls[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
              {product.imageUrls.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {product.imageUrls.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => {
                        setSelectedImage(index);
                      }}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                        selectedImage === index
                          ? 'border-brand-blue-500'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      aria-label={`View image ${String(index + 1)}`}
                    >
                      <img
                        src={url}
                        alt={`${product.name} - image ${String(index + 1)}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{product.name}</h1>

              <p className="mt-3 text-3xl font-bold text-brand-blue-700">
                ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>

              {/* Stock Status */}
              <div className="mt-3">
                {product.stockQuantity > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    In Stock ({String(product.stockQuantity)} available)
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {product.description}
                </p>
              </div>

              {/* Categories */}
              {product.categories.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Categories
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.categories.map((cat) => (
                      <Link
                        key={cat}
                        to={`/categories/${cat}`}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-brand-blue-50 hover:text-brand-blue-700"
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Seller Policy */}
              {product.sellerPolicy && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Return & Exchange Policy
                  </h2>
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Return Window:</span>{' '}
                      {product.sellerPolicy.returnWindowDays === 0
                        ? 'Non-returnable'
                        : `${String(product.sellerPolicy.returnWindowDays)} days`}
                    </p>
                    <p>
                      <span className="font-medium">Exchange:</span>{' '}
                      {product.sellerPolicy.exchangeAllowed ? 'Allowed' : 'Not allowed'}
                    </p>
                    {product.sellerPolicy.conditions && (
                      <p>
                        <span className="font-medium">Conditions:</span>{' '}
                        {product.sellerPolicy.conditions}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleAddToCart()}
                  disabled={!accessToken || product.stockQuantity === 0}
                  className="flex-1 rounded-lg bg-brand-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddToWishlist();
                  }}
                  disabled={!accessToken || addToWishlistMutation.isPending}
                  className="flex-1 rounded-lg border-2 border-brand-purple-500 px-6 py-3 text-sm font-semibold text-brand-purple-600 transition-colors hover:bg-brand-purple-50 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add to Wishlist
                </button>
              </div>

              {/* Auth hint */}
              {!accessToken && (
                <p className="mt-2 text-xs text-gray-500">
                  <Link to="/login" className="text-brand-blue-600 hover:underline">
                    Sign in
                  </Link>{' '}
                  to add items to your cart or wishlist.
                </p>
              )}

              {/* Feedback Messages */}
              {cartMessage && (
                <p
                  className="mt-2 text-sm font-medium text-green-700"
                  role="status"
                  aria-live="polite"
                >
                  {cartMessage}
                </p>
              )}
              {wishlistMessage && (
                <p
                  className="mt-2 text-sm font-medium text-green-700"
                  role="status"
                  aria-live="polite"
                >
                  {wishlistMessage}
                </p>
              )}

              {/* Metadata */}
              <div className="mt-8 border-t border-gray-200 pt-4">
                <dl className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <dt className="font-medium">Product ID</dt>
                    <dd className="mt-0.5 font-mono">{product.productId}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Listed</dt>
                    <dd className="mt-0.5">{new Date(product.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Component;
