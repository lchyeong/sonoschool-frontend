import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ApiEnvelope } from '@/types/auth';
import type {
  QuestionCreatePayload,
  QuestionItem,
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

export const fetchProgramQuestions = async (programId: number): Promise<QuestionItem[]> => {
  try {
    return await http.get<QuestionItem[]>(`/api/v1/programs/${String(programId)}/questions`);
  } catch (error: unknown) {
    throw toApiError(error, '과정 Q&A를 불러오지 못했습니다.');
  }
};

export const createProgramQuestion = async (
  programId: number,
  payload: QuestionCreatePayload,
): Promise<QuestionItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<QuestionItem>>(
      `/api/v1/programs/${String(programId)}/questions`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '과정 Q&A 등록에 실패했습니다.');
  }
};

export const fetchAdminQuestions = async (): Promise<QuestionItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<QuestionItem[]>>('/api/v1/admin/qna');
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
