import axios from 'axios';

import { env } from '@/config/env';

const baseURL = env.apiBaseUrl;

const axiosInstance = axios.create({
  ...(baseURL ? { baseURL } : {}),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError =
      error instanceof Error ? error : new Error('Request failed', { cause: error });
    return Promise.reject(normalizedError);
  },
);

export default axiosInstance;
