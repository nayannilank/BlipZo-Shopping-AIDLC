import { sellerPolicySchema } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
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
export function Component() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProductDetail(productId ?? '');
  const setPolicyMutation = useSetProductPolicy();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(policyFormSchema),
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
  function onSubmit(data) {
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
    return _jsxs('div', {
      className: 'min-h-screen bg-gray-50',
      children: [
        _jsx('header', {
          className: 'border-b border-gray-200 bg-white shadow-sm',
          children: _jsx('div', {
            className: 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8',
            children: _jsx(Link, {
              to: '/',
              className: 'text-2xl font-bold text-brand-blue-600',
              children: 'BlipZo',
            }),
          }),
        }),
        _jsx('main', {
          className: 'mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8',
          children: _jsxs('div', {
            className: 'animate-pulse space-y-4',
            children: [
              _jsx('div', { className: 'h-8 w-48 rounded bg-gray-200' }),
              _jsx('div', { className: 'h-48 rounded-lg bg-gray-200' }),
            ],
          }),
        }),
      ],
    });
  }
  if (isError || !product) {
    return _jsxs('div', {
      className: 'min-h-screen bg-gray-50',
      children: [
        _jsx('header', {
          className: 'border-b border-gray-200 bg-white shadow-sm',
          children: _jsx('div', {
            className: 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8',
            children: _jsx(Link, {
              to: '/',
              className: 'text-2xl font-bold text-brand-blue-600',
              children: 'BlipZo',
            }),
          }),
        }),
        _jsx('main', {
          className: 'mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8',
          children: _jsxs('div', {
            className: 'rounded-lg border border-red-200 bg-red-50 p-6 text-center',
            children: [
              _jsx('p', {
                className: 'text-sm font-medium text-red-800',
                children: 'Failed to load product details.',
              }),
              _jsx(Link, {
                to: '/seller/products',
                className:
                  'mt-4 inline-flex items-center text-sm text-brand-blue-600 hover:underline',
                children: 'Back to Products',
              }),
            ],
          }),
        }),
      ],
    });
  }
  return _jsxs('div', {
    className: 'min-h-screen bg-gray-50',
    children: [
      _jsx('header', {
        className: 'border-b border-gray-200 bg-white shadow-sm',
        children: _jsx('div', {
          className: 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8',
          children: _jsxs('div', {
            className: 'flex items-center justify-between',
            children: [
              _jsx(Link, {
                to: '/',
                className: 'text-2xl font-bold text-brand-blue-600',
                children: 'BlipZo',
              }),
              _jsx('span', {
                className:
                  'rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800',
                children: 'Seller Dashboard',
              }),
            ],
          }),
        }),
      }),
      _jsxs('main', {
        className: 'mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8',
        children: [
          _jsx('nav', {
            'aria-label': 'Breadcrumb',
            className: 'mb-6',
            children: _jsxs('ol', {
              className: 'flex items-center gap-2 text-sm text-gray-500',
              children: [
                _jsx('li', {
                  children: _jsx(Link, {
                    to: '/seller/products',
                    className: 'hover:text-brand-blue-600',
                    children: 'My Products',
                  }),
                }),
                _jsx('li', { 'aria-hidden': 'true', children: '/' }),
                _jsxs('li', {
                  className: 'font-medium text-gray-900',
                  children: ['Policy \u2014 ', product.name],
                }),
              ],
            }),
          }),
          _jsx('h1', {
            className: 'mb-2 text-2xl font-bold text-gray-900',
            children: 'Return & Exchange Policy',
          }),
          _jsxs('p', {
            className: 'mb-6 text-sm text-gray-500',
            children: [
              'Configure the return and exchange policy for',
              ' ',
              _jsx('span', { className: 'font-medium text-gray-700', children: product.name }),
            ],
          }),
          _jsx('div', {
            className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
            children: _jsxs('form', {
              onSubmit: (e) => {
                void handleSubmit(onSubmit)(e);
              },
              className: 'space-y-6',
              children: [
                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      htmlFor: 'returnWindowDays',
                      className: 'block text-sm font-medium text-gray-700',
                      children: 'Return Window (days)',
                    }),
                    _jsx('p', {
                      className: 'mt-0.5 text-xs text-gray-500',
                      children:
                        'Set to 0 to make this product non-returnable and non-exchangeable.',
                    }),
                    _jsx('input', {
                      id: 'returnWindowDays',
                      type: 'number',
                      min: 0,
                      max: 30,
                      ...register('returnWindowDays', { valueAsNumber: true }),
                      className:
                        'mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:w-32',
                    }),
                    errors.returnWindowDays &&
                      _jsx('p', {
                        className: 'mt-1 text-xs text-red-600',
                        children: errors.returnWindowDays.message,
                      }),
                    returnWindowDays === 0 &&
                      _jsx('p', {
                        className: 'mt-2 text-xs font-medium text-amber-700',
                        children: 'This product will be non-returnable and non-exchangeable.',
                      }),
                  ],
                }),
                _jsxs('div', {
                  className: 'flex items-center gap-3',
                  children: [
                    _jsx('input', {
                      id: 'exchangeAllowed',
                      type: 'checkbox',
                      ...register('exchangeAllowed'),
                      className:
                        'h-4 w-4 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500',
                    }),
                    _jsx('label', {
                      htmlFor: 'exchangeAllowed',
                      className: 'text-sm font-medium text-gray-700',
                      children: 'Allow exchanges',
                    }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      htmlFor: 'conditions',
                      className: 'block text-sm font-medium text-gray-700',
                      children: 'Conditions (optional)',
                    }),
                    _jsx('p', {
                      className: 'mt-0.5 text-xs text-gray-500',
                      children:
                        'Specify any conditions for returns or exchanges (e.g., "Item must be unused and in original packaging").',
                    }),
                    _jsx('textarea', {
                      id: 'conditions',
                      rows: 3,
                      ...register('conditions'),
                      className:
                        'mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                      placeholder: 'Enter return/exchange conditions...',
                    }),
                    errors.conditions &&
                      _jsx('p', {
                        className: 'mt-1 text-xs text-red-600',
                        children: errors.conditions.message,
                      }),
                  ],
                }),
                product.sellerPolicy &&
                  _jsx('div', {
                    className: 'rounded-md border border-gray-200 bg-gray-50 p-3',
                    children: _jsxs('p', {
                      className: 'text-xs font-medium text-gray-600',
                      children: [
                        'Current policy (version: ',
                        product.sellerPolicy.policyVersion.slice(0, 8),
                        ') \u2014 Last updated: ',
                        new Date(product.sellerPolicy.createdAt).toLocaleDateString('en-IN'),
                      ],
                    }),
                  }),
                setPolicyMutation.isError &&
                  _jsx('div', {
                    className: 'rounded-md border border-red-200 bg-red-50 p-3',
                    children: _jsx('p', {
                      className: 'text-sm text-red-800',
                      children:
                        setPolicyMutation.error instanceof Error
                          ? setPolicyMutation.error.message
                          : 'Failed to save policy. Please try again.',
                    }),
                  }),
                _jsxs('div', {
                  className: 'flex justify-between pt-4',
                  children: [
                    _jsx(Link, {
                      to: '/seller/products',
                      className:
                        'inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                      children: 'Cancel',
                    }),
                    _jsx('button', {
                      type: 'submit',
                      disabled: setPolicyMutation.isPending,
                      className:
                        'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                      children: setPolicyMutation.isPending ? 'Saving...' : 'Save Policy',
                    }),
                  ],
                }),
              ],
            }),
          }),
        ],
      }),
    ],
  });
}
export default Component;
