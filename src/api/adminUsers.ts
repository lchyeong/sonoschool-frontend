import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminUserDetail,
  AdminUserManagementItem,
  AdminUserSearchItem,
} from '@/types/adminUsers';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const searchAdminUsers = async (keyword: string): Promise<AdminUserSearchItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminUserSearchItem[]>>(
      '/api/v1/admin/users/search',
      {
        params: {
          keyword,
          limit: 10,
        },
      },
    );

    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '회원 목록을 불러오지 못했습니다.');
  }
};

export const fetchAdminUsers = async (keyword?: string): Promise<AdminUserManagementItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminUserManagementItem[]>>(
      '/api/v1/admin/users',
      {
        params: keyword?.trim()
          ? {
              keyword: keyword.trim(),
              limit: 20,
            }
          : {
              limit: 20,
            },
      },
    );

    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '회원 목록을 불러오지 못했습니다.');
  }
};

export const fetchAdminUserDetail = async (userId: number): Promise<AdminUserDetail> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminUserDetail>>(
      `/api/v1/admin/users/${String(userId)}`,
    );

    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '회원 상세 정보를 불러오지 못했습니다.');
  }
};
