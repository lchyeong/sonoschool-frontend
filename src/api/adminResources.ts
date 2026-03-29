import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminResourceItem, AdminResourceUpsertPayload } from '@/types/adminResources';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminResources = async (): Promise<AdminResourceItem[]> => {
  try {
    const response =
      await axiosInstance.get<ApiEnvelope<AdminResourceItem[]>>('/api/v1/admin/resources');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '자료 목록을 불러오지 못했습니다.');
  }
};

export const createAdminResource = async (
  payload: AdminResourceUpsertPayload,
): Promise<AdminResourceItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminResourceItem>>(
      '/api/v1/admin/resources',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '자료를 등록하지 못했습니다.');
  }
};

export const updateAdminResource = async (
  resourceId: number,
  payload: AdminResourceUpsertPayload,
): Promise<AdminResourceItem> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminResourceItem>>(
      `/api/v1/admin/resources/${String(resourceId)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '자료를 수정하지 못했습니다.');
  }
};

export const deleteAdminResource = async (resourceId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/resources/${String(resourceId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '자료를 삭제하지 못했습니다.');
  }
};
