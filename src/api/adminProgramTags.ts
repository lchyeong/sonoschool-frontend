import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { AdminProgramDetail, AdminProgramTag } from '@/types/adminProgramsLive';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminProgramTags = async (): Promise<AdminProgramTag[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProgramTag[]>>('/api/v1/admin/tags');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '태그 목록을 불러오지 못했습니다.');
  }
};

export const replaceAdminProgramTags = async (
  programId: number,
  tagIds: readonly number[],
): Promise<AdminProgramDetail> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminProgramDetail>>(
      `/api/v1/admin/programs/${String(programId)}/tags`,
      { tagIds },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 태그를 저장하지 못했습니다.');
  }
};
