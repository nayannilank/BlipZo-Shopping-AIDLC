import { loginSchema } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
export function Component() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successMessage = location.state?.message;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  async function onSubmit(data) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/login', data);
      const { accessToken, refreshToken, userId, role } = response.data;
      setAuth({ accessToken, refreshToken, userId, role });
      void navigate('/', { replace: true });
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
  return _jsx('div', {
    className:
      'flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8',
    children: _jsxs('div', {
      className: 'w-full max-w-md space-y-8',
      children: [
        _jsxs('div', {
          className: 'text-center',
          children: [
            _jsx('h1', {
              className: 'text-3xl font-bold tracking-tight text-gray-900',
              children: 'Sign in to BlipZo',
            }),
            _jsxs('p', {
              className: 'mt-2 text-sm text-gray-600',
              children: [
                "Don't have an account?",
                ' ',
                _jsx(Link, {
                  to: '/register',
                  className: 'font-medium text-blue-600 hover:text-blue-500',
                  children: 'Create one',
                }),
              ],
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
            successMessage &&
              _jsx('div', {
                className: 'rounded-md bg-green-50 p-4 text-sm text-green-700',
                role: 'status',
                'aria-live': 'polite',
                children: successMessage,
              }),
            serverError &&
              _jsx('div', {
                className: 'rounded-md bg-red-50 p-4 text-sm text-red-700',
                role: 'alert',
                'aria-live': 'polite',
                children: serverError,
              }),
            _jsxs('div', {
              className: 'space-y-4',
              children: [
                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      htmlFor: 'email',
                      className: 'block text-sm font-medium text-gray-700',
                      children: 'Email address',
                    }),
                    _jsx('input', {
                      id: 'email',
                      type: 'email',
                      autoComplete: 'email',
                      ...register('email'),
                      className:
                        'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm',
                      placeholder: 'you@example.com',
                      'aria-invalid': errors.email ? 'true' : 'false',
                      'aria-describedby': errors.email ? 'email-error' : undefined,
                    }),
                    errors.email &&
                      _jsx('p', {
                        id: 'email-error',
                        className: 'mt-1 text-sm text-red-600',
                        role: 'alert',
                        children: errors.email.message,
                      }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      htmlFor: 'password',
                      className: 'block text-sm font-medium text-gray-700',
                      children: 'Password',
                    }),
                    _jsx('input', {
                      id: 'password',
                      type: 'password',
                      autoComplete: 'current-password',
                      ...register('password'),
                      className:
                        'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm',
                      placeholder: 'Enter your password',
                      'aria-invalid': errors.password ? 'true' : 'false',
                      'aria-describedby': errors.password ? 'password-error' : undefined,
                    }),
                    errors.password &&
                      _jsx('p', {
                        id: 'password-error',
                        className: 'mt-1 text-sm text-red-600',
                        role: 'alert',
                        children: errors.password.message,
                      }),
                  ],
                }),
              ],
            }),
            _jsx('button', {
              type: 'submit',
              disabled: isSubmitting,
              className:
                'flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
              children: isSubmitting ? 'Signing in...' : 'Sign in',
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
