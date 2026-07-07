import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminProgramEnrollmentItem,
  AdminProgramEnrollmentReviewUpdatePayload,
} from '@/types/adminProgramOperations';
import type { AdminProgramDetail } from '@/types/adminProgramsLive';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminProgramEnrollments = async (
  programId: number,
): Promise<AdminProgramEnrollmentItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProgramEnrollmentItem[]>>(
      `/api/v1/admin/programs/${String(programId)}/enrollments`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 수강생 목록을 불러오지 못했습니다.');
  }
};

export const cancelAdminEnrollment = async (
  enrollmentId: number,
  payload: { reason: string },
): Promise<void> => {
  try {
    await axiosInstance.post(`/api/v1/admin/enrollments/${String(enrollmentId)}/cancel`, payload);
  } catch (error: unknown) {
    throw toApiError(error, '수강권 회수에 실패했습니다.');
  }
};

export const updateAdminProgramEnrollmentReview = async (
  reviewId: number,
  payload: AdminProgramEnrollmentReviewUpdatePayload,
): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/admin/reviews/${String(reviewId)}`, payload);
  } catch (error: unknown) {
    throw toApiError(error, '수강평 수정에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const deleteAdminProgramEnrollmentReview = async (reviewId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/reviews/${String(reviewId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '수강평 삭제에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const closeAdminProgram = async (programId: number): Promise<AdminProgramDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDetail>>(
      `/api/v1/admin/programs/${String(programId)}/close`,
      {},
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 폐강 처리에 실패했습니다.');
  }
};
