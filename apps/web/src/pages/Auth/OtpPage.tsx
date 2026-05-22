import {
  otpRequestSchema,
  otpVerifySchema,
  type OtpRequestSchemaInput,
  type OtpVerifySchemaInput,
  type AuthResponse,
} from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';

type OtpStep = 'request' | 'verify';

export function Component(): React.ReactElement {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [step, setStep] = useState<OtpStep>('request');
  const [phone, setPhone] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestForm = useForm<OtpRequestSchemaInput>({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: { phone: '' },
  });

  const verifyForm = useForm<OtpVerifySchemaInput>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { phone: '', otp: '' },
  });

  async function onRequestOtp(data: OtpRequestSchemaInput): Promise<void> {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/otp/request', data);
      setPhone(data.phone);
      verifyForm.setValue('phone', data.phone);
      setStep('verify');
    } catch (error: unknown) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message
      ) {
        setServerError(
          (error as { response: { data: { error: { message: string } } } }).response.data.error
            .message,
        );
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onVerifyOtp(data: OtpVerifySchemaInput): Promise<void> {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<AuthResponse>('/auth/otp/verify', data);
      const { accessToken, refreshToken, userId, role } = response.data;

      setAuth({ accessToken, refreshToken, userId, role });
      void navigate('/', { replace: true });
    } catch (error: unknown) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message
      ) {
        setServerError(
          (error as { response: { data: { error: { message: string } } } }).response.data.error
            .message,
        );
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToPhone(): void {
    setStep('request');
    setServerError(null);
    verifyForm.reset();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Phone OTP Login</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in using your phone number and a one-time password.
          </p>
        </div>

        {step === 'request' && (
          <form
            onSubmit={(e) => {
              void requestForm.handleSubmit(onRequestOtp)(e);
            }}
            className="mt-8 space-y-6"
            noValidate
          >
            {serverError && (
              <div
                className="rounded-md bg-red-50 p-4 text-sm text-red-700"
                role="alert"
                aria-live="polite"
              >
                {serverError}
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                {...requestForm.register('phone')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="+919876543210"
                aria-invalid={requestForm.formState.errors.phone ? 'true' : 'false'}
                aria-describedby={requestForm.formState.errors.phone ? 'phone-error' : undefined}
              />
              {requestForm.formState.errors.phone && (
                <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
                  {requestForm.formState.errors.phone.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter phone in E.164 format (e.g., +919876543210)
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form
            onSubmit={(e) => {
              void verifyForm.handleSubmit(onVerifyOtp)(e);
            }}
            className="mt-8 space-y-6"
            noValidate
          >
            {serverError && (
              <div
                className="rounded-md bg-red-50 p-4 text-sm text-red-700"
                role="alert"
                aria-live="polite"
              >
                {serverError}
              </div>
            )}

            <div
              className="rounded-md bg-blue-50 p-4 text-sm text-blue-700"
              role="status"
              aria-live="polite"
            >
              OTP sent to <strong>{phone}</strong>. It expires in 10 minutes.
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                One-Time Password
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                {...verifyForm.register('otp')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="000000"
                aria-invalid={verifyForm.formState.errors.otp ? 'true' : 'false'}
                aria-describedby={verifyForm.formState.errors.otp ? 'otp-error' : undefined}
              />
              {verifyForm.formState.errors.otp && (
                <p id="otp-error" className="mt-1 text-sm text-red-600" role="alert">
                  {verifyForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={handleBackToPhone}
              className="flex w-full justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
            >
              ← Use a different phone number
            </button>
          </form>
        )}

        <div className="text-center text-sm text-gray-600">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in with email instead
          </Link>
          {' · '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Component;
