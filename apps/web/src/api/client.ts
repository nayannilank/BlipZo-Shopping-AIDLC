import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../stores/auth.store';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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
