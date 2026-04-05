import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminQuizAttempt } from '@/types/adminQuizAttempts';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminQuizAttempts = async (quizId: number): Promise<AdminQuizAttempt[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminQuizAttempt[]>>(
      `/api/v1/admin/quizzes/${String(quizId)}/attempts`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }

    throw toApiError(error, '문제 응시 내역을 불러오지 못했습니다.');
  }
};
