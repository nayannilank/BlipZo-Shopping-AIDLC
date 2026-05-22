import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod/v4';

import { useCreateProduct } from '../../hooks/useSellerProducts';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Step 1: Basic product info */
const productInfoSchema = z.object({
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
const STEPS = ['Product Details', 'Images', 'Review'];
export function Component() {
  const navigate = useNavigate();
  const createProductMutation = useCreateProduct();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imageErrors, setImageErrors] = useState([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    trigger,
  } = useForm({
    resolver: zodResolver(productInfoSchema),
    defaultValues: {
      name: '',
      description: '',
      price: undefined,
      stockQuantity: undefined,
      categories: '',
    },
  });
  function validateImages(files) {
    const validationErrors = [];
    if (files.length === 0) {
      validationErrors.push({
        file: '',
        error: 'At least one image is required',
      });
      return validationErrors;
    }
    if (files.length > 10) {
      validationErrors.push({
        file: '',
        error: 'At most 10 images are allowed',
      });
      return validationErrors;
    }
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push({
          file: file.name,
          error: `${file.name} exceeds 10 MB limit`,
        });
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        validationErrors.push({
          file: file.name,
          error: `${file.name} must be JPEG, PNG, or WebP`,
        });
      }
    }
    return validationErrors;
  }
  function handleFileChange(event) {
    const files = event.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    const validationErrors = validateImages(fileArray);
    setImageErrors(validationErrors);
    if (validationErrors.length === 0) {
      setSelectedFiles(fileArray);
    }
  }
  function removeFile(index) {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setImageErrors(validateImages(updated));
  }
  async function handleNextStep() {
    if (currentStep === 0) {
      const valid = await trigger();
      if (valid) {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      const validationErrors = validateImages(selectedFiles);
      setImageErrors(validationErrors);
      if (validationErrors.length === 0) {
        setCurrentStep(2);
      }
    }
  }
  function handlePrevStep() {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }
  function onSubmit() {
    const values = getValues();
    const categories = values.categories
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    createProductMutation.mutate(
      {
        name: values.name,
        description: values.description,
        price: values.price,
        stockQuantity: values.stockQuantity,
        categories,
        images: selectedFiles,
      },
      {
        onSuccess: () => {
          void navigate('/seller/products');
        },
      },
    );
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
                _jsx('li', { className: 'font-medium text-gray-900', children: 'Add Product' }),
              ],
            }),
          }),
          _jsx('h1', {
            className: 'mb-6 text-2xl font-bold text-gray-900',
            children: 'Add New Product',
          }),
          _jsx('nav', {
            'aria-label': 'Progress',
            className: 'mb-8',
            children: _jsx('ol', {
              className: 'flex items-center',
              children: STEPS.map((step, index) =>
                _jsxs(
                  'li',
                  {
                    className: `flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`,
                    children: [
                      _jsx('span', {
                        className: `flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                          index <= currentStep
                            ? 'bg-brand-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`,
                        children: index + 1,
                      }),
                      _jsx('span', {
                        className: `ml-2 text-sm font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-500'}`,
                        children: step,
                      }),
                      index < STEPS.length - 1 &&
                        _jsx('div', {
                          className: `mx-4 h-0.5 flex-1 ${index < currentStep ? 'bg-brand-blue-600' : 'bg-gray-200'}`,
                        }),
                    ],
                  },
                  step,
                ),
              ),
            }),
          }),
          _jsxs('div', {
            className: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
            children: [
              currentStep === 0 &&
                _jsxs('form', {
                  onSubmit: (e) => {
                    e.preventDefault();
                    void handleNextStep();
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
                          placeholder: 'Enter product name',
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
                          placeholder: 'Describe your product',
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
                              placeholder: '0.00',
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
                              placeholder: '0',
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
                          placeholder: 'Electronics, Gadgets',
                        }),
                        errors.categories &&
                          _jsx('p', {
                            className: 'mt-1 text-xs text-red-600',
                            children: errors.categories.message,
                          }),
                      ],
                    }),
                    _jsx('div', {
                      className: 'flex justify-end pt-4',
                      children: _jsx('button', {
                        type: 'submit',
                        className:
                          'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                        children: 'Next: Upload Images',
                      }),
                    }),
                  ],
                }),
              currentStep === 1 &&
                _jsxs('div', {
                  className: 'space-y-5',
                  children: [
                    _jsxs('div', {
                      children: [
                        _jsx('label', {
                          htmlFor: 'images',
                          className: 'block text-sm font-medium text-gray-700',
                          children: 'Product Images (1-10 files, max 10 MB each, JPEG/PNG/WebP)',
                        }),
                        _jsx('div', {
                          className: 'mt-2',
                          children: _jsx('input', {
                            id: 'images',
                            type: 'file',
                            multiple: true,
                            accept: 'image/jpeg,image/png,image/webp',
                            onChange: handleFileChange,
                            className:
                              'block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-brand-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-blue-700 hover:file:bg-brand-blue-100',
                          }),
                        }),
                        imageErrors.length > 0 &&
                          _jsx('div', {
                            className: 'mt-2 space-y-1',
                            children: imageErrors.map((err, i) =>
                              _jsx(
                                'p',
                                { className: 'text-xs text-red-600', children: err.error },
                                `img-err-${String(i)}`,
                              ),
                            ),
                          }),
                      ],
                    }),
                    selectedFiles.length > 0 &&
                      _jsxs('div', {
                        children: [
                          _jsxs('p', {
                            className: 'mb-2 text-sm font-medium text-gray-700',
                            children: ['Selected files (', selectedFiles.length, '/10)'],
                          }),
                          _jsx('ul', {
                            className: 'space-y-2',
                            children: selectedFiles.map((file, index) =>
                              _jsxs(
                                'li',
                                {
                                  className:
                                    'flex items-center justify-between rounded-md border border-gray-200 px-3 py-2',
                                  children: [
                                    _jsxs('div', {
                                      className: 'flex items-center gap-3',
                                      children: [
                                        _jsx('img', {
                                          src: URL.createObjectURL(file),
                                          alt: file.name,
                                          className: 'h-10 w-10 rounded object-cover',
                                        }),
                                        _jsxs('div', {
                                          children: [
                                            _jsx('p', {
                                              className: 'text-sm text-gray-900',
                                              children: file.name,
                                            }),
                                            _jsxs('p', {
                                              className: 'text-xs text-gray-500',
                                              children: [
                                                (file.size / (1024 * 1024)).toFixed(2),
                                                ' MB',
                                              ],
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    _jsx('button', {
                                      type: 'button',
                                      onClick: () => {
                                        removeFile(index);
                                      },
                                      className: 'text-xs text-red-600 hover:text-red-800',
                                      children: 'Remove',
                                    }),
                                  ],
                                },
                                `file-${String(index)}`,
                              ),
                            ),
                          }),
                        ],
                      }),
                    _jsxs('div', {
                      className: 'flex justify-between pt-4',
                      children: [
                        _jsx('button', {
                          type: 'button',
                          onClick: handlePrevStep,
                          className:
                            'inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                          children: 'Back',
                        }),
                        _jsx('button', {
                          type: 'button',
                          onClick: () => {
                            void handleNextStep();
                          },
                          className:
                            'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                          children: 'Next: Review',
                        }),
                      ],
                    }),
                  ],
                }),
              currentStep === 2 &&
                _jsxs('div', {
                  className: 'space-y-5',
                  children: [
                    _jsx('h2', {
                      className: 'text-lg font-semibold text-gray-900',
                      children: 'Review Your Product',
                    }),
                    _jsxs('dl', {
                      className: 'divide-y divide-gray-200',
                      children: [
                        _jsxs('div', {
                          className: 'py-3 sm:grid sm:grid-cols-3 sm:gap-4',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Name',
                            }),
                            _jsx('dd', {
                              className: 'mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0',
                              children: getValues('name'),
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'py-3 sm:grid sm:grid-cols-3 sm:gap-4',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Description',
                            }),
                            _jsx('dd', {
                              className: 'mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0',
                              children: getValues('description'),
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'py-3 sm:grid sm:grid-cols-3 sm:gap-4',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Price',
                            }),
                            _jsxs('dd', {
                              className: 'mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0',
                              children: [
                                '\u20B9',
                                getValues('price').toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                }),
                              ],
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'py-3 sm:grid sm:grid-cols-3 sm:gap-4',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Stock Quantity',
                            }),
                            _jsx('dd', {
                              className: 'mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0',
                              children: getValues('stockQuantity'),
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'py-3 sm:grid sm:grid-cols-3 sm:gap-4',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Categories',
                            }),
                            _jsx('dd', {
                              className: 'mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0',
                              children: getValues('categories'),
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'py-3 sm:grid sm:grid-cols-3 sm:gap-4',
                          children: [
                            _jsx('dt', {
                              className: 'text-sm font-medium text-gray-500',
                              children: 'Images',
                            }),
                            _jsx('dd', {
                              className: 'mt-1 sm:col-span-2 sm:mt-0',
                              children: _jsx('div', {
                                className: 'flex flex-wrap gap-2',
                                children: selectedFiles.map((file, index) =>
                                  _jsx(
                                    'img',
                                    {
                                      src: URL.createObjectURL(file),
                                      alt: file.name,
                                      className: 'h-16 w-16 rounded-md object-cover',
                                    },
                                    `preview-${String(index)}`,
                                  ),
                                ),
                              }),
                            }),
                          ],
                        }),
                      ],
                    }),
                    createProductMutation.isError &&
                      _jsx('div', {
                        className: 'rounded-md border border-red-200 bg-red-50 p-3',
                        children: _jsx('p', {
                          className: 'text-sm text-red-800',
                          children:
                            createProductMutation.error instanceof Error
                              ? createProductMutation.error.message
                              : 'Failed to create product. Please try again.',
                        }),
                      }),
                    _jsxs('div', {
                      className: 'flex justify-between pt-4',
                      children: [
                        _jsx('button', {
                          type: 'button',
                          onClick: handlePrevStep,
                          className:
                            'inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                          children: 'Back',
                        }),
                        _jsx('button', {
                          type: 'button',
                          onClick: () => {
                            void handleSubmit(onSubmit)();
                          },
                          disabled: createProductMutation.isPending,
                          className:
                            'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                          children: createProductMutation.isPending
                            ? 'Creating...'
                            : 'Create Product',
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
