import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminProblemMediaUploadTarget,
  AdminProblemMediaUploadTargetRequest,
} from '@/types/adminProblemMedia';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

export const createAdminProblemMediaUploadTarget = async (
  payload: AdminProblemMediaUploadTargetRequest,
): Promise<AdminProblemMediaUploadTarget> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProblemMediaUploadTarget>>(
      '/api/v1/admin/problem-media/upload-targets',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제 미디어 업로드 준비에 실패했습니다.');
  }
};

export const uploadAdminProblemMediaFile = async (uploadUrl: string, file: File): Promise<void> => {
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
