import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminProblemAttempt } from '@/types/adminProblemAttempts';
import type { ApiEnvelope } from '@/types/auth';
import type { StudentProblemAttemptReport } from '@/types/studentProblems';

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

export const fetchAdminProblemAttemptReport = async (
  attemptId: number,
): Promise<StudentProblemAttemptReport> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<StudentProblemAttemptReport>>(
      `/api/v1/admin/problem-attempts/${String(attemptId)}/report`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제 결과 리포트를 불러오지 못했습니다.');
  }
};
