import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from './config';

const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'blipzo_access_token',
  REFRESH_TOKEN: 'blipzo_refresh_token',
} as const;

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, token);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, token);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
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
  failedQueue.forEach(({ resolve }) => {
    resolve(undefined);
  });
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
      await clearTokens();
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
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await clearTokens();
        return await Promise.reject(error);
      }

      const response = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data as { accessToken: string };
      await setAccessToken(accessToken);

      processQueueSuccess();
      return await apiClient.request(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      await clearTokens();
      const rejectError =
        refreshError instanceof Error ? refreshError : new Error(String(refreshError));
      return await Promise.reject(rejectError);
    } finally {
      isRefreshing = false;
    }
  },
);

export { apiClient };
