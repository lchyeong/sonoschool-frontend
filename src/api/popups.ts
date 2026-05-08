import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ApiEnvelope } from '@/types/auth';
import type { AdminPopupCreatePayload, AdminPopupUpdatePayload, PopupItem } from '@/types/popup';
import { sanitizePublicAssetUrl } from '@/utils/publicAssetUrl';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

const sanitizePopupItem = (popup: PopupItem): PopupItem => ({
  ...popup,
  imageUrl: sanitizePublicAssetUrl(popup.imageUrl, '') ?? '',
});

export const fetchGlobalPopups = async (): Promise<PopupItem[]> => {
  try {
    const response = await http.get<PopupItem | PopupItem[] | null>('/api/v1/popups');

    if (Array.isArray(response)) {
      return response.map(sanitizePopupItem).filter((popup) => popup.imageUrl);
    }

    if (!response) {
      return [];
    }

    const popup = sanitizePopupItem(response);
    return popup.imageUrl ? [popup] : [];
  } catch (error: unknown) {
    throw toApiError(error, '팝업 목록을 불러오지 못했습니다.');
  }
};

export const fetchAdminPopups = async (): Promise<PopupItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<PopupItem[]>>('/api/v1/admin/popups');
    return unwrapApiEnvelope(response.data).map(sanitizePopupItem);
  } catch (error: unknown) {
    throw toApiError(error, '관리자 팝업 목록을 불러오지 못했습니다.');
  }
};

export const createAdminPopupLive = async (
  payload: AdminPopupCreatePayload,
): Promise<PopupItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PopupItem>>(
      '/api/v1/admin/popups',
      payload,
    );
    return sanitizePopupItem(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '팝업 등록에 실패했습니다.');
  }
};

export const updateAdminPopupLive = async (
  popupId: number,
  payload: AdminPopupUpdatePayload,
): Promise<PopupItem> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<PopupItem>>(
      `/api/v1/admin/popups/${String(popupId)}`,
      payload,
    );
    return sanitizePopupItem(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '팝업 수정에 실패했습니다.');
  }
};

export const publishAdminPopupLive = async (popupId: number): Promise<PopupItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PopupItem>>(
      `/api/v1/admin/popups/${String(popupId)}/publish`,
    );
    return sanitizePopupItem(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '팝업 게시 처리에 실패했습니다.');
  }
};

export const unpublishAdminPopupLive = async (popupId: number): Promise<PopupItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PopupItem>>(
      `/api/v1/admin/popups/${String(popupId)}/unpublish`,
    );
    return sanitizePopupItem(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '팝업 게시 중지에 실패했습니다.');
  }
};

export const deleteAdminPopupLive = async (popupId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/popups/${String(popupId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '팝업 삭제에 실패했습니다.');
  }
};
