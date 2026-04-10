import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminCurriculumLecture,
  AdminCurriculumSection,
  AdminLectureOfflineScheduleUpsertPayload,
  AdminLectureOfflineSchedulesReplacePayload,
  AdminLectureUpsertPayload,
  AdminSectionUpsertPayload,
  AdminSortOrderItem,
} from '@/types/adminCurriculum';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

const normalizeDescription = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeSectionPayload = (payload: AdminSectionUpsertPayload): AdminSectionUpsertPayload => {
  return {
    ...payload,
    description: normalizeDescription(payload.description),
  };
};

const normalizeLecturePayload = (payload: AdminLectureUpsertPayload): AdminLectureUpsertPayload => {
  const { problemOnly, ...restPayload } = payload;

  return {
    ...restPayload,
    description: normalizeDescription(payload.description),
    lectureType: payload.lectureType,
  };
};

const normalizeOfflineSchedulePayload = (
  payload: AdminLectureOfflineScheduleUpsertPayload,
): AdminLectureOfflineScheduleUpsertPayload => {
  return {
    ...payload,
    date: payload.date.trim(),
    location: normalizeDescription(payload.location),
    notes: normalizeDescription(payload.notes),
  };
};

const normalizeOfflineSchedulesPayload = (
  payload: AdminLectureOfflineSchedulesReplacePayload,
): AdminLectureOfflineSchedulesReplacePayload => {
  return {
    offlineSchedules: payload.offlineSchedules.map(normalizeOfflineSchedulePayload),
  };
};

export const fetchAdminCurriculum = async (
  programId: number,
): Promise<AdminCurriculumSection[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminCurriculumSection[]>>(
      `/api/v1/admin/programs/${String(programId)}/sections`,
    );
    return unwrapApiEnvelope(response.data).map((section) => ({
      ...section,
      lectures: section.lectures.map((lecture) => ({
        ...lecture,
        offlineSchedules: lecture.offlineSchedules,
        problemOnly: lecture.lectureType === 'PROBLEM',
        practicumEnabled: lecture.lectureType === 'PRACTICUM',
      })),
    }));
  } catch (error: unknown) {
    throw toApiError(error, '커리큘럼을 불러오지 못했습니다.');
  }
};

export const createAdminSection = async (
  programId: number,
  payload: AdminSectionUpsertPayload,
): Promise<AdminCurriculumSection> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCurriculumSection>>(
      `/api/v1/admin/programs/${String(programId)}/sections`,
      normalizeSectionPayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '섹션을 추가하지 못했습니다.');
  }
};

export const updateAdminSection = async (
  sectionId: number,
  payload: AdminSectionUpsertPayload,
): Promise<AdminCurriculumSection> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminCurriculumSection>>(
      `/api/v1/admin/sections/${String(sectionId)}`,
      normalizeSectionPayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '섹션을 수정하지 못했습니다.');
  }
};

export const deleteAdminSection = async (sectionId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/sections/${String(sectionId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '섹션을 삭제하지 못했습니다.');
  }
};

export const reorderAdminSections = async (
  programId: number,
  items: readonly AdminSortOrderItem[],
): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/admin/programs/${String(programId)}/sections/reorder`, {
      items,
    });
  } catch (error: unknown) {
    throw toApiError(error, '섹션 순서를 변경하지 못했습니다.');
  }
};

export const createAdminLecture = async (
  sectionId: number,
  payload: AdminLectureUpsertPayload,
): Promise<AdminCurriculumLecture> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCurriculumLecture>>(
      `/api/v1/admin/sections/${String(sectionId)}/lectures`,
      normalizeLecturePayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '강의를 추가하지 못했습니다.');
  }
};

export const updateAdminLecture = async (
  lectureId: number,
  payload: AdminLectureUpsertPayload,
): Promise<AdminCurriculumLecture> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminCurriculumLecture>>(
      `/api/v1/admin/lectures/${String(lectureId)}`,
      normalizeLecturePayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '강의를 수정하지 못했습니다.');
  }
};

export const deleteAdminLecture = async (lectureId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/lectures/${String(lectureId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '강의를 삭제하지 못했습니다.');
  }
};

export const publishAdminLecture = async (lectureId: number): Promise<AdminCurriculumLecture> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCurriculumLecture>>(
      `/api/v1/admin/lectures/${String(lectureId)}/publish`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '강의를 발행하지 못했습니다.');
  }
};

export const unpublishAdminLecture = async (lectureId: number): Promise<AdminCurriculumLecture> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCurriculumLecture>>(
      `/api/v1/admin/lectures/${String(lectureId)}/unpublish`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '강의 발행을 해제하지 못했습니다.');
  }
};

export const reorderAdminLectures = async (
  sectionId: number,
  items: readonly AdminSortOrderItem[],
): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/admin/sections/${String(sectionId)}/lectures/reorder`, {
      items,
    });
  } catch (error: unknown) {
    throw toApiError(error, '강의 순서를 변경하지 못했습니다.');
  }
};

export const replaceAdminLectureOfflineSchedules = async (
  lectureId: number,
  payload: AdminLectureOfflineSchedulesReplacePayload,
): Promise<AdminCurriculumLecture> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminCurriculumLecture>>(
      `/api/v1/admin/lectures/${String(lectureId)}/offline-schedules`,
      normalizeOfflineSchedulesPayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '현장 강의 일정을 저장하지 못했습니다.');
  }
};

export const deleteAdminLectureOfflineSchedules = async (
  lectureId: number,
): Promise<AdminCurriculumLecture> => {
  try {
    const response = await axiosInstance.delete<ApiEnvelope<AdminCurriculumLecture>>(
      `/api/v1/admin/lectures/${String(lectureId)}/offline-schedules`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '현장 강의 일정을 삭제하지 못했습니다.');
  }
};
