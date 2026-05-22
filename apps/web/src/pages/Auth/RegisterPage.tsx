import { registerSchema, type RegisterSchemaInput } from '@blipzo/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import { apiClient } from '../../api/client';

export function Component(): React.ReactElement {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchemaInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'Buyer',
    },
  });

  async function onSubmit(data: RegisterSchemaInput): Promise<void> {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/register', data);
      void navigate('/login', { state: { message: 'Registration successful. Please log in.' } });
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
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
                autoComplete="new-password"
                {...register('password')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="Min 8 chars, uppercase, lowercase, digit"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">Role</legend>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Buyer"
                    {...register('role')}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Buyer</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Seller"
                    {...register('role')}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Seller</span>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.role.message}
                </p>
              )}
            </fieldset>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
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
