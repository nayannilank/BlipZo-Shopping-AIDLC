import { sellerPolicySchema } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod/v4';

import { useProductDetail, useSetProductPolicy } from '../../hooks/useSellerProducts';

const policyFormSchema = z.object({
  returnWindowDays: z
    .number({ error: 'Return window must be a number' })
    .int('Return window must be a whole number')
    .min(0, 'Return window must be at least 0 days')
    .max(30, 'Return window must be at most 30 days'),
  exchangeAllowed: z.boolean(),
  conditions: z.string().optional(),
});

type PolicyFormData = z.infer<typeof policyFormSchema>;

export function Component(): React.ReactElement {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading, isError } = useProductDetail(productId ?? '');
  const setPolicyMutation = useSetProductPolicy();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PolicyFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(policyFormSchema as any),
    defaultValues: {
      returnWindowDays: 7,
      exchangeAllowed: false,
      conditions: '',
    },
  });

  const returnWindowDays = watch('returnWindowDays');

  useEffect(() => {
    if (product?.sellerPolicy) {
      reset({
        returnWindowDays: product.sellerPolicy.returnWindowDays,
        exchangeAllowed: product.sellerPolicy.exchangeAllowed,
        conditions: product.sellerPolicy.conditions ?? '',
      });
    }
  }, [product, reset]);

  function onSubmit(data: PolicyFormData): void {
    if (!productId) return;

    // Validate with shared schema as well
    const result = sellerPolicySchema.safeParse(data);
    if (!result.success) return;

    setPolicyMutation.mutate(
      {
        productId,
        payload: {
          returnWindowDays: data.returnWindowDays,
          exchangeAllowed: data.exchangeAllowed,
          conditions: data.conditions || undefined,
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
            <div className="h-48 rounded-lg bg-gray-200" />
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
            <li className="font-medium text-gray-900">Policy — {product.name}</li>
          </ol>
        </nav>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Return &amp; Exchange Policy</h1>
        <p className="mb-6 text-sm text-gray-500">
          Configure the return and exchange policy for{' '}
          <span className="font-medium text-gray-700">{product.name}</span>
        </p>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-6"
          >
            {/* Return Window */}
            <div>
              <label htmlFor="returnWindowDays" className="block text-sm font-medium text-gray-700">
                Return Window (days)
              </label>
              <p className="mt-0.5 text-xs text-gray-500">
                Set to 0 to make this product non-returnable and non-exchangeable.
              </p>
              <input
                id="returnWindowDays"
                type="number"
                min={0}
                max={30}
                {...register('returnWindowDays', { valueAsNumber: true })}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:w-32"
              />
              {errors.returnWindowDays && (
                <p className="mt-1 text-xs text-red-600">{errors.returnWindowDays.message}</p>
              )}
              {returnWindowDays === 0 && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  This product will be non-returnable and non-exchangeable.
                </p>
              )}
            </div>

            {/* Exchange Toggle */}
            <div className="flex items-center gap-3">
              <input
                id="exchangeAllowed"
                type="checkbox"
                {...register('exchangeAllowed')}
                className="h-4 w-4 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500"
              />
              <label htmlFor="exchangeAllowed" className="text-sm font-medium text-gray-700">
                Allow exchanges
              </label>
            </div>

            {/* Conditions */}
            <div>
              <label htmlFor="conditions" className="block text-sm font-medium text-gray-700">
                Conditions (optional)
              </label>
              <p className="mt-0.5 text-xs text-gray-500">
                Specify any conditions for returns or exchanges (e.g., &quot;Item must be unused and
                in original packaging&quot;).
              </p>
              <textarea
                id="conditions"
                rows={3}
                {...register('conditions')}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                placeholder="Enter return/exchange conditions..."
              />
              {errors.conditions && (
                <p className="mt-1 text-xs text-red-600">{errors.conditions.message}</p>
              )}
            </div>

            {/* Existing policy info */}
            {product.sellerPolicy && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600">
                  Current policy (version: {product.sellerPolicy.policyVersion.slice(0, 8)}) — Last
                  updated: {new Date(product.sellerPolicy.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            )}

            {setPolicyMutation.isError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  {setPolicyMutation.error instanceof Error
                    ? setPolicyMutation.error.message
                    : 'Failed to save policy. Please try again.'}
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
                disabled={setPolicyMutation.isPending}
                className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {setPolicyMutation.isPending ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Component;
