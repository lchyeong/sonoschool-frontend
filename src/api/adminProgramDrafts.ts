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

const createClientKey = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`;
};

const asArray = <T>(items: readonly T[] | null | undefined): T[] => {
  return Array.isArray(items) ? [...(items as readonly T[])] : [];
};

const isPresent = <T>(item: T | null | undefined): item is T => item !== null && item !== undefined;

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

const normalizeBoolean = (value: boolean | null | undefined): boolean => value ?? false;

const normalizePublished = (value: boolean | null | undefined): boolean => value ?? true;

const normalizeSortOrder = (value: number | null | undefined, fallback = 0): number =>
  value ?? fallback;

const normalizeDraftPayloadForClient = (
  payload: AdminProgramDraftPayload | null | undefined,
): AdminProgramDraftPayload => {
  const basicInfo = payload?.basicInfo;

  return {
    basicInfo: {
      accessDays: basicInfo?.accessDays ?? null,
      accessPolicy: basicInfo?.accessPolicy ?? null,
      categoryId: basicInfo?.categoryId ?? null,
      checklists: asArray(basicInfo?.checklists).filter(isPresent),
      description: basicInfo?.description ?? null,
      faqs: asArray(basicInfo?.faqs).filter(isPresent),
      learningEndAt: basicInfo?.learningEndAt ?? null,
      learningPoints: asArray(basicInfo?.learningPoints).filter(isPresent),
      learningOutcomes: normalizeStructuredItems(basicInfo?.learningOutcomes),
      learningStartAt: basicInfo?.learningStartAt ?? null,
      level: basicInfo?.level ?? null,
      maxStudents: basicInfo?.maxStudents ?? null,
      price: basicInfo?.price ?? null,
      programType: basicInfo?.programType ?? null,
      recommendedFor: asArray(basicInfo?.recommendedFor).filter(isPresent),
      saleEndAt: basicInfo?.saleEndAt ?? null,
      salePrice: basicInfo?.salePrice ?? null,
      saleStartAt: basicInfo?.saleStartAt ?? null,
      summaryItems: normalizeStructuredItems(basicInfo?.summaryItems),
      thumbnailCropOffsetX: basicInfo?.thumbnailCropOffsetX ?? null,
      thumbnailCropOffsetY: basicInfo?.thumbnailCropOffsetY ?? null,
      thumbnailCropZoom: basicInfo?.thumbnailCropZoom ?? null,
      thumbnailPreviewUrl: basicInfo?.thumbnailPreviewUrl ?? null,
      thumbnailUrl: basicInfo?.thumbnailUrl ?? null,
      title: basicInfo?.title ?? null,
    },
    sections: asArray(payload?.sections)
      .filter(isPresent)
      .map((section, sectionIndex) => ({
        ...section,
        description: section.description ?? null,
        key: section.key || createClientKey('section'),
        lectures: asArray(section.lectures)
          .filter(isPresent)
          .map((lecture, lectureIndex) => ({
            ...lecture,
            description: lecture.description ?? null,
            key: lecture.key || createClientKey('lecture'),
            offlineSchedules: asArray(lecture.offlineSchedules).filter(isPresent),
            preview: normalizeBoolean(lecture.preview),
            published: normalizePublished(lecture.published),
            sortOrder: normalizeSortOrder(lecture.sortOrder, lectureIndex),
            title: lecture.title ?? null,
            videoUploadErrorMessage: lecture.videoUploadErrorMessage ?? null,
            videoUploadFileName: lecture.videoUploadFileName ?? null,
            videoUploadStatus: lecture.videoUploadStatus ?? null,
          })),
        sortOrder: normalizeSortOrder(section.sortOrder, sectionIndex),
        title: section.title ?? null,
      })),
    problems: asArray(payload?.problems)
      .filter((problem) => isPresent(problem) && Boolean(problem.lectureKey))
      .map((problem) => ({
        ...problem,
        lectureKey: problem.lectureKey,
        passScore: problem.passScore ?? null,
        problemAreaId: problem.problemAreaId ?? null,
        questions: asArray(problem.questions)
          .filter(isPresent)
          .map((question, questionIndex) => ({
            ...question,
            explanation: question.explanation ?? null,
            mediaAssetId: question.mediaAssetId ?? null,
            mediaType: question.mediaType ?? null,
            mediaUploadErrorMessage: question.mediaUploadErrorMessage ?? null,
            mediaUploadFileName: question.mediaUploadFileName ?? null,
            mediaUploadStatus:
              question.mediaUploadStatus ??
              (question.mediaAssetId || question.mediaVideoId ? 'READY' : null),
            mediaUrl: question.mediaUrl ?? null,
            mediaVideoId: question.mediaVideoId ?? null,
            options: asArray(question.options)
              .filter(isPresent)
              .map((option, optionIndex) => ({
                ...option,
                correct: normalizeBoolean(option.correct),
                mediaType: null,
                mediaUrl: null,
                optionText: typeof option.optionText === 'string' ? option.optionText : '',
                sortOrder: normalizeSortOrder(option.sortOrder, optionIndex),
              })),
            problemAreaId: question.problemAreaId ?? null,
            questionText: typeof question.questionText === 'string' ? question.questionText : '',
            sortOrder: normalizeSortOrder(question.sortOrder, questionIndex),
          })),
        retakeAllowed: problem.retakeAllowed ?? null,
        timeLimitSeconds: problem.timeLimitSeconds ?? null,
        title: problem.title ?? null,
      })),
    resources: asArray(payload?.resources)
      .filter((resource) => isPresent(resource) && Boolean(resource.lectureKey))
      .map((resource, resourceIndex) => ({
        ...resource,
        description: resource.description ?? null,
        fileName: resource.fileName ?? null,
        fileSize: resource.fileSize ?? null,
        fileUrl: resource.fileUrl ?? null,
        key: resource.key || createClientKey('resource'),
        mimeType: resource.mimeType ?? null,
        sortOrder: normalizeSortOrder(resource.sortOrder, resourceIndex),
        title: resource.title ?? null,
        uploadErrorMessage: resource.uploadErrorMessage ?? null,
        uploadStatus: resource.uploadStatus ?? null,
        visibility: resource.visibility ?? null,
      })),
  };
};

const normalizeDraftDetail = (detail: AdminProgramDraftDetail): AdminProgramDraftDetail => {
  const payload = normalizeDraftPayloadForClient(detail.payload);

  return {
    ...detail,
    payload: {
      ...payload,
      basicInfo: {
        ...payload.basicInfo,
        learningOutcomes: normalizeStructuredItems(payload.basicInfo.learningOutcomes),
        summaryItems: normalizeStructuredItems(payload.basicInfo.summaryItems),
      },
      sections: payload.sections.map((section) => ({
        ...section,
        lectures: section.lectures.map((lecture) => ({
          ...lecture,
          lectureType: lecture.lectureType,
          offlineSchedules: lecture.offlineSchedules,
          preview: false,
          videoUploadErrorMessage: lecture.videoUploadErrorMessage,
          videoUploadFileName: lecture.videoUploadFileName,
          videoUploadStatus: lecture.videoUploadStatus,
        })),
      })),
      problems: payload.problems.map((problem) => ({
        ...problem,
        questions: problem.questions.map((question) => ({
          ...question,
          mediaUploadErrorMessage: question.mediaUploadErrorMessage ?? null,
          mediaUploadFileName: question.mediaUploadFileName ?? null,
          mediaUploadStatus:
            question.mediaUploadStatus ??
            (question.mediaAssetId || question.mediaVideoId ? 'READY' : null),
        })),
      })),
      resources: payload.resources.map((resource) => ({
        ...resource,
        key: resource.key || createClientKey('resource'),
        lectureKey: resource.lectureKey,
        uploadErrorMessage: resource.uploadErrorMessage,
        uploadStatus: resource.uploadStatus,
      })),
    },
  };
};

const normalizeDraftPayload = (payload: AdminProgramDraftPayload) => {
  const safePayload = normalizeDraftPayloadForClient(payload);

  return {
    ...safePayload,
    basicInfo: {
      ...safePayload.basicInfo,
      thumbnailPreviewUrl: null,
      learningOutcomes: safePayload.basicInfo.learningOutcomes.map((item) => ({
        content: item.value,
        title: item.label,
      })),
      summaryItems: safePayload.basicInfo.summaryItems.map((item) => ({
        content: item.value,
        title: item.label,
      })),
    },
    sections: safePayload.sections.map((section) => ({
      ...section,
      sortOrder: normalizeSortOrder(section.sortOrder),
      lectures: section.lectures.map((lecture) => ({
        ...lecture,
        durationSeconds: lecture.lectureType === 'PROBLEM' ? null : lecture.durationSeconds,
        published: normalizePublished(lecture.published),
        preview: false,
        sortOrder: normalizeSortOrder(lecture.sortOrder),
      })),
    })),
    problems: safePayload.problems.map((problem) => ({
      ...problem,
      retakeAllowed: normalizeBoolean(problem.retakeAllowed),
      questions: problem.questions.map((question) => ({
        ...question,
        mediaUploadErrorMessage: question.mediaUploadErrorMessage ?? null,
        mediaUploadFileName: question.mediaUploadFileName ?? null,
        mediaUploadStatus:
          question.mediaUploadStatus ??
          (question.mediaAssetId || question.mediaVideoId ? 'READY' : null),
        options: question.options.map((option, optionIndex) => ({
          ...option,
          correct: normalizeBoolean(option.correct),
          sortOrder: normalizeSortOrder(option.sortOrder, optionIndex),
        })),
        sortOrder: normalizeSortOrder(question.sortOrder),
      })),
    })),
    resources: safePayload.resources.map((resource) => ({
      ...resource,
      sortOrder: normalizeSortOrder(resource.sortOrder),
    })),
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

export const createAdminProgramEditDraft = async (
  programId: number,
): Promise<AdminProgramDraftDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDraftDetail>>(
      `/api/v1/admin/program-drafts/from-program/${String(programId)}`,
    );
    return normalizeDraftDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 수정 화면을 준비하지 못했습니다.');
  }
};

export const createAdminProgramDuplicateDraft = async (
  programId: number,
): Promise<AdminProgramDraftDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDraftDetail>>(
      `/api/v1/admin/program-drafts/duplicate-from-program/${String(programId)}`,
    );
    return normalizeDraftDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '프로그램 복제 화면을 준비하지 못했습니다.');
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
  options?: { mode?: 'create' | 'duplicate' | 'edit' },
): Promise<AdminProgramDraftDetail> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminProgramDraftDetail>>(
      `/api/v1/admin/program-drafts/${String(draftId)}`,
      normalizeDraftPayload(payload),
    );
    return normalizeDraftDetail(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(
      error,
      options?.mode === 'edit'
        ? '프로그램 수정 내용을 저장하지 못했습니다.'
        : '프로그램 초안을 저장하지 못했습니다.',
    );
  }
};

export const finalizeAdminProgramDraft = async (
  draftId: number,
  options?: { mode?: 'create' | 'duplicate' | 'edit' },
): Promise<AdminProgramDraftFinalizeResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminProgramDraftFinalizeResponse>>(
      `/api/v1/admin/program-drafts/${String(draftId)}/finalize`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(
      error,
      options?.mode === 'edit'
        ? '프로그램 수정을 완료하지 못했습니다.'
        : '프로그램 등록을 완료하지 못했습니다.',
    );
  }
};

export const discardAdminProgramDraft = async (
  draftId: number,
  options?: { mode?: 'create' | 'duplicate' | 'edit' },
): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/program-drafts/${String(draftId)}`);
  } catch (error: unknown) {
    throw toApiError(
      error,
      options?.mode === 'edit'
        ? '프로그램 수정을 취소하지 못했습니다.'
        : '프로그램 초안을 폐기하지 못했습니다.',
    );
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

export const updateDraftProblemQuestionMediaUploadState = async (
  draftId: number,
  lectureKey: string,
  questionIndex: number,
  payload: {
    clearMedia?: boolean;
    errorMessage?: string | null;
    fileName?: string | null;
    mediaAssetId?: number | null;
    mediaType?: 'IMAGE' | 'VIDEO' | null;
    mediaUrl?: string | null;
    mediaVideoId?: number | null;
    status?: AdminDraftUploadStatus | null;
  },
): Promise<void> => {
  try {
    const requestPayload = {
      ...payload,
      clearMedia: payload.clearMedia ?? false,
    };

    await axiosInstance.post(
      `/api/v1/admin/program-drafts/${String(draftId)}/problems/${encodeURIComponent(
        lectureKey,
      )}/questions/${String(questionIndex)}/media-upload-state`,
      requestPayload,
    );
  } catch (error: unknown) {
    throw toApiError(error, '문제 미디어 업로드 상태를 저장하지 못했습니다.');
  }
};
