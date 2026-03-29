import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminEnrollmentListItem,
  AdminEnrollmentMaintenanceResult,
  AdminEnrollmentResult,
} from '@/types/adminEnrollments';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const createAdminEnrollment = async (
  programId: number,
  userId: number,
): Promise<AdminEnrollmentResult> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminEnrollmentResult>>(
      '/api/v1/admin/enrollments',
      null,
      {
        params: {
          programId,
          userId,
        },
      },
    );

    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '수동 수강 배정에 실패했습니다.');
  }
};

export const fetchAdminEnrollments = async (
  keyword?: string,
): Promise<AdminEnrollmentListItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminEnrollmentListItem[]>>(
      '/api/v1/admin/enrollments',
      {
        params: keyword?.trim()
          ? {
              keyword: keyword.trim(),
            }
          : undefined,
      },
    );

    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '수강 목록을 불러오지 못했습니다.');
  }
};

export const expireAdminEnrollments = async (): Promise<AdminEnrollmentMaintenanceResult> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminEnrollmentMaintenanceResult>>(
      '/api/v1/admin/enrollments/expire',
    );

    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '수강 만료 정리 실행에 실패했습니다.');
  }
};
