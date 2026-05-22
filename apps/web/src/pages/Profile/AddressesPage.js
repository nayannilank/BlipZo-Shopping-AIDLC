import { addressSchema } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from '../../hooks/useAddress';
function AddressesSkeleton() {
  return _jsx('div', {
    className: 'animate-pulse space-y-4',
    children: Array.from({ length: 3 }).map((_, i) =>
      _jsxs(
        'div',
        {
          className: 'rounded-lg border border-gray-200 bg-white p-4',
          children: [
            _jsx('div', { className: 'h-5 w-1/3 rounded bg-gray-200' }),
            _jsx('div', { className: 'mt-2 h-4 w-2/3 rounded bg-gray-200' }),
            _jsx('div', { className: 'mt-1 h-4 w-1/2 rounded bg-gray-200' }),
          ],
        },
        `skeleton-${String(i)}`,
      ),
    ),
  });
}
function EmptyAddresses() {
  return _jsxs('div', {
    className:
      'flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center',
    children: [
      _jsxs('svg', {
        className: 'h-16 w-16 text-gray-300',
        fill: 'none',
        viewBox: '0 0 24 24',
        stroke: 'currentColor',
        'aria-hidden': 'true',
        children: [
          _jsx('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 1.5,
            d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
          }),
          _jsx('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 1.5,
            d: 'M15 11a3 3 0 11-6 0 3 3 0 016 0z',
          }),
        ],
      }),
      _jsx('h2', {
        className: 'mt-4 text-lg font-semibold text-gray-900',
        children: 'No saved addresses',
      }),
      _jsx('p', {
        className: 'mt-1 text-sm text-gray-500',
        children: 'Add a delivery address to get started.',
      }),
    ],
  });
}
function AddressForm({ onSubmit, onCancel, isPending, defaultValues, submitLabel }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
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
  return _jsxs('form', {
    onSubmit: (e) => {
      void handleSubmit(onSubmit)(e);
    },
    className: 'space-y-4',
    noValidate: true,
    children: [
      _jsxs('div', {
        className: 'grid gap-4 sm:grid-cols-2',
        children: [
          _jsxs('div', {
            className: 'sm:col-span-2',
            children: [
              _jsxs('label', {
                htmlFor: 'fullName',
                className: 'block text-sm font-medium text-gray-700',
                children: [
                  'Full Name ',
                  _jsx('span', { className: 'text-red-500', children: '*' }),
                ],
              }),
              _jsx('input', {
                id: 'fullName',
                type: 'text',
                ...register('fullName'),
                'aria-invalid': errors.fullName ? 'true' : undefined,
                'aria-describedby': errors.fullName ? 'fullName-error' : undefined,
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: 'John Doe',
              }),
              errors.fullName &&
                _jsx('p', {
                  id: 'fullName-error',
                  className: 'mt-1 text-xs text-red-600',
                  children: errors.fullName.message,
                }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsxs('label', {
                htmlFor: 'phone',
                className: 'block text-sm font-medium text-gray-700',
                children: [
                  'Phone (E.164) ',
                  _jsx('span', { className: 'text-red-500', children: '*' }),
                ],
              }),
              _jsx('input', {
                id: 'phone',
                type: 'tel',
                ...register('phone'),
                'aria-invalid': errors.phone ? 'true' : undefined,
                'aria-describedby': errors.phone ? 'phone-error' : undefined,
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: '+919876543210',
              }),
              errors.phone &&
                _jsx('p', {
                  id: 'phone-error',
                  className: 'mt-1 text-xs text-red-600',
                  children: errors.phone.message,
                }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsxs('label', {
                htmlFor: 'country',
                className: 'block text-sm font-medium text-gray-700',
                children: ['Country ', _jsx('span', { className: 'text-red-500', children: '*' })],
              }),
              _jsx('input', {
                id: 'country',
                type: 'text',
                ...register('country'),
                'aria-invalid': errors.country ? 'true' : undefined,
                'aria-describedby': errors.country ? 'country-error' : undefined,
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: 'India',
              }),
              errors.country &&
                _jsx('p', {
                  id: 'country-error',
                  className: 'mt-1 text-xs text-red-600',
                  children: errors.country.message,
                }),
            ],
          }),
          _jsxs('div', {
            className: 'sm:col-span-2',
            children: [
              _jsxs('label', {
                htmlFor: 'line1',
                className: 'block text-sm font-medium text-gray-700',
                children: [
                  'Address Line 1 ',
                  _jsx('span', { className: 'text-red-500', children: '*' }),
                ],
              }),
              _jsx('input', {
                id: 'line1',
                type: 'text',
                ...register('line1'),
                'aria-invalid': errors.line1 ? 'true' : undefined,
                'aria-describedby': errors.line1 ? 'line1-error' : undefined,
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: '123 Main Street',
              }),
              errors.line1 &&
                _jsx('p', {
                  id: 'line1-error',
                  className: 'mt-1 text-xs text-red-600',
                  children: errors.line1.message,
                }),
            ],
          }),
          _jsxs('div', {
            className: 'sm:col-span-2',
            children: [
              _jsx('label', {
                htmlFor: 'line2',
                className: 'block text-sm font-medium text-gray-700',
                children: 'Address Line 2',
              }),
              _jsx('input', {
                id: 'line2',
                type: 'text',
                ...register('line2'),
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: 'Apartment, suite, etc. (optional)',
              }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsxs('label', {
                htmlFor: 'city',
                className: 'block text-sm font-medium text-gray-700',
                children: ['City ', _jsx('span', { className: 'text-red-500', children: '*' })],
              }),
              _jsx('input', {
                id: 'city',
                type: 'text',
                ...register('city'),
                'aria-invalid': errors.city ? 'true' : undefined,
                'aria-describedby': errors.city ? 'city-error' : undefined,
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: 'Mumbai',
              }),
              errors.city &&
                _jsx('p', {
                  id: 'city-error',
                  className: 'mt-1 text-xs text-red-600',
                  children: errors.city.message,
                }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsxs('label', {
                htmlFor: 'state',
                className: 'block text-sm font-medium text-gray-700',
                children: ['State ', _jsx('span', { className: 'text-red-500', children: '*' })],
              }),
              _jsx('input', {
                id: 'state',
                type: 'text',
                ...register('state'),
                'aria-invalid': errors.state ? 'true' : undefined,
                'aria-describedby': errors.state ? 'state-error' : undefined,
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: 'Maharashtra',
              }),
              errors.state &&
                _jsx('p', {
                  id: 'state-error',
                  className: 'mt-1 text-xs text-red-600',
                  children: errors.state.message,
                }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsxs('label', {
                htmlFor: 'postalCode',
                className: 'block text-sm font-medium text-gray-700',
                children: [
                  'Postal Code ',
                  _jsx('span', { className: 'text-red-500', children: '*' }),
                ],
              }),
              _jsx('input', {
                id: 'postalCode',
                type: 'text',
                ...register('postalCode'),
                'aria-invalid': errors.postalCode ? 'true' : undefined,
                'aria-describedby': errors.postalCode ? 'postalCode-error' : undefined,
                className:
                  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500',
                placeholder: '400001',
              }),
              errors.postalCode &&
                _jsx('p', {
                  id: 'postalCode-error',
                  className: 'mt-1 text-xs text-red-600',
                  children: errors.postalCode.message,
                }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'flex items-center gap-3 pt-2',
        children: [
          _jsx('button', {
            type: 'submit',
            disabled: isPending,
            className:
              'inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
            children: isPending ? 'Saving...' : submitLabel,
          }),
          _jsx('button', {
            type: 'button',
            onClick: onCancel,
            className:
              'inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
            children: 'Cancel',
          }),
        ],
      }),
    ],
  });
}
function AddressCard({ address, onEdit, onDelete, onSetDefault, isDeleting, isSettingDefault }) {
  return _jsx('div', {
    className: 'rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6',
    children: _jsxs('div', {
      className: 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
      children: [
        _jsxs('div', {
          className: 'flex-1',
          children: [
            _jsxs('div', {
              className: 'flex items-center gap-2',
              children: [
                _jsx('h3', {
                  className: 'text-base font-semibold text-gray-900',
                  children: address.fullName,
                }),
                address.isDefault &&
                  _jsx('span', {
                    className:
                      'inline-flex rounded-full bg-brand-blue-100 px-2.5 py-0.5 text-xs font-medium text-brand-blue-700',
                    children: 'Default',
                  }),
              ],
            }),
            _jsx('p', { className: 'mt-1 text-sm text-gray-600', children: address.phone }),
            _jsxs('p', {
              className: 'mt-1 text-sm text-gray-600',
              children: [address.line1, address.line2 ? `, ${address.line2}` : ''],
            }),
            _jsxs('p', {
              className: 'text-sm text-gray-600',
              children: [address.city, ', ', address.state, ' ', address.postalCode],
            }),
            _jsx('p', { className: 'text-sm text-gray-600', children: address.country }),
          ],
        }),
        _jsxs('div', {
          className: 'flex flex-wrap items-center gap-2 sm:flex-col sm:items-end',
          children: [
            !address.isDefault &&
              _jsx('button', {
                type: 'button',
                onClick: () => {
                  onSetDefault(address.addressId);
                },
                disabled: isSettingDefault,
                'aria-label': `Set ${address.fullName} as default address`,
                className:
                  'inline-flex items-center rounded-md border border-brand-blue-200 px-3 py-1.5 text-xs font-medium text-brand-blue-700 transition-colors hover:bg-brand-blue-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50',
                children: 'Set Default',
              }),
            _jsx('button', {
              type: 'button',
              onClick: () => {
                onEdit(address);
              },
              'aria-label': `Edit address for ${address.fullName}`,
              className:
                'inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
              children: 'Edit',
            }),
            _jsx('button', {
              type: 'button',
              onClick: () => {
                onDelete(address.addressId);
              },
              disabled: isDeleting,
              'aria-label': `Delete address for ${address.fullName}`,
              className:
                'inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50',
              children: 'Delete',
            }),
          ],
        }),
      ],
    }),
  });
}
export function Component() {
  const { data: addresses, isLoading, isError, error } = useAddresses();
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();
  const [formMode, setFormMode] = useState('idle');
  const [editingAddress, setEditingAddress] = useState(null);
  function handleAddNew() {
    setFormMode('add');
    setEditingAddress(null);
  }
  function handleEdit(address) {
    setFormMode('edit');
    setEditingAddress(address);
  }
  function handleCancel() {
    setFormMode('idle');
    setEditingAddress(null);
  }
  function handleCreate(data) {
    createMutation.mutate(data, {
      onSuccess: () => {
        setFormMode('idle');
      },
    });
  }
  function handleUpdate(data) {
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
  function handleDelete(addressId) {
    deleteMutation.mutate(addressId);
  }
  function handleSetDefault(addressId) {
    setDefaultMutation.mutate(addressId);
  }
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
      _jsxs('main', {
        className: 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
        children: [
          _jsx('nav', {
            'aria-label': 'Breadcrumb',
            className: 'mb-6',
            children: _jsxs('ol', {
              className: 'flex items-center gap-2 text-sm text-gray-500',
              children: [
                _jsx('li', {
                  children: _jsx(Link, {
                    to: '/',
                    className: 'hover:text-brand-blue-600',
                    children: 'Home',
                  }),
                }),
                _jsx('li', { 'aria-hidden': 'true', children: '/' }),
                _jsx('li', { className: 'font-medium text-gray-900', children: 'My Addresses' }),
              ],
            }),
          }),
          _jsxs('div', {
            className: 'mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
            children: [
              _jsx('h1', {
                className: 'text-2xl font-bold text-gray-900 sm:text-3xl',
                children: 'My Addresses',
              }),
              formMode === 'idle' &&
                _jsxs('button', {
                  type: 'button',
                  onClick: handleAddNew,
                  className:
                    'inline-flex items-center gap-1.5 rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                  children: [
                    _jsx('svg', {
                      className: 'h-4 w-4',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      stroke: 'currentColor',
                      'aria-hidden': 'true',
                      children: _jsx('path', {
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        strokeWidth: 2,
                        d: 'M12 4v16m8-8H4',
                      }),
                    }),
                    'Add Address',
                  ],
                }),
            ],
          }),
          formMode === 'add' &&
            _jsxs('section', {
              className: 'mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6',
              'aria-labelledby': 'add-address-heading',
              children: [
                _jsx('h2', {
                  id: 'add-address-heading',
                  className: 'mb-4 text-lg font-semibold text-gray-900',
                  children: 'Add New Address',
                }),
                createMutation.isError &&
                  _jsx('div', {
                    className: 'mb-4 rounded-md bg-red-50 p-3',
                    children: _jsx('p', {
                      className: 'text-sm text-red-800',
                      children:
                        createMutation.error instanceof Error
                          ? createMutation.error.message
                          : 'Failed to create address. Please try again.',
                    }),
                  }),
                _jsx(AddressForm, {
                  onSubmit: handleCreate,
                  onCancel: handleCancel,
                  isPending: createMutation.isPending,
                  submitLabel: 'Add Address',
                }),
              ],
            }),
          formMode === 'edit' &&
            editingAddress &&
            _jsxs('section', {
              className: 'mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6',
              'aria-labelledby': 'edit-address-heading',
              children: [
                _jsx('h2', {
                  id: 'edit-address-heading',
                  className: 'mb-4 text-lg font-semibold text-gray-900',
                  children: 'Edit Address',
                }),
                updateMutation.isError &&
                  _jsx('div', {
                    className: 'mb-4 rounded-md bg-red-50 p-3',
                    children: _jsx('p', {
                      className: 'text-sm text-red-800',
                      children:
                        updateMutation.error instanceof Error
                          ? updateMutation.error.message
                          : 'Failed to update address. Please try again.',
                    }),
                  }),
                _jsx(AddressForm, {
                  onSubmit: handleUpdate,
                  onCancel: handleCancel,
                  isPending: updateMutation.isPending,
                  defaultValues: {
                    fullName: editingAddress.fullName,
                    phone: editingAddress.phone,
                    line1: editingAddress.line1,
                    line2: editingAddress.line2 ?? '',
                    city: editingAddress.city,
                    state: editingAddress.state,
                    postalCode: editingAddress.postalCode,
                    country: editingAddress.country,
                  },
                  submitLabel: 'Save Changes',
                }),
              ],
            }),
          isLoading && _jsx(AddressesSkeleton, {}),
          isError &&
            _jsxs('div', {
              className: 'rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load your addresses.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children: error instanceof Error ? error.message : 'Something went wrong.',
                }),
              ],
            }),
          addresses && addresses.length === 0 && formMode === 'idle' && _jsx(EmptyAddresses, {}),
          addresses &&
            addresses.length > 0 &&
            _jsx('ul', {
              className: 'space-y-4',
              'aria-label': 'Saved addresses',
              children: addresses.map((address) =>
                _jsx(
                  'li',
                  {
                    children: _jsx(AddressCard, {
                      address: address,
                      onEdit: handleEdit,
                      onDelete: handleDelete,
                      onSetDefault: handleSetDefault,
                      isDeleting: deleteMutation.isPending,
                      isSettingDefault: setDefaultMutation.isPending,
                    }),
                  },
                  address.addressId,
                ),
              ),
            }),
        ],
      }),
    ],
  });
}
export default Component;
