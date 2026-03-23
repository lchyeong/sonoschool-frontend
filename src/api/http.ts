import type { AxiosRequestConfig } from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';

interface ApiResponseEnvelope<T> {
  data: T;
  timestamp: string;
}

const isApiResponseEnvelope = (value: unknown): value is ApiResponseEnvelope<unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return 'data' in record && typeof record['timestamp'] === 'string';
};

const unwrapApiResponse = (value: unknown): unknown => {
  if (isApiResponseEnvelope(value)) {
    return value.data;
  }

  return value;
};

export const http = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await axiosInstance.get<unknown>(url, config);
      return unwrapApiResponse(response.data) as T;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  },
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await axiosInstance.post<unknown>(url, body, config);
      return unwrapApiResponse(response.data) as T;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  },
};
