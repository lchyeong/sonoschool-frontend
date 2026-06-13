import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminProblemArea,
  AdminProblemAreaCreatePayload,
  AdminProblemAreaUpdatePayload,
} from '@/types/adminProblemAreas';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

const normalizeDescription = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
};

export const fetchAdminProblemAreas = async (activeOnly = false): Promise<AdminProblemArea[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProblemArea[]>>(
      '/api/v1/admin/problem-areas',
      {
        params: { activeOnly },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제영역을 불러오지 못했습니다.');
  }
};

export const createAdminProblemArea = async (
  payload: AdminProblemAreaCreatePayload,
): Promise<AdminProblemArea> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProblemArea>>(
      '/api/v1/admin/problem-areas',
      {
        ...payload,
        description: normalizeDescription(payload.description),
        parentId: payload.parentId ?? null,
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제영역을 추가하지 못했습니다.');
  }
};

export const updateAdminProblemArea = async (
  areaId: number,
  payload: AdminProblemAreaUpdatePayload,
): Promise<AdminProblemArea> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminProblemArea>>(
      `/api/v1/admin/problem-areas/${String(areaId)}`,
      {
        ...payload,
        description: normalizeDescription(payload.description),
        parentId: payload.parentId ?? null,
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '문제영역을 수정하지 못했습니다.');
  }
};

export const deleteAdminProblemArea = async (areaId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/problem-areas/${String(areaId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '문제영역을 삭제하지 못했습니다.');
  }
};
