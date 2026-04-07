import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminProgramTag, AdminProgramTagType } from '@/types/adminProgramsLive';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export interface AdminTagUpsertPayload {
  active?: boolean;
  name: string;
  slug: string;
  sortOrder: number;
  type: AdminProgramTagType;
}

export const fetchAdminTags = async (): Promise<AdminProgramTag[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProgramTag[]>>('/api/v1/admin/tags');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '태그 목록을 불러오지 못했습니다.');
  }
};

export const createAdminTag = async (payload: AdminTagUpsertPayload): Promise<AdminProgramTag> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramTag>>('/api/v1/admin/tags', {
      active: payload.active ?? true,
      name: payload.name,
      slug: payload.slug,
      sortOrder: payload.sortOrder,
      type: payload.type,
    });
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '태그를 등록하지 못했습니다.');
  }
};

export const updateAdminTag = async (
  tagId: number,
  payload: Omit<AdminTagUpsertPayload, 'active'>,
): Promise<AdminProgramTag> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminProgramTag>>(
      `/api/v1/admin/tags/${String(tagId)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '태그를 수정하지 못했습니다.');
  }
};

export const activateAdminTag = async (tagId: number): Promise<AdminProgramTag> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramTag>>(
      `/api/v1/admin/tags/${String(tagId)}/activate`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '태그를 활성화하지 못했습니다.');
  }
};

export const deactivateAdminTag = async (tagId: number): Promise<AdminProgramTag> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramTag>>(
      `/api/v1/admin/tags/${String(tagId)}/deactivate`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '태그를 비활성화하지 못했습니다.');
  }
};
