import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod/v4';

import { apiClient } from '../../api/client';

import { CategorySelector } from './components/CategorySelector';
import { DynamicAttributeForm } from './components/DynamicAttributeForm';

// --- Types ---

type DynamicAttributeValues = Record<string, string | number | boolean | string[]>;

interface CreateProductWithCategoryPayload {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categoryId: string;
  subcategoryId: string;
  dynamicAttributes: DynamicAttributeValues;
  images: Array<{ filename: string; contentType: string; sizeBytes: number }>;
}

interface ApiValidationError {
  statusCode: number;
  error: string;
  message: string;
  fields?: Record<string, string>;
}

// --- Validation Schema for Common Fields (Step 3) ---

const commonFieldsSchema = z.object({
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
    .max(9999999.99, 'Price must be at most ₹9,999,999.99'),
  stockQuantity: z
    .number({ error: 'Stock quantity must be a number' })
    .int('Stock quantity must be an integer')
    .min(0, 'Stock quantity must be at least 0')
    .max(999999, 'Stock quantity must be at most 999,999'),
});

type CommonFieldsFormData = z.infer<typeof commonFieldsSchema>;

// --- Constants ---

const STEPS = ['Category', 'Attributes', 'Product Details'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// --- API Function ---

async function createProductWithCategory(
  payload: CreateProductWithCategoryPayload,
): Promise<unknown> {
  const response = await apiClient.post('/products', payload);
  return response.data;
}

// --- Component ---

export function Component(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Category selection state
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  // Step 2: Dynamic attributes state
  const [dynamicAttributes, setDynamicAttributes] = useState<DynamicAttributeValues>({});

  // Step 3: Images state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  // API error state
  const [apiFieldErrors, setApiFieldErrors] = useState<Record<string, string>>({});

  // Common fields form (Step 3)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommonFieldsFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(commonFieldsSchema as any),
    defaultValues: {
      name: '',
      description: '',
      price: undefined,
      stockQuantity: undefined,
    },
  });

  // Mutation
  const createMutation = useMutation({
    mutationFn: createProductWithCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      void navigate('/seller/products');
    },
    onError: (error: AxiosError<ApiValidationError>) => {
      if (error.response?.data?.fields) {
        setApiFieldErrors(error.response.data.fields);
      }
    },
  });

  // --- Step 1 Handlers ---

  function handleCategorySelect(selectedCategoryId: string, selectedSubcategoryId: string): void {
    setCategoryId(selectedCategoryId);
    setSubcategoryId(selectedSubcategoryId);
  }

  function handleStep1Next(): void {
    if (categoryId && subcategoryId) {
      setCurrentStep(1);
    }
  }

  // --- Step 2 Handlers ---

  function handleDynamicAttributesSubmit(values: DynamicAttributeValues): void {
    setDynamicAttributes(values);
    setCurrentStep(2);
  }

  // --- Step 3 Handlers ---

  function validateImages(files: File[]): string[] {
    const validationErrors: string[] = [];
    if (files.length === 0) {
      validationErrors.push('At least one image is required');
      return validationErrors;
    }
    if (files.length > 10) {
      validationErrors.push('At most 10 images are allowed');
      return validationErrors;
    }
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(`${file.name} exceeds 10 MB limit`);
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        validationErrors.push(`${file.name} must be JPEG, PNG, or WebP`);
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

  function handleFinalSubmit(formData: CommonFieldsFormData): void {
    // Validate images before submitting
    const imgErrors = validateImages(selectedFiles);
    setImageErrors(imgErrors);
    if (imgErrors.length > 0) return;

    setApiFieldErrors({});

    const payload: CreateProductWithCategoryPayload = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      stockQuantity: formData.stockQuantity,
      categoryId,
      subcategoryId,
      dynamicAttributes,
      images: selectedFiles.map((file) => ({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })),
    };

    createMutation.mutate(payload);
  }

  function handlePrevStep(): void {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50">
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
          {/* Step 1: Category Selection */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Select Category</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose the category and subcategory for your product.
                </p>
              </div>

              <CategorySelector onSelect={handleCategorySelect} />

              {subcategoryId && (
                <p className="text-sm text-green-600">✓ Category and subcategory selected</p>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={!categoryId || !subcategoryId}
                  className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next: Attributes
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Dynamic Attributes */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Category Attributes</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Fill in the category-specific attributes for your product.
                </p>
              </div>

              <DynamicAttributeForm
                subcategoryId={subcategoryId}
                defaultValues={dynamicAttributes}
                onSubmit={handleDynamicAttributesSubmit}
              />

              {/* API field errors for dynamic attributes */}
              {Object.keys(apiFieldErrors).length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4">
                  <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {Object.entries(apiFieldErrors)
                      .filter(([key]) => key.startsWith('dynamicAttributes.'))
                      .map(([key, message]) => (
                        <li key={key} className="text-sm text-red-700">
                          {message}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Common Fields (name, description, price, stock, images) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the common product information and upload images.
                </p>
              </div>

              <form
                id="common-fields-form"
                onSubmit={handleSubmit(handleFinalSubmit)}
                className="space-y-5"
                noValidate
              >
                {/* Product Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                      errors.name || apiFieldErrors['name']
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                    }`}
                    placeholder="Enter product name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                  {apiFieldErrors['name'] && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {apiFieldErrors['name']}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    {...register('description')}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                      errors.description || apiFieldErrors['description']
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                    }`}
                    placeholder="Describe your product"
                    aria-invalid={!!errors.description}
                    aria-describedby={errors.description ? 'description-error' : undefined}
                  />
                  {errors.description && (
                    <p id="description-error" className="mt-1 text-xs text-red-600" role="alert">
                      {errors.description.message}
                    </p>
                  )}
                  {apiFieldErrors['description'] && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {apiFieldErrors['description']}
                    </p>
                  )}
                </div>

                {/* Price and Stock */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="price"
                      type="number"
                      step="0.01"
                      {...register('price', { valueAsNumber: true })}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                        errors.price || apiFieldErrors['price']
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                      }`}
                      placeholder="0.00"
                      aria-invalid={!!errors.price}
                      aria-describedby={errors.price ? 'price-error' : undefined}
                    />
                    {errors.price && (
                      <p id="price-error" className="mt-1 text-xs text-red-600" role="alert">
                        {errors.price.message}
                      </p>
                    )}
                    {apiFieldErrors['price'] && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {apiFieldErrors['price']}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="stockQuantity"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="stockQuantity"
                      type="number"
                      {...register('stockQuantity', { valueAsNumber: true })}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                        errors.stockQuantity || apiFieldErrors['stockQuantity']
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                      }`}
                      placeholder="0"
                      aria-invalid={!!errors.stockQuantity}
                      aria-describedby={errors.stockQuantity ? 'stockQuantity-error' : undefined}
                    />
                    {errors.stockQuantity && (
                      <p
                        id="stockQuantity-error"
                        className="mt-1 text-xs text-red-600"
                        role="alert"
                      >
                        {errors.stockQuantity.message}
                      </p>
                    )}
                    {apiFieldErrors['stockQuantity'] && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {apiFieldErrors['stockQuantity']}
                      </p>
                    )}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                    Product Images <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      (1–10 files, max 10 MB each, JPEG/PNG/WebP)
                    </span>
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
                          {err}
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
                            onClick={() => removeFile(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* API-level error */}
                {createMutation.isError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-800">
                      {createMutation.error instanceof Error
                        ? createMutation.error.message
                        : 'Failed to create product. Please try again.'}
                    </p>
                    {Object.keys(apiFieldErrors).length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {Object.entries(apiFieldErrors).map(([key, message]) => (
                          <li key={key} className="text-sm text-red-700">
                            <span className="font-medium">{key}:</span> {message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Component;
