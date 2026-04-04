import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminPopupMediaUploadTarget,
  AdminPopupMediaUploadTargetRequest,
} from '@/types/adminPopupMedia';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

export const createAdminPopupMediaUploadTarget = async (
  payload: AdminPopupMediaUploadTargetRequest,
): Promise<AdminPopupMediaUploadTarget> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminPopupMediaUploadTarget>>(
      '/api/v1/admin/popups/upload-targets',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '팝업 이미지 업로드 준비에 실패했습니다.');
  }
};

export const uploadAdminPopupMediaFile = async (uploadUrl: string, file: File): Promise<void> => {
  const response = await fetch(uploadUrl, {
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`팝업 이미지 업로드에 실패했습니다. (${String(response.status)})`);
  }
};
