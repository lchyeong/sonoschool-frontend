import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type {
  AdminProgramCategoryOption,
  AdminProgramCategoryTreeItem,
  AdminProgramDetail,
  AdminProgramListItem,
  AdminProgramUpsertPayload,
} from '@/types/adminProgramsLive';
import type { ApiEnvelope } from '@/types/auth';

interface PageResponse<T> {
  content: T[];
}

const toNullableString = (value: string | null | undefined): string | null => {
  return value && value.trim() ? value : null;
};

const toCategoryOptions = (
  items: readonly AdminProgramCategoryTreeItem[],
  parentLabels: readonly string[] = [],
): AdminProgramCategoryOption[] => {
  return items.flatMap((item) => {
    const labelPath = [...parentLabels, item.name];
    const activeChildren = item.children.filter((child) => child.active);
    const current: AdminProgramCategoryOption = {
      depth: item.depth,
      id: item.id,
      label: labelPath.join(' > '),
      name: item.name,
      pathLabel: labelPath.join(' > '),
      selectable: activeChildren.length === 0,
    };

    return [current, ...toCategoryOptions(activeChildren, labelPath)];
  });
};

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminProgramCategories = async (): Promise<AdminProgramCategoryOption[]> => {
  try {
    const tree = await http.get<AdminProgramCategoryTreeItem[]>('/api/v1/admin/categories/tree');
    return toCategoryOptions(tree.filter((item) => item.active));
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 카테고리를 불러오지 못했습니다.');
  }
};

export const fetchAdminProgramsLive = async (): Promise<AdminProgramListItem[]> => {
  try {
    const response =
      await axiosInstance.get<ApiEnvelope<PageResponse<AdminProgramListItem>>>(
        '/api/v1/admin/programs',
      );
    return unwrapApiEnvelope(response.data).content;
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 목록을 불러오지 못했습니다.');
  }
};

export const fetchAdminProgramDetailLive = async (
  programId: number,
): Promise<AdminProgramDetail> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProgramDetail>>(
      `/api/v1/admin/programs/${String(programId)}`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 상세를 불러오지 못했습니다.');
  }
};

const normalizeUpsertPayload = (payload: AdminProgramUpsertPayload) => {
  return {
    ...payload,
    accessPolicy: payload.accessPolicy,
    description: toNullableString(payload.description),
    faqs: payload.faqs,
    instructorBio: toNullableString(payload.instructorBio),
    instructorName: toNullableString(payload.instructorName),
    learningEndAt: toNullableString(payload.learningEndAt),
    learningPoints: payload.learningPoints,
    learningStartAt: toNullableString(payload.learningStartAt),
    maxStudents: payload.maxStudents,
    recommendedFor: payload.recommendedFor,
    saleEndAt: toNullableString(payload.saleEndAt),
    salePrice: payload.salePrice,
    saleStartAt: toNullableString(payload.saleStartAt),
    summaryItems: payload.summaryItems.map((item) => ({
      label: item.label,
      value: item.value,
    })),
    thumbnailUrl: toNullableString(payload.thumbnailUrl),
  };
};

export const createAdminProgramLive = async (
  payload: AdminProgramUpsertPayload,
): Promise<AdminProgramDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDetail>>(
      '/api/v1/admin/programs',
      normalizeUpsertPayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 등록에 실패했습니다.');
  }
};

export const updateAdminProgramLive = async (
  programId: number,
  payload: AdminProgramUpsertPayload,
): Promise<AdminProgramDetail> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminProgramDetail>>(
      `/api/v1/admin/programs/${String(programId)}`,
      normalizeUpsertPayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 수정에 실패했습니다.');
  }
};

export const publishAdminProgramLive = async (programId: number): Promise<void> => {
  try {
    await axiosInstance.post(`/api/v1/admin/programs/${String(programId)}/publish`);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 공개 처리에 실패했습니다.');
  }
};

export const unpublishAdminProgramLive = async (programId: number): Promise<void> => {
  try {
    await axiosInstance.post(`/api/v1/admin/programs/${String(programId)}/unpublish`);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 숨김 처리에 실패했습니다.');
  }
};

export const deleteAdminProgramLive = async (programId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/programs/${String(programId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 삭제에 실패했습니다.');
  }
};
