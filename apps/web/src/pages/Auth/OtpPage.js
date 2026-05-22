import { otpRequestSchema, otpVerifySchema } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
export function Component() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [step, setStep] = useState('request');
  const [phone, setPhone] = useState('');
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestForm = useForm({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: { phone: '' },
  });
  const verifyForm = useForm({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { phone: '', otp: '' },
  });
  async function onRequestOtp(data) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/otp/request', data);
      setPhone(data.phone);
      verifyForm.setValue('phone', data.phone);
      setStep('verify');
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
  async function onVerifyOtp(data) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/otp/verify', data);
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
  function handleBackToPhone() {
    setStep('request');
    setServerError(null);
    verifyForm.reset();
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
              children: 'Phone OTP Login',
            }),
            _jsx('p', {
              className: 'mt-2 text-sm text-gray-600',
              children: 'Sign in using your phone number and a one-time password.',
            }),
          ],
        }),
        step === 'request' &&
          _jsxs('form', {
            onSubmit: (e) => {
              void requestForm.handleSubmit(onRequestOtp)(e);
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
              _jsxs('div', {
                children: [
                  _jsx('label', {
                    htmlFor: 'phone',
                    className: 'block text-sm font-medium text-gray-700',
                    children: 'Phone number',
                  }),
                  _jsx('input', {
                    id: 'phone',
                    type: 'tel',
                    autoComplete: 'tel',
                    ...requestForm.register('phone'),
                    className:
                      'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm',
                    placeholder: '+919876543210',
                    'aria-invalid': requestForm.formState.errors.phone ? 'true' : 'false',
                    'aria-describedby': requestForm.formState.errors.phone
                      ? 'phone-error'
                      : undefined,
                  }),
                  requestForm.formState.errors.phone &&
                    _jsx('p', {
                      id: 'phone-error',
                      className: 'mt-1 text-sm text-red-600',
                      role: 'alert',
                      children: requestForm.formState.errors.phone.message,
                    }),
                  _jsx('p', {
                    className: 'mt-1 text-xs text-gray-500',
                    children: 'Enter phone in E.164 format (e.g., +919876543210)',
                  }),
                ],
              }),
              _jsx('button', {
                type: 'submit',
                disabled: isSubmitting,
                className:
                  'flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
                children: isSubmitting ? 'Sending OTP...' : 'Send OTP',
              }),
            ],
          }),
        step === 'verify' &&
          _jsxs('form', {
            onSubmit: (e) => {
              void verifyForm.handleSubmit(onVerifyOtp)(e);
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
              _jsxs('div', {
                className: 'rounded-md bg-blue-50 p-4 text-sm text-blue-700',
                role: 'status',
                'aria-live': 'polite',
                children: [
                  'OTP sent to ',
                  _jsx('strong', { children: phone }),
                  '. It expires in 10 minutes.',
                ],
              }),
              _jsxs('div', {
                children: [
                  _jsx('label', {
                    htmlFor: 'otp',
                    className: 'block text-sm font-medium text-gray-700',
                    children: 'One-Time Password',
                  }),
                  _jsx('input', {
                    id: 'otp',
                    type: 'text',
                    inputMode: 'numeric',
                    maxLength: 6,
                    autoComplete: 'one-time-code',
                    ...verifyForm.register('otp'),
                    className:
                      'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm',
                    placeholder: '000000',
                    'aria-invalid': verifyForm.formState.errors.otp ? 'true' : 'false',
                    'aria-describedby': verifyForm.formState.errors.otp ? 'otp-error' : undefined,
                  }),
                  verifyForm.formState.errors.otp &&
                    _jsx('p', {
                      id: 'otp-error',
                      className: 'mt-1 text-sm text-red-600',
                      role: 'alert',
                      children: verifyForm.formState.errors.otp.message,
                    }),
                ],
              }),
              _jsx('button', {
                type: 'submit',
                disabled: isSubmitting,
                className:
                  'flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
                children: isSubmitting ? 'Verifying...' : 'Verify OTP',
              }),
              _jsx('button', {
                type: 'button',
                onClick: handleBackToPhone,
                className:
                  'flex w-full justify-center text-sm font-medium text-gray-600 hover:text-gray-500',
                children: '\u2190 Use a different phone number',
              }),
            ],
          }),
        _jsxs('div', {
          className: 'text-center text-sm text-gray-600',
          children: [
            _jsx(Link, {
              to: '/login',
              className: 'font-medium text-blue-600 hover:text-blue-500',
              children: 'Sign in with email instead',
            }),
            ' · ',
            _jsx(Link, {
              to: '/register',
              className: 'font-medium text-blue-600 hover:text-blue-500',
              children: 'Create an account',
            }),
          ],
        }),
      ],
    }),
  });
}
export default Component;
