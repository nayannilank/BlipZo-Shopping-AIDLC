import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../stores/auth.store';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

/**
 * Public routes that do NOT require an Authorization header.
 * Sending an expired token on these routes causes API Gateway to return 401
 * even though the route has AuthorizationType.NONE configured, because
 * API Gateway still validates the token when the Authorization header is present.
 */
const PUBLIC_ROUTES: Array<{ method?: string; prefix: string }> = [
  { prefix: '/catalogue/' },
  { prefix: '/auth/' },
  { method: 'GET', prefix: '/products/' },
];

function isPublicRoute(method: string | undefined, url: string | undefined): boolean {
  if (!url) return false;
  const normalizedMethod = (method ?? 'GET').toUpperCase();
  return PUBLIC_ROUTES.some(
    (route) => url.startsWith(route.prefix) && (!route.method || route.method === normalizedMethod),
  );
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Skip auth header for public routes to avoid 401 from expired/stale tokens
  if (isPublicRoute(config.method, config.url)) {
    return config;
  }

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}> = [];

function processQueue(error: unknown): void {
  const rejectError = error instanceof Error ? error : new Error(String(error));
  failedQueue.forEach(({ reject }) => {
    reject(rejectError);
  });
  failedQueue = [];
}

function processQueueSuccess(): void {
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't attempt token refresh for public routes — they shouldn't need auth
    if (isPublicRoute(originalRequest.method, originalRequest.url)) {
      return Promise.reject(error);
    }

    // Avoid infinite loop on refresh endpoint itself
    if (originalRequest.url?.includes('/auth/token/refresh')) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        return apiClient.request(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return await Promise.reject(error);
      }

      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data as { accessToken: string };
      useAuthStore.getState().setAccessToken(accessToken);

      processQueueSuccess();
      return await apiClient.request(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      useAuthStore.getState().logout();
      const rejectError =
        refreshError instanceof Error ? refreshError : new Error(String(refreshError));
      return await Promise.reject(rejectError);
    } finally {
      isRefreshing = false;
    }
  },
);

export { apiClient };
