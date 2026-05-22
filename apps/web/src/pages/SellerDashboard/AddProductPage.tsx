import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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

type ProductInfoFormData = z.infer<typeof productInfoSchema>;

/** Step 2: Image upload - validated separately */
interface ImageValidationError {
  file: string;
  error: string;
}

const STEPS = ['Product Details', 'Images', 'Review'] as const;

export function Component(): React.ReactElement {
  const navigate = useNavigate();
  const createProductMutation = useCreateProduct();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageErrors, setImageErrors] = useState<ImageValidationError[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    trigger,
  } = useForm<ProductInfoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productInfoSchema as any),
    defaultValues: {
      name: '',
      description: '',
      price: undefined,
      stockQuantity: undefined,
      categories: '',
    },
  });

  function validateImages(files: File[]): ImageValidationError[] {
    const validationErrors: ImageValidationError[] = [];

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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validationErrors = validateImages(fileArray);
    setImageErrors(validationErrors);

    if (validationErrors.length === 0) {
      setSelectedFiles(fileArray);
    }
  }

  function removeFile(index: number): void {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setImageErrors(validateImages(updated));
  }

  async function handleNextStep(): Promise<void> {
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

  function handlePrevStep(): void {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }

  function onSubmit(): void {
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
            <li className="font-medium text-gray-900">Add Product</li>
          </ol>
        </nav>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Add New Product</h1>

        {/* Step Indicator */}
        <nav aria-label="Progress" className="mb-8">
          <ol className="flex items-center">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    index <= currentStep
                      ? 'bg-brand-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-4 h-0.5 flex-1 ${
                      index < currentStep ? 'bg-brand-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Step 1: Product Details */}
          {currentStep === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleNextStep();
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
                  placeholder="Enter product name"
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
                  placeholder="Describe your product"
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
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="stockQuantity"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Stock Quantity
                  </label>
                  <input
                    id="stockQuantity"
                    type="number"
                    {...register('stockQuantity', { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                    placeholder="0"
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
                  placeholder="Electronics, Gadgets"
                />
                {errors.categories && (
                  <p className="mt-1 text-xs text-red-600">{errors.categories.message}</p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                >
                  Next: Upload Images
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Image Upload */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                  Product Images (1-10 files, max 10 MB each, JPEG/PNG/WebP)
                </label>
                <div className="mt-2">
                  <input
                    id="images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-brand-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-blue-700 hover:file:bg-brand-blue-100"
                  />
                </div>
                {imageErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {imageErrors.map((err, i) => (
                      <p key={`img-err-${String(i)}`} className="text-xs text-red-600">
                        {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Selected files ({selectedFiles.length}/10)
                  </p>
                  <ul className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <li
                        key={`file-${String(index)}`}
                        className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                          <div>
                            <p className="text-sm text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeFile(index);
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleNextStep();
                  }}
                  className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Review Your Product</h2>

              <dl className="divide-y divide-gray-200">
                <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {getValues('name')}
                  </dd>
                </div>
                <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {getValues('description')}
                  </dd>
                </div>
                <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Price</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    ₹
                    {getValues('price').toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </dd>
                </div>
                <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Stock Quantity</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {getValues('stockQuantity')}
                  </dd>
                </div>
                <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Categories</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {getValues('categories')}
                  </dd>
                </div>
                <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Images</dt>
                  <dd className="mt-1 sm:col-span-2 sm:mt-0">
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <img
                          key={`preview-${String(index)}`}
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      ))}
                    </div>
                  </dd>
                </div>
              </dl>

              {createProductMutation.isError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">
                    {createProductMutation.error instanceof Error
                      ? createProductMutation.error.message
                      : 'Failed to create product. Please try again.'}
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit(onSubmit)();
                  }}
                  disabled={createProductMutation.isPending}
                  className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Component;
