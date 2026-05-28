import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
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
export function Component() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProductDetail(productId ?? '');
  const updateProductMutation = useUpdateProduct();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(editProductSchema),
  });
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        price: product.price,
        stockQuantity: product.stockQuantity,
        categories: (product.categories ?? []).join(', '),
      });
    }
  }, [product, reset]);
  function onSubmit(data) {
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
              _jsx('div', { className: 'h-64 rounded-lg bg-gray-200' }),
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
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Edit Product' }),
              ],
            }),
          }),
          _jsx('h1', {
            className: 'mb-6 text-2xl font-bold text-gray-900',
            children: 'Edit Product',
          }),
          _jsxs('div', {
            className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
            children: [
              (product.imageUrls ?? []).length > 0 &&
                _jsxs('div', {
                  className: 'mb-6',
                  children: [
                    _jsx('p', {
                      className: 'mb-2 text-sm font-medium text-gray-700',
                      children: 'Current Images',
                    }),
                    _jsx('div', {
                      className: 'flex flex-wrap gap-2',
                      children: product.imageUrls.map((url, index) =>
                        _jsx(
                          'img',
                          {
                            src: url,
                            alt: `${product.name} image ${String(index + 1)}`,
                            className: 'h-20 w-20 rounded-md object-cover',
                          },
                          `img-${String(index)}`,
                        ),
                      ),
                    }),
                  ],
                }),
              _jsxs('form', {
                onSubmit: (e) => {
                  void handleSubmit(onSubmit)(e);
                },
                className: 'space-y-5',
                children: [
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        htmlFor: 'name',
                        className: 'block text-sm font-medium text-gray-700',
                        children: 'Product Name',
                      }),
                      _jsx('input', {
                        id: 'name',
                        type: 'text',
                        ...register('name'),
                        className:
                          'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                      }),
                      errors.name &&
                        _jsx('p', {
                          className: 'mt-1 text-xs text-red-600',
                          children: errors.name.message,
                        }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        htmlFor: 'description',
                        className: 'block text-sm font-medium text-gray-700',
                        children: 'Description',
                      }),
                      _jsx('textarea', {
                        id: 'description',
                        rows: 4,
                        ...register('description'),
                        className:
                          'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                      }),
                      errors.description &&
                        _jsx('p', {
                          className: 'mt-1 text-xs text-red-600',
                          children: errors.description.message,
                        }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'grid grid-cols-1 gap-5 sm:grid-cols-2',
                    children: [
                      _jsxs('div', {
                        children: [
                          _jsx('label', {
                            htmlFor: 'price',
                            className: 'block text-sm font-medium text-gray-700',
                            children: 'Price (\u20B9)',
                          }),
                          _jsx('input', {
                            id: 'price',
                            type: 'number',
                            step: '0.01',
                            ...register('price', { valueAsNumber: true }),
                            className:
                              'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                          }),
                          errors.price &&
                            _jsx('p', {
                              className: 'mt-1 text-xs text-red-600',
                              children: errors.price.message,
                            }),
                        ],
                      }),
                      _jsxs('div', {
                        children: [
                          _jsx('label', {
                            htmlFor: 'stockQuantity',
                            className: 'block text-sm font-medium text-gray-700',
                            children: 'Stock Quantity',
                          }),
                          _jsx('input', {
                            id: 'stockQuantity',
                            type: 'number',
                            ...register('stockQuantity', { valueAsNumber: true }),
                            className:
                              'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                          }),
                          errors.stockQuantity &&
                            _jsx('p', {
                              className: 'mt-1 text-xs text-red-600',
                              children: errors.stockQuantity.message,
                            }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        htmlFor: 'categories',
                        className: 'block text-sm font-medium text-gray-700',
                        children: 'Categories (comma-separated)',
                      }),
                      _jsx('input', {
                        id: 'categories',
                        type: 'text',
                        ...register('categories'),
                        className:
                          'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                      }),
                      errors.categories &&
                        _jsx('p', {
                          className: 'mt-1 text-xs text-red-600',
                          children: errors.categories.message,
                        }),
                    ],
                  }),
                  updateProductMutation.isError &&
                    _jsx('div', {
                      className: 'rounded-md border border-red-200 bg-red-50 p-3',
                      children: _jsx('p', {
                        className: 'text-sm text-red-800',
                        children:
                          updateProductMutation.error instanceof Error
                            ? updateProductMutation.error.message
                            : 'Failed to update product. Please try again.',
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
                        disabled: !isDirty || updateProductMutation.isPending,
                        className:
                          'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                        children: updateProductMutation.isPending ? 'Saving...' : 'Save Changes',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
export default Component;
