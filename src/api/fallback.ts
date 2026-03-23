import axios from 'axios';

import { env } from '@/config/env';

export const shouldUseMockFallback = (error: unknown): boolean => {
  if (env.VITE_ENABLE_MOCK) {
    return true;
  }

  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status ?? null;

  return status === null || status === 404 || status === 501 || status === 502 || status === 503;
};
