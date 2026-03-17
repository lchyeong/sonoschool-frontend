import axios from 'axios';

import { ApiError } from '@/api/errors';

const isFallbackStatus = (status: number | null): boolean => {
  return status === null || status === 404 || status >= 500;
};

export const shouldUseMockFallback = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return isFallbackStatus(error.status);
  }

  if (axios.isAxiosError(error)) {
    return isFallbackStatus(error.response?.status ?? null);
  }

  if (error instanceof Error) {
    return true;
  }

  return true;
};
