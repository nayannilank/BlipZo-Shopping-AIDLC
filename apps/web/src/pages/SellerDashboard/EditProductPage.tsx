import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod/v4';

import { useProductDetail, useUpdateProduct } from '../../hooks/useSellerProducts';

const editProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be at most 200 characters'),
  description: z
    .string()
    .min(1, 'Product description is required')
    .max(2000, 'Product description must be at most 2000 characters'),
  price: z
    .number({ error: 'Price must be a number' })
    .gt(0, 'Price must be greater than 0')
    .max(9999999.99, 'Price must be at most 9,999,999.99'),
  stockQuantity: z
    .number({ error: 'Stock quantity must be a number' })
    .int('Stock quantity must be an integer')
    .min(0, 'Stock quantity must be at least 0')
    .max(999999, 'Stock quantity must be at most 999,999'),
  categories: z.string().min(1, 'At least one category is required'),
});

type EditProductFormData = z.infer<typeof editProductSchema>;

export function Component(): React.ReactElement {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading, isError } = useProductDetail(productId ?? '');
  const updateProductMutation = useUpdateProduct();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<EditProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editProductSchema as any),
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        price: product.price,
        stockQuantity: product.stockQuantity,
        categories: product.categories.join(', '),
      });
    }
  }, [product, reset]);

  function onSubmit(data: EditProductFormData): void {
    if (!productId) return;

    const categories = data.categories
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    updateProductMutation.mutate(
      {
        productId,
        payload: {
          name: data.name,
          description: data.description,
          price: data.price,
          stockQuantity: data.stockQuantity,
          categories,
        },
      },
      {
        onSuccess: () => {
          void navigate('/seller/products');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <Link to="/" className="text-2xl font-bold text-brand-blue-600">
              BlipZo
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-64 rounded-lg bg-gray-200" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <Link to="/" className="text-2xl font-bold text-brand-blue-600">
              BlipZo
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load product details.</p>
            <Link
              to="/seller/products"
              className="mt-4 inline-flex items-center text-sm text-brand-blue-600 hover:underline"
            >
              Back to Products
            </Link>
          </div>
        </main>
      </div>
    );
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

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link to="/seller/products" className="hover:text-brand-blue-600">
                My Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">Edit Product</li>
          </ol>
        </nav>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Product</h1>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Existing images */}
          {product.imageUrls.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-gray-700">Current Images</p>
              <div className="flex flex-wrap gap-2">
                {product.imageUrls.map((url, index) => (
                  <img
                    key={`img-${String(index)}`}
                    src={url}
                    alt={`${product.name} image ${String(index + 1)}`}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                {...register('description')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price (₹)
                </label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                />
                {errors.price && (
                  <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700">
                  Stock Quantity
                </label>
                <input
                  id="stockQuantity"
                  type="number"
                  {...register('stockQuantity', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                />
                {errors.stockQuantity && (
                  <p className="mt-1 text-xs text-red-600">{errors.stockQuantity.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="categories" className="block text-sm font-medium text-gray-700">
                Categories (comma-separated)
              </label>
              <input
                id="categories"
                type="text"
                {...register('categories')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
              />
              {errors.categories && (
                <p className="mt-1 text-xs text-red-600">{errors.categories.message}</p>
              )}
            </div>

            {updateProductMutation.isError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  {updateProductMutation.error instanceof Error
                    ? updateProductMutation.error.message
                    : 'Failed to update product. Please try again.'}
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Link
                to="/seller/products"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!isDirty || updateProductMutation.isPending}
                className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Component;
