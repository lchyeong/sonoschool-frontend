import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ApiEnvelope } from '@/types/auth';
import type {
  QuestionCreatePayload,
  QuestionItem,
  QuestionScope,
  QuestionReplyCreatePayload,
  QuestionReplyItem,
} from '@/types/qna';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchGlobalQuestions = async (): Promise<QuestionItem[]> => {
  try {
    return await http.get<QuestionItem[]>('/api/v1/qna');
  } catch (error: unknown) {
    throw toApiError(error, '운영 Q&A를 불러오지 못했습니다.');
  }
};

export const createGlobalQuestion = async (
  payload: QuestionCreatePayload,
): Promise<QuestionItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<QuestionItem>>('/api/v1/qna', payload);
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '운영 Q&A 등록에 실패했습니다.');
  }
};

export const updateGlobalQuestion = async (
  questionId: number,
  payload: QuestionCreatePayload,
): Promise<QuestionItem> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<QuestionItem>>(
      `/api/v1/questions/${String(questionId)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '운영 Q&A를 수정하지 못했습니다.');
  }
};

export const deleteGlobalQuestion = async (questionId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/questions/${String(questionId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '운영 Q&A를 삭제하지 못했습니다.');
  }
};

export interface AdminQuestionFilters {
  answered?: boolean | null;
  keyword?: string | null;
  programId?: number | null;
  scope?: QuestionScope | 'ALL';
}

export const fetchAdminQuestions = async (
  filters?: AdminQuestionFilters,
): Promise<QuestionItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<QuestionItem[]>>('/api/v1/admin/qna', {
      params: {
        answered: filters?.answered ?? undefined,
        keyword: filters?.keyword?.trim() || undefined,
        programId: filters?.programId ?? undefined,
        scope: filters?.scope && filters.scope !== 'ALL' ? filters.scope : undefined,
      },
    });
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '관리자 Q&A 목록을 불러오지 못했습니다.');
  }
};

export const createAdminQuestionReply = async (
  questionId: number,
  payload: QuestionReplyCreatePayload,
): Promise<QuestionReplyItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<QuestionReplyItem>>(
      `/api/v1/admin/qna/${String(questionId)}/replies`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '관리자 답변 등록에 실패했습니다.');
  }
};

export const deleteAdminQuestionReply = async (replyId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/qna/replies/${String(replyId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '관리자 답변 삭제에 실패했습니다.');
  }
};
