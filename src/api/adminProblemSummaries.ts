import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminProblemLectureSummary } from '@/types/adminProblemSummaries';
import type { ApiEnvelope } from '@/types/auth';

interface AdminProblemLectureSummaryApiResponse {
  attemptCount: number;
  averageScore: number | null;
  hasProblem: boolean;
  lastSubmittedAt: string | null;
  lastUpdatedAt: string | null;
  lectureId: number;
  questionCount: number;
  problemId: number | null;
}

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

export const fetchAdminProblemLectureSummaries = async (
  programId: number,
): Promise<AdminProblemLectureSummary[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProblemLectureSummaryApiResponse[]>>(
      `/api/v1/admin/programs/${String(programId)}/problem-summaries`,
    );
    return unwrapApiEnvelope(response.data).map((summary) => ({
      attemptCount: summary.attemptCount,
      averageScore: summary.averageScore,
      hasProblem: summary.hasProblem,
      lastSubmittedAt: summary.lastSubmittedAt,
      lastUpdatedAt: summary.lastUpdatedAt,
      lectureId: summary.lectureId,
      problemId: summary.problemId,
      questionCount: summary.questionCount,
    }));
  } catch (error: unknown) {
    throw toApiError(error, '문제 현황을 불러오지 못했습니다.');
  }
};
