import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminQuizLectureSummary } from '@/types/adminQuizSummaries';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

export const fetchAdminQuizLectureSummaries = async (
  programId: number,
): Promise<AdminQuizLectureSummary[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminQuizLectureSummary[]>>(
      `/api/v1/admin/programs/${String(programId)}/quiz-summaries`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '퀴즈 현황을 불러오지 못했습니다.');
  }
};
