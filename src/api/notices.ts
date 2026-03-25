import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ApiEnvelope } from '@/types/auth';
import type {
  AdminNoticeCreatePayload,
  AdminNoticeUpdatePayload,
  NoticeItem,
} from '@/types/notice';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchGlobalNotices = async (): Promise<NoticeItem[]> => {
  try {
    return await http.get<NoticeItem[]>('/api/v1/notices');
  } catch (error: unknown) {
    throw toApiError(error, '공지사항을 불러오지 못했습니다.');
  }
};

export const fetchNoticeDetail = async (noticeId: number): Promise<NoticeItem> => {
  try {
    return await http.get<NoticeItem>(`/api/v1/notices/${String(noticeId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '공지 상세를 불러오지 못했습니다.');
  }
};

export const fetchAdminNotices = async (): Promise<NoticeItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<NoticeItem[]>>('/api/v1/admin/notices');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '관리자 공지 목록을 불러오지 못했습니다.');
  }
};

export const createAdminNoticeLive = async (
  payload: AdminNoticeCreatePayload,
): Promise<NoticeItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<NoticeItem>>('/api/v1/admin/notices', payload);
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '공지사항 등록에 실패했습니다.');
  }
};

export const updateAdminNoticeLive = async (
  noticeId: number,
  payload: AdminNoticeUpdatePayload,
): Promise<NoticeItem> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<NoticeItem>>(
      `/api/v1/admin/notices/${String(noticeId)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '공지사항 수정에 실패했습니다.');
  }
};

export const publishAdminNoticeLive = async (noticeId: number): Promise<NoticeItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<NoticeItem>>(
      `/api/v1/admin/notices/${String(noticeId)}/publish`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '공지 게시 처리에 실패했습니다.');
  }
};

export const unpublishAdminNoticeLive = async (noticeId: number): Promise<NoticeItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<NoticeItem>>(
      `/api/v1/admin/notices/${String(noticeId)}/unpublish`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '공지 게시 중지에 실패했습니다.');
  }
};

export const deleteAdminNoticeLive = async (noticeId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/notices/${String(noticeId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '공지 삭제에 실패했습니다.');
  }
};
