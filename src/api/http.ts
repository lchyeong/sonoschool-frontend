import type { AxiosRequestConfig } from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';

export const http = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  },
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await axiosInstance.post<T>(url, body, config);
      return response.data;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  },
};
