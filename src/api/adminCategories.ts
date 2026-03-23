import axiosInstance from '@/api/axiosInstance';
import { http } from '@/api/http';
import { toApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/auth';
import type {
  AdminCategoryCreatePayload,
  AdminCategoryRecord,
  AdminCategoryReorderItem,
  AdminCategoryTreeItem,
  AdminCategoryUpsertPayload,
} from '@/types/adminCategories';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminCategoriesTree = async (): Promise<AdminCategoryTreeItem[]> => {
  try {
    return await http.get<AdminCategoryTreeItem[]>('/api/v1/admin/categories/tree');
  } catch (error: unknown) {
    throw toApiError(error, '카테고리를 불러오지 못했습니다.');
  }
};

export const createAdminCategory = async (
  payload: AdminCategoryCreatePayload,
): Promise<AdminCategoryRecord> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCategoryRecord>>(
      '/api/v1/admin/categories',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '카테고리를 추가하지 못했습니다.');
  }
};

export const updateAdminCategory = async (
  categoryId: number,
  payload: AdminCategoryUpsertPayload,
): Promise<AdminCategoryRecord> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminCategoryRecord>>(
      `/api/v1/admin/categories/${String(categoryId)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '카테고리를 수정하지 못했습니다.');
  }
};

export const deleteAdminCategory = async (categoryId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/categories/${String(categoryId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '카테고리를 삭제하지 못했습니다.');
  }
};

export const reorderAdminCategories = async (
  items: readonly AdminCategoryReorderItem[],
): Promise<void> => {
  try {
    await axiosInstance.put('/api/v1/admin/categories/reorder', { items });
  } catch (error: unknown) {
    throw toApiError(error, '카테고리 순서를 변경하지 못했습니다.');
  }
};
