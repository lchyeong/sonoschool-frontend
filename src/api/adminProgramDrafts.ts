import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminDraftUploadStatus,
  AdminProgramDraftDetail,
  AdminProgramDraftFinalizeResponse,
  AdminProgramDraftPayload,
  AdminProgramDraftSummary,
} from '@/types/adminProgramDrafts';
import type { AdminProgramSummaryInfoItem } from '@/types/adminProgramsLive';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;

const normalizeStructuredItems = (
  items: readonly (
    | { content?: string; label?: string; title?: string; value?: string }
    | null
    | undefined
  )[],
): AdminProgramSummaryInfoItem[] => {
  return items.map((item) => {
    if (!item) {
      return { label: '', value: '' };
    }

    return {
      label: item.label || item.title || '',
      value: item.value || item.content || '',
    };
  });
};

const normalizeDraftDetail = (detail: AdminProgramDraftDetail): AdminProgramDraftDetail => {
  return {
    ...detail,
    payload: {
      ...detail.payload,
      basicInfo: {
        ...detail.payload.basicInfo,
        learningOutcomes: normalizeStructuredItems(detail.payload.basicInfo.learningOutcomes),
        summaryItems: normalizeStructuredItems(detail.payload.basicInfo.summaryItems),
      },
      sections: detail.payload.sections.map((section) => ({
        ...section,
        lectures: section.lectures.map((lecture) => ({
          ...lecture,
          lectureType: lecture.lectureType,
          offlineScheduleRule: lecture.offlineScheduleRule,
          practicumDescription: lecture.practicumDescription,
          practicumTitle: lecture.practicumTitle,
          videoUploadErrorMessage: lecture.videoUploadErrorMessage,
          videoUploadFileName: lecture.videoUploadFileName,
          videoUploadStatus: lecture.videoUploadStatus,
        })),
      })),
      resources: detail.payload.resources.map((resource) => ({
        ...resource,
        key: resource.key || crypto.randomUUID(),
        lectureKey: resource.lectureKey,
        uploadErrorMessage: resource.uploadErrorMessage,
        uploadStatus: resource.uploadStatus,
      })),
    },
  };
};

const normalizeDraftPayload = (payload: AdminProgramDraftPayload) => {
  return {
    ...payload,
    basicInfo: {
      ...payload.basicInfo,
      learningOutcomes: payload.basicInfo.learningOutcomes.map((item) => ({
        content: item.value,
        title: item.label,
      })),
      summaryItems: payload.basicInfo.summaryItems.map((item) => ({
        content: item.value,
        title: item.label,
      })),
    },
  };
};

export const fetchAdminProgramDrafts = async (): Promise<AdminProgramDraftSummary[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProgramDraftSummary[]>>(
      '/api/v1/admin/program-drafts',
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 초안 목록을 불러오지 못했습니다.');
  }
};

export const createAdminProgramDraft = async (): Promise<AdminProgramDraftDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDraftDetail>>(
      '/api/v1/admin/program-drafts',
    );
    return normalizeDraftDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 초안을 생성하지 못했습니다.');
  }
};

export const fetchAdminProgramDraft = async (draftId: number): Promise<AdminProgramDraftDetail> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminProgramDraftDetail>>(
      `/api/v1/admin/program-drafts/${String(draftId)}`,
    );
    return normalizeDraftDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 초안을 불러오지 못했습니다.');
  }
};

export const updateAdminProgramDraft = async (
  draftId: number,
  payload: AdminProgramDraftPayload,
): Promise<AdminProgramDraftDetail> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminProgramDraftDetail>>(
      `/api/v1/admin/program-drafts/${String(draftId)}`,
      normalizeDraftPayload(payload),
    );
    return normalizeDraftDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 초안을 저장하지 못했습니다.');
  }
};

export const finalizeAdminProgramDraft = async (
  draftId: number,
): Promise<AdminProgramDraftFinalizeResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDraftFinalizeResponse>>(
      `/api/v1/admin/program-drafts/${String(draftId)}/finalize`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 등록을 완료하지 못했습니다.');
  }
};

export const discardAdminProgramDraft = async (draftId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/program-drafts/${String(draftId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 초안을 폐기하지 못했습니다.');
  }
};

export const updateDraftLectureVideoUploadState = async (
  draftId: number,
  lectureKey: string,
  payload: {
    durationSeconds?: number | null;
    errorMessage?: string | null;
    fileName?: string | null;
    status: AdminDraftUploadStatus;
    videoId?: number | null;
  },
): Promise<void> => {
  try {
    await axiosInstance.post(
      `/api/v1/admin/program-drafts/${String(draftId)}/lectures/${encodeURIComponent(
        lectureKey,
      )}/video-upload-state`,
      payload,
    );
  } catch (error: unknown) {
    throw toApiError(error, '영상 업로드 상태를 저장하지 못했습니다.');
  }
};

export const updateDraftResourceUploadState = async (
  draftId: number,
  resourceKey: string,
  payload: {
    errorMessage?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    fileUrl?: string | null;
    mimeType?: string | null;
    status: AdminDraftUploadStatus;
  },
): Promise<void> => {
  try {
    await axiosInstance.post(
      `/api/v1/admin/program-drafts/${String(draftId)}/resources/${encodeURIComponent(
        resourceKey,
      )}/upload-state`,
      payload,
    );
  } catch (error: unknown) {
    throw toApiError(error, '자료 업로드 상태를 저장하지 못했습니다.');
  }
};
