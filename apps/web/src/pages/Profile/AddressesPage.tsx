import type { AddressRecord, AddressSchemaInput } from '@blipzo/shared';
import { addressSchema } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from '../../hooks/useAddress';

function AddressesSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`skeleton-${String(i)}`}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="h-5 w-1/3 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-2/3 rounded bg-gray-200" />
          <div className="mt-1 h-4 w-1/2 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function EmptyAddresses(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
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
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">No saved addresses</h2>
      <p className="mt-1 text-sm text-gray-500">Add a delivery address to get started.</p>
    </div>
  );
}

interface AddressFormProps {
  onSubmit: (data: AddressSchemaInput) => void;
  onCancel: () => void;
  isPending: boolean;
  defaultValues?: Partial<AddressSchemaInput>;
  submitLabel: string;
}

function AddressForm({
  onSubmit,
  onCancel,
  isPending,
  defaultValues,
  submitLabel,
}: AddressFormProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressSchemaInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            {...register('fullName')}
            aria-invalid={errors.fullName ? 'true' : undefined}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="John Doe"
          />
          {errors.fullName && (
            <p id="fullName-error" className="mt-1 text-xs text-red-600">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone (E.164) <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            {...register('phone')}
            aria-invalid={errors.phone ? 'true' : undefined}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="+919876543210"
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1 text-xs text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            id="country"
            type="text"
            {...register('country')}
            aria-invalid={errors.country ? 'true' : undefined}
            aria-describedby={errors.country ? 'country-error' : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="India"
          />
          {errors.country && (
            <p id="country-error" className="mt-1 text-xs text-red-600">
              {errors.country.message}
            </p>
          )}
        </div>

        {/* Address Line 1 */}
        <div className="sm:col-span-2">
          <label htmlFor="line1" className="block text-sm font-medium text-gray-700">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <input
            id="line1"
            type="text"
            {...register('line1')}
            aria-invalid={errors.line1 ? 'true' : undefined}
            aria-describedby={errors.line1 ? 'line1-error' : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="123 Main Street"
          />
          {errors.line1 && (
            <p id="line1-error" className="mt-1 text-xs text-red-600">
              {errors.line1.message}
            </p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="sm:col-span-2">
          <label htmlFor="line2" className="block text-sm font-medium text-gray-700">
            Address Line 2
          </label>
          <input
            id="line2"
            type="text"
            {...register('line2')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="Apartment, suite, etc. (optional)"
          />
        </div>

        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <input
            id="city"
            type="text"
            {...register('city')}
            aria-invalid={errors.city ? 'true' : undefined}
            aria-describedby={errors.city ? 'city-error' : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="Mumbai"
          />
          {errors.city && (
            <p id="city-error" className="mt-1 text-xs text-red-600">
              {errors.city.message}
            </p>
          )}
        </div>

        {/* State */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State <span className="text-red-500">*</span>
          </label>
          <input
            id="state"
            type="text"
            {...register('state')}
            aria-invalid={errors.state ? 'true' : undefined}
            aria-describedby={errors.state ? 'state-error' : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="Maharashtra"
          />
          {errors.state && (
            <p id="state-error" className="mt-1 text-xs text-red-600">
              {errors.state.message}
            </p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
            Postal Code <span className="text-red-500">*</span>
          </label>
          <input
            id="postalCode"
            type="text"
            {...register('postalCode')}
            aria-invalid={errors.postalCode ? 'true' : undefined}
            aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
            placeholder="400001"
          />
          {errors.postalCode && (
            <p id="postalCode-error" className="mt-1 text-xs text-red-600">
              {errors.postalCode.message}
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface AddressCardProps {
  address: AddressRecord;
  onEdit: (address: AddressRecord) => void;
  onDelete: (addressId: string) => void;
  onSetDefault: (addressId: string) => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
  isSettingDefault,
}: AddressCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Address Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{address.fullName}</h3>
            {address.isDefault && (
              <span className="inline-flex rounded-full bg-brand-blue-100 px-2.5 py-0.5 text-xs font-medium text-brand-blue-700">
                Default
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">{address.phone}</p>
          <p className="mt-1 text-sm text-gray-600">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}
          </p>
          <p className="text-sm text-gray-600">
            {address.city}, {address.state} {address.postalCode}
          </p>
          <p className="text-sm text-gray-600">{address.country}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {!address.isDefault && (
            <button
              type="button"
              onClick={() => {
                onSetDefault(address.addressId);
              }}
              disabled={isSettingDefault}
              aria-label={`Set ${address.fullName} as default address`}
              className="inline-flex items-center rounded-md border border-brand-blue-200 px-3 py-1.5 text-xs font-medium text-brand-blue-700 transition-colors hover:bg-brand-blue-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Set Default
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onEdit(address);
            }}
            aria-label={`Edit address for ${address.fullName}`}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete(address.addressId);
            }}
            disabled={isDeleting}
            aria-label={`Delete address for ${address.fullName}`}
            className="inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

type FormMode = 'idle' | 'add' | 'edit';

export function Component(): React.ReactElement {
  const { data: addresses, isLoading, isError, error } = useAddresses();
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const [formMode, setFormMode] = useState<FormMode>('idle');
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);

  function handleAddNew(): void {
    setFormMode('add');
    setEditingAddress(null);
  }

  function handleEdit(address: AddressRecord): void {
    setFormMode('edit');
    setEditingAddress(address);
  }

  function handleCancel(): void {
    setFormMode('idle');
    setEditingAddress(null);
  }

  function handleCreate(data: AddressSchemaInput): void {
    createMutation.mutate(data, {
      onSuccess: () => {
        setFormMode('idle');
      },
    });
  }

  function handleUpdate(data: AddressSchemaInput): void {
    if (!editingAddress) return;
    updateMutation.mutate(
      { addressId: editingAddress.addressId, data },
      {
        onSuccess: () => {
          setFormMode('idle');
          setEditingAddress(null);
        },
      },
    );
  }

  function handleDelete(addressId: string): void {
    deleteMutation.mutate(addressId);
  }

  function handleSetDefault(addressId: string): void {
    setDefaultMutation.mutate(addressId);
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
            <li className="font-medium text-gray-900">My Addresses</li>
          </ol>
        </nav>

        {/* Page Title + Add Button */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Addresses</h1>
          {formMode === 'idle' && (
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Address
            </button>
          )}
        </div>

        {/* Add Address Form */}
        {formMode === 'add' && (
          <section
            className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
            aria-labelledby="add-address-heading"
          >
            <h2 id="add-address-heading" className="mb-4 text-lg font-semibold text-gray-900">
              Add New Address
            </h2>
            {createMutation.isError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create address. Please try again.'}
                </p>
              </div>
            )}
            <AddressForm
              onSubmit={handleCreate}
              onCancel={handleCancel}
              isPending={createMutation.isPending}
              submitLabel="Add Address"
            />
          </section>
        )}

        {/* Edit Address Form */}
        {formMode === 'edit' && editingAddress && (
          <section
            className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
            aria-labelledby="edit-address-heading"
          >
            <h2 id="edit-address-heading" className="mb-4 text-lg font-semibold text-gray-900">
              Edit Address
            </h2>
            {updateMutation.isError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : 'Failed to update address. Please try again.'}
                </p>
              </div>
            )}
            <AddressForm
              onSubmit={handleUpdate}
              onCancel={handleCancel}
              isPending={updateMutation.isPending}
              defaultValues={{
                fullName: editingAddress.fullName,
                phone: editingAddress.phone,
                line1: editingAddress.line1,
                line2: editingAddress.line2 ?? '',
                city: editingAddress.city,
                state: editingAddress.state,
                postalCode: editingAddress.postalCode,
                country: editingAddress.country,
              }}
              submitLabel="Save Changes"
            />
          </section>
        )}

        {/* Loading */}
        {isLoading && <AddressesSkeleton />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load your addresses.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {addresses && addresses.length === 0 && formMode === 'idle' && <EmptyAddresses />}

        {/* Address List */}
        {addresses && addresses.length > 0 && (
          <ul className="space-y-4" aria-label="Saved addresses">
            {addresses.map((address) => (
              <li key={address.addressId}>
                <AddressCard
                  address={address}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                  isDeleting={deleteMutation.isPending}
                  isSettingDefault={setDefaultMutation.isPending}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default Component;
