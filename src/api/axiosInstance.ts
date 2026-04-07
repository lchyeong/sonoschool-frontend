import axios, { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import { toApiError } from '@/api/errors';
import { env } from '@/config/env';
import { routePaths } from '@/routes/routeRegistry';
import {
  clearAdminSession,
  getAdminAccessToken,
  isAdminAuthenticated,
} from '@/stores/useAdminAuthStore';
import {
  clearStudentSession,
  getStudentAccessToken,
  isStudentAuthenticated,
  setStudentSession,
} from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { ApiEnvelope, StudentSession } from '@/types/auth';
import { getOrCreateAuthDeviceId } from '@/utils/authDeviceId';

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

const isAdminApiRequest = (url?: string): boolean => {
  return Boolean(url?.includes('/api/v1/admin/'));
};

const shouldSkipRefresh = (url?: string): boolean => {
  if (!url) return false;

  return (
    url.includes('/api/v1/auth/login') ||
    url.includes('/api/v1/auth/register') ||
    url.includes('/api/v1/auth/refresh') ||
    url.includes('/api/v1/auth/logout') ||
    url.includes('/api/v1/admin/')
  );
};

const redirectToLogin = (targetPath: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === targetPath) {
    return;
  }

  window.location.replace(targetPath);
};

const showSessionEndedToast = (error: unknown) => {
  const apiError = toApiError(error, '로그인 정보가 확인되지 않아 다시 로그인이 필요합니다.');
  useToastStore.getState().showToast({
    message: apiError.userMessage,
    variant: 'error',
  });
};

axiosInstance.interceptors.request.use((config) => {
  const accessToken = isAdminApiRequest(config.url)
    ? getAdminAccessToken()
    : getStudentAccessToken();

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
      isAdminApiRequest(requestConfig.url) &&
      isAdminAuthenticated()
    ) {
      clearAdminSession();
      redirectToLogin(routePaths.adminLogin);
    }

    if (
      statusCode === 401 &&
      requestConfig &&
      requestConfig._retry !== true &&
      !shouldSkipRefresh(requestConfig.url) &&
      isStudentAuthenticated()
    ) {
      requestConfig._retry = true;

      try {
        const refreshResponse = await refreshClient.post<ApiEnvelope<StudentSession>>(
          '/api/v1/auth/refresh',
          undefined,
          {
            headers: {
              'X-Auth-Device-Id': getOrCreateAuthDeviceId(),
            },
          },
        );
        const nextSession = refreshResponse.data.data;
        setStudentSession(nextSession);
        requestConfig.headers = AxiosHeaders.from(requestConfig.headers);
        requestConfig.headers.set('Authorization', `Bearer ${nextSession.accessToken}`);
        return await axiosInstance(requestConfig);
      } catch (refreshError: unknown) {
        clearStudentSession();
        showSessionEndedToast(refreshError);
        redirectToLogin(routePaths.login);
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
