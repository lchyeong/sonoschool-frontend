import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminResourceUploadTarget,
  AdminResourceUploadTargetRequest,
} from '@/types/adminResourceMedia';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

export const createAdminResourceUploadTarget = async (
  payload: AdminResourceUploadTargetRequest,
): Promise<AdminResourceUploadTarget> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminResourceUploadTarget>>(
      '/api/v1/admin/resources/upload-targets',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '자료 업로드 준비에 실패했습니다.');
  }
};

export const uploadAdminResourceFile = async (uploadUrl: string, file: File): Promise<void> => {
  const response = await fetch(uploadUrl, {
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`자료 업로드에 실패했습니다. (${String(response.status)})`);
  }
};
