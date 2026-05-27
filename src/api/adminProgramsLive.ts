import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type {
  AdminProgramCategoryOption,
  AdminProgramCategoryTreeItem,
  AdminProgramDetail,
  AdminProgramListItem,
  AdminProgramSummaryInfoItem,
  AdminProgramUpsertPayload,
} from '@/types/adminProgramsLive';
import type { ApiEnvelope } from '@/types/auth';

interface PageResponse<T> {
  content: T[];
}

const asArray = <T>(items: readonly T[] | null | undefined): T[] => {
  return Array.isArray(items) ? [...(items as readonly T[])] : [];
};

const isPresent = <T>(item: T | null | undefined): item is T => item !== null && item !== undefined;

const toNullableString = (value: string | null | undefined): string | null => {
  return value && value.trim() ? value : null;
};

const toCategoryOptions = (
  items: readonly AdminProgramCategoryTreeItem[],
  parentLabels: readonly string[] = [],
): AdminProgramCategoryOption[] => {
  return asArray(items)
    .filter(isPresent)
    .flatMap((item) => {
      const labelPath = [...parentLabels, item.name];
      const activeChildren = asArray(item.children).filter((child) => child.active);
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

const normalizeStructuredItems = (
  items:
    | readonly (
        | { content?: string; label?: string; title?: string; value?: string }
        | null
        | undefined
      )[]
    | null
    | undefined,
): AdminProgramSummaryInfoItem[] => {
  return asArray(items).map((item) => {
    if (!item) {
      return { label: '', value: '' };
    }

    return {
      label: item.label || item.title || '',
      value: item.value || item.content || '',
    };
  });
};

const normalizeAdminProgramDetail = (detail: AdminProgramDetail): AdminProgramDetail => {
  return {
    ...detail,
    checklists: asArray(detail.checklists).filter(isPresent),
    documents: asArray(detail.documents).filter(isPresent),
    faqs: asArray(detail.faqs).filter(isPresent),
    learningPoints: asArray(detail.learningPoints).filter(isPresent),
    learningOutcomes: normalizeStructuredItems(detail.learningOutcomes),
    recommendedFor: asArray(detail.recommendedFor).filter(isPresent),
    summaryItems: normalizeStructuredItems(detail.summaryItems),
    tags: detail.tags === undefined ? undefined : asArray(detail.tags).filter(isPresent),
  };
};

export const fetchAdminProgramCategories = async (): Promise<AdminProgramCategoryOption[]> => {
  try {
    const tree = await http.get<AdminProgramCategoryTreeItem[]>('/api/v1/admin/categories/tree');
    return toCategoryOptions(asArray(tree).filter((item) => item.active));
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
    return asArray(unwrapApiEnvelope(response.data).content);
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
    return normalizeAdminProgramDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 상세를 불러오지 못했습니다.');
  }
};

const normalizeUpsertPayload = (payload: AdminProgramUpsertPayload) => {
  return {
    ...payload,
    accessPolicy: payload.accessPolicy,
    checklists: asArray(payload.checklists).filter(isPresent),
    description: toNullableString(payload.description),
    faqs: asArray(payload.faqs).filter(isPresent),
    learningEndAt: toNullableString(payload.learningEndAt),
    learningPoints: asArray(payload.learningPoints).filter(isPresent),
    learningOutcomes: asArray(payload.learningOutcomes)
      .filter(isPresent)
      .map((item) => ({
        content: item.value,
        title: item.label,
      })),
    learningStartAt: toNullableString(payload.learningStartAt),
    maxStudents: payload.maxStudents,
    recommendedFor: asArray(payload.recommendedFor).filter(isPresent),
    saleEndAt: toNullableString(payload.saleEndAt),
    salePrice: payload.salePrice,
    saleStartAt: toNullableString(payload.saleStartAt),
    summaryItems: asArray(payload.summaryItems)
      .filter(isPresent)
      .map((item) => ({
        content: item.value,
        title: item.label,
      })),
    thumbnailCropOffsetX: payload.thumbnailCropOffsetX,
    thumbnailCropOffsetY: payload.thumbnailCropOffsetY,
    thumbnailCropZoom: payload.thumbnailCropZoom,
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
    return normalizeAdminProgramDetail(unwrapApiEnvelope(response.data));
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
    return normalizeAdminProgramDetail(unwrapApiEnvelope(response.data));
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

export const featureAdminProgramOnHome = async (programId: number): Promise<AdminProgramDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDetail>>(
      `/api/v1/admin/programs/${String(programId)}/feature`,
    );
    return normalizeAdminProgramDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '메인 슬라이드 노출 처리에 실패했습니다.');
  }
};

export const unfeatureAdminProgramOnHome = async (
  programId: number,
): Promise<AdminProgramDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDetail>>(
      `/api/v1/admin/programs/${String(programId)}/unfeature`,
    );
    return normalizeAdminProgramDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '메인 슬라이드 노출 해제에 실패했습니다.');
  }
};

export const deleteAdminProgramLive = async (programId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/programs/${String(programId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 삭제에 실패했습니다.');
  }
};
