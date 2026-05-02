import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/auth';
import type {
  StudentProblem,
  StudentProblemAttemptReport,
  StudentProblemAttemptResult,
  StudentProblemSession,
  StudentProblemSessionSavePayload,
  StudentProblemSubmitPayload,
} from '@/types/studentProblems';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchStudentProblem = async (lectureId: number): Promise<StudentProblem | null> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<StudentProblem>>(
      `/api/v1/lectures/${String(lectureId)}/problem`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw toApiError(error, '문제 정보를 불러오지 못했습니다.');
  }
};

export const submitStudentProblem = async (
  problemId: number,
  payload: StudentProblemSubmitPayload,
): Promise<StudentProblemAttemptResult> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentProblemAttemptResult>>(
      `/api/v1/problems/${String(problemId)}/attempt`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제를 제출하지 못했습니다.');
  }
};

export const startStudentProblemSession = async (
  problemId: number,
): Promise<StudentProblemSession> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentProblemSession>>(
      `/api/v1/problems/${String(problemId)}/session/start`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제 풀이를 시작하지 못했습니다.');
  }
};

export const saveStudentProblemSession = async (
  problemId: number,
  payload: StudentProblemSessionSavePayload,
): Promise<StudentProblemSession> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<StudentProblemSession>>(
      `/api/v1/problems/${String(problemId)}/session`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제 풀이 상태를 저장하지 못했습니다.');
  }
};

export const fetchStudentProblemAttemptReport = async (
  attemptId: number,
): Promise<StudentProblemAttemptReport> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<StudentProblemAttemptReport>>(
      `/api/v1/problem-attempts/${String(attemptId)}/report`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제 결과 리포트를 불러오지 못했습니다.');
  }
};
