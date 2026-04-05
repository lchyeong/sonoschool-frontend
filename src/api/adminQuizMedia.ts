import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminQuizMediaUploadTarget,
  AdminQuizMediaUploadTargetRequest,
} from '@/types/adminQuizMedia';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

export const createAdminQuizMediaUploadTarget = async (
  payload: AdminQuizMediaUploadTargetRequest,
): Promise<AdminQuizMediaUploadTarget> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminQuizMediaUploadTarget>>(
      '/api/v1/admin/quiz-media/upload-targets',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제 미디어 업로드 준비에 실패했습니다.');
  }
};

export const uploadAdminQuizMediaFile = async (uploadUrl: string, file: File): Promise<void> => {
  const response = await fetch(uploadUrl, {
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`문제 미디어 업로드에 실패했습니다. (${String(response.status)})`);
  }
};
