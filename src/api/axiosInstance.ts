import axios, { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import {
  clearStudentSession,
  getStudentAccessToken,
  isStudentAuthenticated,
  setStudentSession,
} from '@/stores/useAuthStore';
import type { ApiEnvelope, StudentSession } from '@/types/auth';

const baseURL = env.apiBaseUrl;

const axiosInstance = axios.create({
  ...(baseURL ? { baseURL } : {}),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  ...(baseURL ? { baseURL } : {}),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const shouldSkipRefresh = (url?: string): boolean => {
  if (!url) return false;

  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout') ||
    url.includes('/api/v1/admin/')
  );
};

axiosInstance.interceptors.request.use((config) => {
  const accessToken = getStudentAccessToken();

  if (accessToken) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      const normalizedError =
        error instanceof Error ? error : new Error('Request failed', { cause: error });
      return Promise.reject(normalizedError);
    }

    const requestConfig = error.config as RetriableRequestConfig | undefined;
    const statusCode = error.response?.status ?? null;

    if (
      statusCode === 401 &&
      requestConfig &&
      requestConfig._retry !== true &&
      !shouldSkipRefresh(requestConfig.url) &&
      isStudentAuthenticated()
    ) {
      requestConfig._retry = true;

      try {
        const refreshResponse =
          await refreshClient.post<ApiEnvelope<StudentSession>>('/api/auth/refresh');
        const nextSession = refreshResponse.data.data;
        setStudentSession(nextSession);
        requestConfig.headers = AxiosHeaders.from(requestConfig.headers);
        requestConfig.headers.set('Authorization', `Bearer ${nextSession.accessToken}`);
        return await axiosInstance(requestConfig);
      } catch (refreshError: unknown) {
        clearStudentSession();
        const normalizedRefreshError =
          refreshError instanceof Error
            ? refreshError
            : new Error('Request failed', { cause: refreshError });
        return Promise.reject(normalizedRefreshError);
      }
    }

    const normalizedError =
      error instanceof Error ? error : new Error('Request failed', { cause: error });
    return Promise.reject(normalizedError);
  },
);

export default axiosInstance;
