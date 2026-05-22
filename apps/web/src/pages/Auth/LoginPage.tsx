import { loginSchema, type LoginSchemaInput, type AuthResponse } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';

export function Component(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successMessage = (location.state as { message?: string } | null)?.message;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginSchemaInput): Promise<void> {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', data);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sign in to BlipZo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Create one
            </Link>
          </p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="mt-8 space-y-6"
          noValidate
        >
          {successMessage && (
            <div
              className="rounded-md bg-green-50 p-4 text-sm text-green-700"
              role="status"
              aria-live="polite"
            >
              {successMessage}
            </div>
          )}

          {serverError && (
            <div
              className="rounded-md bg-red-50 p-4 text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              {serverError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="you@example.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter your password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/otp" className="font-medium text-blue-600 hover:text-blue-500">
            sign in with phone OTP
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Component;
