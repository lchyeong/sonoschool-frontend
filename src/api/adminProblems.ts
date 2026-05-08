import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminProblem, AdminProblemUpsertPayload } from '@/types/adminProblems';
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

const normalizePayload = (payload: AdminProblemUpsertPayload): AdminProblemUpsertPayload => {
  return {
    ...payload,
    questions: payload.questions.map((question) => ({
      ...question,
      problemAreaId: question.problemAreaId,
      explanation: normalizeDescription(question.explanation),
      mediaAssetId: question.mediaAssetId ?? null,
      mediaVideoId: question.mediaVideoId ?? null,
      mediaType:
        (question.mediaAssetId ?? null) !== null ||
        (question.mediaVideoId ?? null) !== null ||
        normalizeMediaUrl(question.mediaUrl)
          ? question.mediaType
          : null,
      mediaUrl:
        (question.mediaAssetId ?? null) !== null || (question.mediaVideoId ?? null) !== null
          ? null
          : normalizeMediaUrl(question.mediaUrl),
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

export const fetchAdminProblem = async (lectureId: number): Promise<AdminProblem | null> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProblem>>(
      `/api/v1/admin/lectures/${String(lectureId)}/problem`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw toApiError(error, '문제를 불러오지 못했습니다.');
  }
};

export const createAdminProblem = async (
  lectureId: number,
  payload: AdminProblemUpsertPayload,
): Promise<AdminProblem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProblem>>(
      `/api/v1/admin/lectures/${String(lectureId)}/problem`,
      normalizePayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제를 등록하지 못했습니다.');
  }
};

export const updateAdminProblem = async (
  problemId: number,
  payload: AdminProblemUpsertPayload,
): Promise<AdminProblem> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminProblem>>(
      `/api/v1/admin/problems/${String(problemId)}`,
      normalizePayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제를 수정하지 못했습니다.');
  }
};

export const deleteAdminProblem = async (problemId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/problems/${String(problemId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '문제를 삭제하지 못했습니다.');
  }
};
