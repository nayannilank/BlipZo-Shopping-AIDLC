import { registerSchema } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import { apiClient } from '../../api/client';

export function Component() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Buyer');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      role: 'Buyer',
      dateOfBirth: '',
      gender: undefined,
    },
  });

  function handleRoleChange(role) {
    setSelectedRole(role);
    setValue('role', role);
    // Reset role-specific fields when switching
    if (role === 'Buyer') {
      setValue('companyName', undefined);
      setValue('companyUrl', undefined);
      setValue('companyAddress', undefined);
      setValue('tanPanNumber', undefined);
      setValue('gstNumber', undefined);
      setValue('inceptionDate', undefined);
    } else {
      setValue('dateOfBirth', undefined);
      setValue('gender', undefined);
    }
  }

  async function onSubmit(data) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/register', data);
      void navigate('/login', { state: { message: 'Registration successful. Please log in.' } });
    } catch (error) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'response' in error &&
        error.response?.data?.error?.message
      ) {
        setServerError(error.response.data.error.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderField(id, label, type, placeholder, options = {}) {
    const { autoComplete } = options;
    return _jsxs('div', {
      children: [
        _jsx('label', {
          htmlFor: id,
          className: 'block text-sm font-medium text-gray-700',
          children: label,
        }),
        _jsx('input', {
          id,
          type: type || 'text',
          autoComplete: autoComplete || 'off',
          ...register(id),
          className:
            'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm',
          placeholder,
          'aria-invalid': errors[id] ? 'true' : 'false',
          'aria-describedby': errors[id] ? `${id}-error` : undefined,
        }),
        errors[id] &&
          _jsx('p', {
            id: `${id}-error`,
            className: 'mt-1 text-sm text-red-600',
            role: 'alert',
            children: errors[id].message,
          }),
      ],
    });
  }

  function renderSelectField(id, label, optionsList) {
    return _jsxs('div', {
      children: [
        _jsx('label', {
          htmlFor: id,
          className: 'block text-sm font-medium text-gray-700',
          children: label,
        }),
        _jsxs('select', {
          id,
          ...register(id),
          className:
            'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm',
          'aria-invalid': errors[id] ? 'true' : 'false',
          'aria-describedby': errors[id] ? `${id}-error` : undefined,
          children: [
            _jsx('option', { value: '', children: 'Select...' }),
            ...optionsList.map(({ value, label: optLabel }) =>
              _jsx('option', { value, children: optLabel }, value),
            ),
          ],
        }),
        errors[id] &&
          _jsx('p', {
            id: `${id}-error`,
            className: 'mt-1 text-sm text-red-600',
            role: 'alert',
            children: errors[id].message,
          }),
      ],
    });
  }

  return _jsx('div', {
    className:
      'flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8',
    children: _jsxs('div', {
      className: 'w-full max-w-2xl space-y-8',
      children: [
        _jsxs('div', {
          className: 'text-center',
          children: [
            _jsx('h1', {
              className: 'text-3xl font-bold tracking-tight text-gray-900',
              children: 'Create your account',
            }),
            _jsxs('p', {
              className: 'mt-2 text-sm text-gray-600',
              children: [
                'Already have an account?',
                ' ',
                _jsx(Link, {
                  to: '/login',
                  className: 'font-medium text-blue-600 hover:text-blue-500',
                  children: 'Sign in',
                }),
              ],
            }),
          ],
        }),
        // Role Selector Tabs
        _jsxs('div', {
          className: 'flex rounded-lg border border-gray-300 overflow-hidden',
          role: 'tablist',
          'aria-label': 'Account type',
          children: [
            _jsx('button', {
              type: 'button',
              role: 'tab',
              'aria-selected': selectedRole === 'Buyer' ? 'true' : 'false',
              className: `flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                selectedRole === 'Buyer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`,
              onClick: () => handleRoleChange('Buyer'),
              children: 'Buyer',
            }),
            _jsx('button', {
              type: 'button',
              role: 'tab',
              'aria-selected': selectedRole === 'Seller' ? 'true' : 'false',
              className: `flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                selectedRole === 'Seller'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`,
              onClick: () => handleRoleChange('Seller'),
              children: 'Seller',
            }),
          ],
        }),
        _jsxs('form', {
          onSubmit: (e) => {
            void handleSubmit(onSubmit)(e);
          },
          className: 'mt-8 space-y-6',
          noValidate: true,
          children: [
            serverError &&
              _jsx('div', {
                className: 'rounded-md bg-red-50 p-4 text-sm text-red-700',
                role: 'alert',
                'aria-live': 'polite',
                children: serverError,
              }),
            // Common fields in two-column grid
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
              children: [
                renderField('firstName', 'First Name', 'text', 'John', {
                  autoComplete: 'given-name',
                }),
                renderField('lastName', 'Last Name', 'text', 'Doe', {
                  autoComplete: 'family-name',
                }),
                renderField('username', 'Username', 'text', 'johndoe123', {
                  autoComplete: 'username',
                }),
                renderField('email', 'Email', 'email', 'you@example.com', {
                  autoComplete: 'email',
                }),
                renderField('phone', 'Phone Number', 'tel', '+919876543210', {
                  autoComplete: 'tel',
                }),
                renderField(
                  'password',
                  'Password',
                  'password',
                  'Min 8 chars, uppercase, lowercase, digit',
                  {
                    autoComplete: 'new-password',
                  },
                ),
              ],
            }),
            // Role-specific fields
            selectedRole === 'Buyer' &&
              _jsxs('div', {
                className: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
                children: [
                  renderField('dateOfBirth', 'Date of Birth', 'date', ''),
                  renderSelectField('gender', 'Gender', [
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                    { value: 'PreferNotToSay', label: 'Prefer not to say' },
                  ]),
                ],
              }),
            selectedRole === 'Seller' &&
              _jsxs('div', {
                className: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
                children: [
                  renderField('companyName', 'Company Name', 'text', 'Acme Corp'),
                  renderField('companyUrl', 'Company URL', 'url', 'https://example.com'),
                  _jsx('div', {
                    className: 'sm:col-span-2',
                    children: renderField(
                      'companyAddress',
                      'Company Address',
                      'text',
                      '123 Business St, City, Country',
                    ),
                  }),
                  renderField('tanPanNumber', 'TAN/PAN Number', 'text', 'ABCDE1234F'),
                  renderField('gstNumber', 'GST Number', 'text', '22ABCDE1234F1Z5'),
                  renderField('inceptionDate', 'Inception Date', 'date', ''),
                ],
              }),
            // Hidden role field
            _jsx('input', { type: 'hidden', ...register('role') }),
            _jsx('button', {
              type: 'submit',
              disabled: isSubmitting,
              className:
                'flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
              children: isSubmitting ? 'Creating account...' : 'Create account',
            }),
          ],
        }),
        _jsxs('p', {
          className: 'text-center text-sm text-gray-600',
          children: [
            'Or',
            ' ',
            _jsx(Link, {
              to: '/otp',
              className: 'font-medium text-blue-600 hover:text-blue-500',
              children: 'sign in with phone OTP',
            }),
          ],
        }),
      ],
    }),
  });
}
export default Component;
