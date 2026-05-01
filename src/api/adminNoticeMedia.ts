import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminNoticeMediaUploadTarget,
  AdminNoticeMediaUploadTargetRequest,
} from '@/types/adminNoticeMedia';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

export const createAdminNoticeMediaUploadTarget = async (
  payload: AdminNoticeMediaUploadTargetRequest,
): Promise<AdminNoticeMediaUploadTarget> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminNoticeMediaUploadTarget>>(
      '/api/v1/admin/notice-media/upload-targets',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '공지 이미지 업로드 준비에 실패했습니다.');
  }
};

export const createAdminNoticeAttachmentUploadTarget = async (
  payload: AdminNoticeMediaUploadTargetRequest,
): Promise<AdminNoticeMediaUploadTarget> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminNoticeMediaUploadTarget>>(
      '/api/v1/admin/notice-media/attachment-upload-targets',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '공지 첨부파일 업로드 준비에 실패했습니다.');
  }
};

export const uploadAdminNoticeMediaFile = async (uploadUrl: string, file: File): Promise<void> => {
  const response = await fetch(uploadUrl, {
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`공지 이미지 업로드에 실패했습니다. (${String(response.status)})`);
  }
};
