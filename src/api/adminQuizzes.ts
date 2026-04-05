import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminQuiz, AdminQuizUpsertPayload } from '@/types/adminQuizzes';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

const normalizeDescription = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeMediaUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizePayload = (payload: AdminQuizUpsertPayload): AdminQuizUpsertPayload => {
  return {
    ...payload,
    description: normalizeDescription(payload.description),
    questions: payload.questions.map((question) => ({
      ...question,
      explanation: normalizeDescription(question.explanation),
      mediaAssetId: question.mediaAssetId ?? null,
      mediaType:
        (question.mediaAssetId ?? null) !== null || normalizeMediaUrl(question.mediaUrl)
          ? question.mediaType
          : null,
      mediaUrl:
        (question.mediaAssetId ?? null) !== null ? null : normalizeMediaUrl(question.mediaUrl),
      options: question.options.map((option) => ({
        ...option,
        mediaType: null,
        mediaUrl: null,
        optionText: option.optionText.trim(),
      })),
      questionText: question.questionText.trim(),
    })),
    title: payload.title.trim(),
  };
};

export const fetchAdminQuiz = async (lectureId: number): Promise<AdminQuiz | null> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminQuiz>>(
      `/api/v1/admin/lectures/${String(lectureId)}/quiz`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw toApiError(error, '문제를 불러오지 못했습니다.');
  }
};

export const createAdminQuiz = async (
  lectureId: number,
  payload: AdminQuizUpsertPayload,
): Promise<AdminQuiz> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminQuiz>>(
      `/api/v1/admin/lectures/${String(lectureId)}/quiz`,
      normalizePayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제를 등록하지 못했습니다.');
  }
};

export const updateAdminQuiz = async (
  quizId: number,
  payload: AdminQuizUpsertPayload,
): Promise<AdminQuiz> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminQuiz>>(
      `/api/v1/admin/quizzes/${String(quizId)}`,
      normalizePayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제를 수정하지 못했습니다.');
  }
};

export const deleteAdminQuiz = async (quizId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/quizzes/${String(quizId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '문제를 삭제하지 못했습니다.');
  }
};
