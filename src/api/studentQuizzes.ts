import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/auth';
import type {
  StudentQuiz,
  StudentQuizAttemptResult,
  StudentQuizSubmitPayload,
} from '@/types/studentQuizzes';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchStudentQuiz = async (lectureId: number): Promise<StudentQuiz | null> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<StudentQuiz>>(
      `/api/v1/lectures/${String(lectureId)}/quiz`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw toApiError(error, '퀴즈 정보를 불러오지 못했습니다.');
  }
};

export const submitStudentQuiz = async (
  quizId: number,
  payload: StudentQuizSubmitPayload,
): Promise<StudentQuizAttemptResult> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentQuizAttemptResult>>(
      `/api/v1/quizzes/${String(quizId)}/attempt`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '퀴즈를 제출하지 못했습니다.');
  }
};
