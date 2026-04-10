import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/auth';
import type { AdminProblemAttempt } from '@/types/adminProblemAttempts';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminProblemAttempts = async (
  problemId: number,
): Promise<AdminProblemAttempt[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProblemAttempt[]>>(
      `/api/v1/admin/problems/${String(problemId)}/attempts`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }

    throw toApiError(error, '문제 응시 내역을 불러오지 못했습니다.');
  }
};
