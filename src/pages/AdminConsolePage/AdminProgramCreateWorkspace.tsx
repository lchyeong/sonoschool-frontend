/* eslint-disable @typescript-eslint/no-deprecated */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, MouseEvent as ReactMouseEvent } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Blocker } from 'react-router';
import { useBlocker } from 'react-router';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  createAdminProblemMediaUploadTarget,
  uploadAdminProblemMediaFile,
} from '@/api/adminProblemMedia';
import {
  createAdminProgramEditDraft,
  createAdminProgramDuplicateDraft,
  createAdminProgramDraft,
  discardAdminProgramDraft,
  finalizeAdminProgramDraft,
  updateDraftProblemQuestionMediaUploadState,
  updateDraftLectureVideoUploadState,
  updateDraftResourceUploadState,
  updateAdminProgramDraft,
} from '@/api/adminProgramDrafts';
import {
  createAdminProgramThumbnailUploadTarget,
  uploadAdminProgramThumbnailFile,
} from '@/api/adminProgramMedia';
import { createAdminResourceUploadTarget, uploadAdminResourceFile } from '@/api/adminResourceMedia';
import {
  completeAdminVideoUpload,
  createAdminVideoUploadSession,
  fetchAdminVideoStatus,
  startAdminVideoEncoding,
} from '@/api/adminVideos';
import checkIconSrc from '@/assets/icons/lucide_check.svg';
import AdminCategoryPicker from '@/components/admin/AdminCategoryPicker/AdminCategoryPicker';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import AdminFieldArray from '@/components/admin/AdminFieldArray/AdminFieldArray';
import AdminFileDropZone from '@/components/admin/AdminFileDropZone';
import AdminImageCropField, {
  DEFAULT_ADMIN_IMAGE_CROP,
  normalizeAdminImageCrop,
} from '@/components/admin/AdminImageCropField';
import { LoadingSpinner } from '@/components/feedback/Loading/LoadingSpinner';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { useAdminCategoriesTreeQuery } from '@/query/useAdminCategoriesQuery';
import { useAdminProblemAreasQuery } from '@/query/useAdminProblemAreasQuery';
import {
  adminProgramDraftDetailQueryKey,
  adminProgramDraftsQueryKey,
  useAdminProgramDraftDetailQuery,
} from '@/query/useAdminProgramDraftsQuery';
import { useAdminProgramEnrollmentsQuery } from '@/query/useAdminProgramOperationsQuery';
import {
  adminProgramsLiveQueryKey,
  useAdminProgramDetailLiveQuery,
} from '@/query/useAdminProgramsLiveQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminLectureType } from '@/types/adminCurriculum';
import type { AdminProblemMediaType } from '@/types/adminProblems';
import type {
  AdminDraftUploadStatus,
  AdminProgramDraftDetail,
  AdminProgramDraftLectureOfflineSchedule,
  AdminProgramDraftLecture,
  AdminProgramDraftPayload,
  AdminProgramDraftProblem,
  AdminProgramDraftProblemOption,
  AdminProgramDraftProblemQuestion,
  AdminProgramDraftResource,
  AdminProgramDraftSection,
} from '@/types/adminProgramDrafts';
import type { AdminProgramEnrollmentItem } from '@/types/adminProgramOperations';
import type {
  AdminProgramAccessPolicy,
  AdminProgramDetail,
  AdminProgramLevel,
  AdminProgramType,
} from '@/types/adminProgramsLive';
import type { AdminVideoEncodingProfile, AdminVideoProcessingStage } from '@/types/adminVideo';
import { classNames } from '@/utils/classNames';
import { formatIntegerInputValue, normalizeIntegerInputValue } from '@/utils/integerInputFormat';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  toMonthValue,
} from '@/utils/practicumCalendar';
import { isUnsafeStorageAssetUrl } from '@/utils/publicAssetUrl';
import { formatQuizOptionLabel } from '@/utils/quizOptionLabel';

import styles from './AdminConsolePage.module.scss';
import {
  PROGRAM_THUMBNAIL_FILE_ACCEPT,
  createViewportDragAutoScroller,
  validateProgramThumbnailFile,
} from './adminConsolePageShared';
import OfflineSchedulePlanner from './components/OfflineSchedulePlanner/OfflineSchedulePlanner';
import type { OfflineSchedulePlannerItem } from './components/OfflineSchedulePlanner/OfflineSchedulePlanner';
import {
  RESOURCE_DOCUMENT_WITH_IMAGE_ACCEPT,
  validateResourceDocumentWithImagePolicy,
} from './resourceDocumentPolicy';

const TARGET_PART_SIZE_BYTES = 32 * 1024 * 1024;
const VIDEO_PART_UPLOAD_CONCURRENCY = 4;
const VIDEO_ENCODING_POLL_INTERVAL_MS = 15000;
const VIDEO_ENCODING_MAX_POLL_ATTEMPTS = 360;
type SaveState = 'saved' | 'saving' | 'dirty' | 'error';
type AdminProgramCreateView = 'details' | 'curriculum' | 'problems' | 'resources';
type NumericBasicInfoField = 'maxStudents' | 'price';

interface DraftValidationIssue {
  errorKey?: string;
  focusKey?: string;
  message: string;
}

interface AdminProgramCreateWorkspaceProps {
  mode?: 'create' | 'duplicate' | 'edit';
  view?: AdminProgramCreateView;
}

interface AdminProgramSummaryFormItem {
  label: string;
  value: string;
}

interface AdminProgramFaqFormItem {
  answer: string;
  question: string;
}

interface CreateWorkspaceSnapshot {
  lastSavedAt: string | null;
  lastSavedPayload: string;
  payload: AdminProgramDraftPayload;
}

interface WorkspacePayloadResolution {
  lastSavedAt: string | null;
  lastSavedPayload: string;
  payload: AdminProgramDraftPayload;
}

type StructuredInfoField = 'learningOutcomes' | 'summaryItems';
type StructuredInfoItemKey = keyof AdminProgramSummaryFormItem;

const STRUCTURED_INFO_FIELD_LABELS: Record<StructuredInfoField, string> = {
  learningOutcomes: '학습 성과',
  summaryItems: '핵심 포인트',
};

const buildStructuredInfoFocusKey = (
  field: StructuredInfoField,
  index: number,
  key: StructuredInfoItemKey,
): string => `basic-${field}-${String(index)}-${key}`;

const buildStructuredInfoFinalizeIssues = (
  basicInfo: AdminProgramDraftPayload['basicInfo'],
): DraftValidationIssue[] => {
  const fields: StructuredInfoField[] = ['summaryItems', 'learningOutcomes'];

  return fields.flatMap((field) =>
    basicInfo[field].flatMap((item, index) => {
      const itemLabel = `${STRUCTURED_INFO_FIELD_LABELS[field]} ${String(index + 1)}`;
      const issues: DraftValidationIssue[] = [];

      if (!item.label.trim()) {
        issues.push({
          focusKey: buildStructuredInfoFocusKey(field, index, 'label'),
          message: `${itemLabel}: 제목을 입력해 주세요.`,
        });
      }
      if (!item.value.trim()) {
        issues.push({
          focusKey: buildStructuredInfoFocusKey(field, index, 'value'),
          message: `${itemLabel}: 설명을 입력해 주세요.`,
        });
      }

      return issues;
    }),
  );
};

interface PendingLocalFile {
  file: File;
  sizeLabel: string;
}

interface PendingQuestionMediaFile extends PendingLocalFile {
  previousMediaAssetId: number | null;
  previousMediaType: AdminProblemMediaType | null;
  previousMediaUploadErrorMessage: string | null;
  previousMediaUploadFileName: string | null;
  previousMediaUploadStatus: AdminDraftUploadStatus | null;
  previousMediaUrl: string | null;
  previousMediaVideoId: number | null;
}

interface PendingThumbnailFile extends PendingLocalFile {
  previewObjectUrl: string | null;
}

interface UploadProgressModalState {
  description: string;
  title: string;
}

interface DateRangePickerFieldProps {
  label: string;
  minDate?: string;
  resetLabel: string;
  startDate: string;
  endDate: string;
  valueText: string;
  onChange: (startDate: string, endDate: string) => void;
  onReset: () => void;
}

const LECTURE_TYPE_LABELS: Record<AdminLectureType, string> = {
  OFFLINE: '오프라인 강의',
  PRACTICUM: '실습 강의',
  PROBLEM: '문제풀이 강의',
  RESOURCE: '첨부자료',
  VIDEO: '영상 강의',
};

const ALLOWED_LECTURE_TYPES_BY_PROGRAM_TYPE: Record<AdminProgramType, AdminLectureType[]> = {
  HYBRID: ['VIDEO', 'PRACTICUM', 'PROBLEM', 'RESOURCE'],
  OFFLINE: ['VIDEO', 'OFFLINE', 'PROBLEM', 'RESOURCE'],
  ONLINE: ['VIDEO', 'PROBLEM', 'RESOURCE'],
  PROBLEM_SOLVING: ['PROBLEM', 'RESOURCE'],
};

const getAllowedLectureTypes = (programType: AdminProgramType | null): AdminLectureType[] => {
  return ALLOWED_LECTURE_TYPES_BY_PROGRAM_TYPE[programType ?? 'ONLINE'];
};

const getDefaultLectureType = (programType: AdminProgramType | null): AdminLectureType => {
  return getAllowedLectureTypes(programType)[0] ?? 'VIDEO';
};

const isProblemLecture = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'PROBLEM';
const isOfflineLecture = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'OFFLINE';
const isResourceLecture = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'RESOURCE';
const supportsLectureVideo = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'VIDEO';

const normalizeLectureByType = (lecture: AdminProgramDraftLecture): AdminProgramDraftLecture => {
  if (supportsLectureVideo(lecture)) {
    return lecture;
  }

  return {
    ...lecture,
    durationSeconds:
      isProblemLecture(lecture) || isOfflineLecture(lecture) ? null : lecture.durationSeconds,
    videoId: null,
    videoUploadErrorMessage: null,
    videoUploadFileName: null,
    videoUploadStatus: null,
  };
};

const createClientKey = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const asDraftArray = <T,>(items: readonly T[] | null | undefined): T[] => {
  return Array.isArray(items)
    ? (items as readonly T[]).filter((item) => item !== null && item !== undefined)
    : [];
};

const IDLE_NAVIGATION_BLOCKER: Pick<Blocker, 'proceed' | 'reset' | 'state'> = {
  proceed: undefined,
  reset: undefined,
  state: 'unblocked',
};

const createEmptyBasicInfo = (): AdminProgramDraftPayload['basicInfo'] => ({
  accessDays: null,
  accessPolicy: 'UNLIMITED',
  categoryId: null,
  checklists: [],
  description: null,
  faqs: [],
  learningEndAt: null,
  learningPoints: [],
  learningOutcomes: [],
  learningStartAt: null,
  level: null,
  maxStudents: null,
  price: null,
  programType: 'ONLINE',
  recommendedFor: [],
  saleEndAt: null,
  salePrice: null,
  saleStartAt: null,
  summaryItems: [],
  thumbnailCropOffsetX: DEFAULT_ADMIN_IMAGE_CROP.offsetX,
  thumbnailCropOffsetY: DEFAULT_ADMIN_IMAGE_CROP.offsetY,
  thumbnailCropZoom: DEFAULT_ADMIN_IMAGE_CROP.zoom,
  thumbnailPreviewUrl: null,
  thumbnailUrl: null,
  title: null,
});

const formatDiscountPercent = (price: number | null, salePrice: number | null): string => {
  if (price === null || salePrice === null || price <= 0 || salePrice >= price) {
    return '';
  }

  const percent = ((price - salePrice) / price) * 100;
  const rounded = Math.round(percent * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const calculateSalePriceFromPercent = (
  price: number | null,
  percentValue: string,
): number | null => {
  const normalizedPercent = percentValue.trim();
  if (price === null || price <= 0 || !normalizedPercent) {
    return null;
  }

  const percent = Number(normalizedPercent);
  if (!Number.isFinite(percent) || percent < 0) {
    return null;
  }

  const discountedPrice = Math.round(price * (1 - percent / 100));
  return discountedPrice < 0 ? 0 : discountedPrice;
};

const createEmptyQuestionOption = (
  sortOrder: number,
  correct = false,
): AdminProgramDraftProblemOption => ({
  correct,
  mediaType: null,
  mediaUrl: null,
  optionText: '',
  sortOrder,
});

const createFiveChoiceOptions = (): AdminProgramDraftProblemOption[] => {
  return Array.from({ length: 5 }, (_, index) => createEmptyQuestionOption(index, false));
};

const normalizeQuestionOptions = (
  options: readonly AdminProgramDraftProblemOption[],
): AdminProgramDraftProblemOption[] => {
  return Array.from({ length: 5 }, (_, index) => {
    const existing = options[index];
    return existing
      ? {
          ...existing,
          sortOrder: index,
        }
      : createEmptyQuestionOption(index, false);
  });
};

const resolveQuestionType = (options: readonly AdminProgramDraftProblemOption[]) => {
  const correctCount = options.filter((option) => option.correct).length;
  return correctCount > 1 ? 'MULTIPLE' : 'SINGLE';
};

const createEmptyQuestion = (): AdminProgramDraftProblemQuestion => ({
  explanation: null,
  mediaAssetId: null,
  mediaType: null,
  mediaUploadErrorMessage: null,
  mediaUploadFileName: null,
  mediaUploadStatus: null,
  mediaUrl: null,
  mediaVideoId: null,
  options: createFiveChoiceOptions(),
  problemAreaId: null,
  questionText: '',
  questionType: 'SINGLE',
  sortOrder: 0,
});

const createEmptyProblem = (lectureKey: string): AdminProgramDraftProblem => ({
  lectureKey,
  passScore: 80,
  problemAreaId: null,
  questions: [createEmptyQuestion()],
  retakeAllowed: false,
  timeLimitSeconds: null,
  title: '',
});

const calculatePassCorrectCount = (passScore: number, questionCount: number) => {
  if (passScore <= 0 || questionCount <= 0) {
    return 0;
  }

  return Math.ceil((questionCount * Math.min(passScore, 100)) / 100);
};

const summarizeProblemQuestionText = (value: string | null | undefined): string => {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  return normalized || '문제 내용을 입력해 주세요.';
};

const createEmptyLecture = (
  sortOrder: number,
  lectureType: AdminLectureType = 'VIDEO',
): AdminProgramDraftSection['lectures'][number] => ({
  description: null,
  durationSeconds: null,
  key: createClientKey('lecture'),
  lectureType,
  offlineSchedules: [],
  preview: false,
  published: true,
  sortOrder,
  title: '',
  videoId: null,
  videoUploadErrorMessage: null,
  videoUploadFileName: null,
  videoUploadStatus: null,
});

const createEmptySection = (sortOrder: number): AdminProgramDraftSection => ({
  description: null,
  key: createClientKey('section'),
  lectures: [],
  sortOrder,
  title: '',
});

const moveArrayItem = <T,>(items: readonly T[], fromIndex: number, toIndex: number): T[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }

  const next = [...items];
  const [movedItem] = next.splice(fromIndex, 1);

  if (movedItem === undefined) {
    return [...items];
  }

  next.splice(toIndex, 0, movedItem);
  return next;
};

const resolveMovedQuestionIndex = (index: number, fromIndex: number, toIndex: number): number => {
  if (index === fromIndex) {
    return toIndex;
  }

  if (fromIndex < toIndex && index > fromIndex && index <= toIndex) {
    return index - 1;
  }

  if (toIndex < fromIndex && index >= toIndex && index < fromIndex) {
    return index + 1;
  }

  return index;
};

const remapQuestionIndexedKeys = (
  keys: readonly string[],
  lectureKey: string,
  fromIndex: number,
  toIndex: number,
): string[] => {
  const prefix = `${lectureKey}:`;

  return keys.map((key) => {
    if (!key.startsWith(prefix)) {
      return key;
    }

    const currentIndex = Number(key.slice(prefix.length));
    if (!Number.isInteger(currentIndex)) {
      return key;
    }

    return `${prefix}${String(resolveMovedQuestionIndex(currentIndex, fromIndex, toIndex))}`;
  });
};

const remapQuestionIndexedRecord = <T,>(
  record: Record<string, T>,
  lectureKey: string,
  fromIndex: number,
  toIndex: number,
): Record<string, T> => {
  const prefix = `${lectureKey}:`;
  const next: Record<string, T> = {};

  for (const [key, value] of Object.entries(record)) {
    if (!key.startsWith(prefix)) {
      next[key] = value;
      continue;
    }

    const currentIndex = Number(key.slice(prefix.length));
    const nextIndex = Number.isInteger(currentIndex)
      ? resolveMovedQuestionIndex(currentIndex, fromIndex, toIndex)
      : currentIndex;
    next[Number.isInteger(nextIndex) ? `${prefix}${String(nextIndex)}` : key] = value;
  }

  return next;
};

const createEmptyResource = (lectureKey: string, sortOrder: number): AdminProgramDraftResource => ({
  description: null,
  fileName: null,
  fileSize: null,
  fileUrl: null,
  key: createClientKey('resource'),
  lectureKey,
  mimeType: null,
  sortOrder,
  title: '',
  uploadErrorMessage: null,
  uploadStatus: null,
  visibility: 'ENROLLED_ONLY',
});

const createEmptyPayload = (): AdminProgramDraftPayload => ({
  basicInfo: createEmptyBasicInfo(),
  problems: [],
  resources: [],
  sections: [createEmptySection(0)],
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const calculateAccessDaysFromLearningRange = (
  learningStartAt: string | null,
  learningEndAt: string | null,
): number | null => {
  if (!learningStartAt || !learningEndAt) {
    return null;
  }

  const startTime = new Date(learningStartAt).getTime();
  const endTime = new Date(learningEndAt).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return null;
  }

  return Math.max(1, Math.ceil((endTime - startTime) / MS_PER_DAY));
};

const isValidDateRange = (startAt: string | null, endAt: string | null): boolean => {
  if (!startAt || !endAt) {
    return false;
  }

  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();

  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime;
};

const normalizeDraftBasicInfo = (
  basicInfo: AdminProgramDraftPayload['basicInfo'] | null | undefined,
): AdminProgramDraftPayload['basicInfo'] => {
  const normalizeSummaryItems = (
    items: AdminProgramSummaryFormItem[] | null | undefined,
  ): AdminProgramSummaryFormItem[] =>
    asDraftArray(items).map((item) => ({
      label: typeof item?.label === 'string' ? item.label : '',
      value: typeof item?.value === 'string' ? item.value : '',
    }));
  const safeBasicInfo = {
    ...createEmptyBasicInfo(),
    ...basicInfo,
    checklists: asDraftArray(basicInfo?.checklists),
    faqs: asDraftArray(basicInfo?.faqs),
    learningOutcomes: normalizeSummaryItems(basicInfo?.learningOutcomes),
    learningPoints: asDraftArray(basicInfo?.learningPoints),
    recommendedFor: asDraftArray(basicInfo?.recommendedFor),
    summaryItems: normalizeSummaryItems(basicInfo?.summaryItems),
  };
  const thumbnailCrop = normalizeAdminImageCrop({
    offsetX: safeBasicInfo.thumbnailCropOffsetX ?? DEFAULT_ADMIN_IMAGE_CROP.offsetX,
    offsetY: safeBasicInfo.thumbnailCropOffsetY ?? DEFAULT_ADMIN_IMAGE_CROP.offsetY,
    zoom: safeBasicInfo.thumbnailCropZoom ?? DEFAULT_ADMIN_IMAGE_CROP.zoom,
  });

  return {
    ...safeBasicInfo,
    accessDays:
      safeBasicInfo.accessPolicy === 'FIXED_DURATION'
        ? calculateAccessDaysFromLearningRange(
            safeBasicInfo.learningStartAt,
            safeBasicInfo.learningEndAt,
          )
        : safeBasicInfo.accessPolicy === 'ROLLING_DAYS'
          ? safeBasicInfo.accessDays
          : null,
    learningEndAt:
      safeBasicInfo.accessPolicy === 'ROLLING_DAYS' ? null : safeBasicInfo.learningEndAt,
    learningStartAt:
      safeBasicInfo.accessPolicy === 'ROLLING_DAYS' ? null : safeBasicInfo.learningStartAt,
    thumbnailCropOffsetX: thumbnailCrop.offsetX,
    thumbnailCropOffsetY: thumbnailCrop.offsetY,
    thumbnailCropZoom: thumbnailCrop.zoom,
  };
};

const normalizeLegacyOfflineSchedules = (
  lecture: AdminProgramDraftLecture & {
    offlineScheduleRule?: {
      endTime?: string | null;
      location?: string | null;
      notes?: string | null;
      startDate?: string | null;
      startTime?: string | null;
    } | null;
  },
): AdminProgramDraftLectureOfflineSchedule[] => {
  const currentSchedules = asDraftArray(lecture.offlineSchedules);
  if (currentSchedules.length > 0) {
    return [currentSchedules[0]];
  }

  const legacyRule = lecture.offlineScheduleRule;
  if (!legacyRule) {
    return [];
  }

  const migratedSchedule: AdminProgramDraftLectureOfflineSchedule = {
    date: legacyRule.startDate ?? null,
    endTime: legacyRule.endTime ?? null,
    location: legacyRule.location ?? null,
    notes: legacyRule.notes ?? null,
    startTime: legacyRule.startTime ?? null,
  };

  if (
    !migratedSchedule.date &&
    !migratedSchedule.startTime &&
    !migratedSchedule.endTime &&
    !migratedSchedule.location &&
    !migratedSchedule.notes
  ) {
    return [];
  }

  return [migratedSchedule];
};

const normalizeDraftPayloadShape = (
  payload: AdminProgramDraftPayload | null | undefined,
): AdminProgramDraftPayload => {
  const basicInfo = normalizeDraftBasicInfo(payload?.basicInfo);
  const sections = asDraftArray(payload?.sections).map((section, sectionIndex) => ({
    ...section,
    key: section.key || createClientKey('section'),
    lectures: asDraftArray(section.lectures).map((lecture, lectureIndex) =>
      normalizeLectureByType({
        ...lecture,
        key: lecture.key || createClientKey('lecture'),
        lectureType: lecture.lectureType ?? getDefaultLectureType(basicInfo.programType),
        offlineSchedules: normalizeLegacyOfflineSchedules(lecture),
        preview: lecture.preview ?? false,
        published: lecture.published ?? true,
        sortOrder: lecture.sortOrder ?? lectureIndex,
        videoUploadErrorMessage: lecture.videoUploadErrorMessage ?? null,
        videoUploadFileName: lecture.videoUploadFileName ?? null,
        videoUploadStatus: lecture.videoUploadStatus ?? null,
      }),
    ),
    sortOrder: section.sortOrder ?? sectionIndex,
  }));
  const lectures = sections.flatMap((section) => section.lectures);

  return {
    ...(payload ?? createEmptyPayload()),
    basicInfo,
    problems: asDraftArray(payload?.problems)
      .filter((problem) => Boolean(problem.lectureKey))
      .map((problem) => {
        const matchedLecture = lectures.find((lecture) => lecture.key === problem.lectureKey);
        const lectureTitle = matchedLecture?.title?.trim();

        return {
          ...problem,
          passScore: problem.passScore ?? 80,
          problemAreaId: problem.problemAreaId ?? null,
          retakeAllowed: problem.retakeAllowed ?? false,
          timeLimitSeconds: problem.timeLimitSeconds ?? matchedLecture?.durationSeconds ?? null,
          title: problem.title?.trim() || lectureTitle || '문제',
          questions: asDraftArray(problem.questions).map((question, questionIndex) => ({
            ...question,
            mediaUploadErrorMessage: question.mediaUploadErrorMessage ?? null,
            mediaUploadFileName: question.mediaUploadFileName ?? null,
            mediaUploadStatus: normalizeQuestionMediaUploadStatus(question),
            mediaVideoId: question.mediaVideoId ?? null,
            options: asDraftArray(question.options),
            problemAreaId: question.problemAreaId ?? null,
            questionText: question.questionText ?? '',
            sortOrder: question.sortOrder ?? questionIndex,
          })),
        };
      }),
    resources: asDraftArray(payload?.resources)
      .filter((resource) => Boolean(resource.lectureKey))
      .map((resource, resourceIndex) => ({
        ...resource,
        key: resource.key || createClientKey('resource'),
        sortOrder: resource.sortOrder ?? resourceIndex,
        uploadErrorMessage: resource.uploadErrorMessage ?? null,
        uploadStatus: resource.uploadStatus ?? null,
      })),
    sections,
  };
};

const hasActiveVideoUpload = (lecture: AdminProgramDraftLecture): boolean =>
  lecture.videoUploadStatus === 'UPLOADING' || lecture.videoUploadStatus === 'PROCESSING';

const isVideoLectureMissingUpload = (lecture: AdminProgramDraftLecture): boolean =>
  supportsLectureVideo(lecture) && lecture.videoId === null && !hasActiveVideoUpload(lecture);

const shouldAutoHideVideoLectureOnFinalize = (lecture: AdminProgramDraftLecture): boolean =>
  isVideoLectureMissingUpload(lecture) && lecture.published;

const countVideoLecturesToAutoHideOnFinalize = (payload: AdminProgramDraftPayload): number =>
  payload.sections.reduce(
    (count, section) =>
      count +
      section.lectures.filter((lecture) => shouldAutoHideVideoLectureOnFinalize(lecture)).length,
    0,
  );

const preparePayloadForFinalize = (payload: AdminProgramDraftPayload): AdminProgramDraftPayload =>
  normalizeDraftPayloadShape({
    ...payload,
    sections: payload.sections.map((section) => ({
      ...section,
      lectures: section.lectures.map((lecture) => {
        if (!isVideoLectureMissingUpload(lecture)) {
          return lecture;
        }

        return {
          ...lecture,
          durationSeconds: null,
          published: false,
          videoUploadErrorMessage: null,
          videoUploadFileName: null,
          videoUploadStatus: null,
        };
      }),
    })),
  });

const mergeServerUploadStateIntoSnapshot = (
  snapshotPayload: AdminProgramDraftPayload,
  serverPayload: AdminProgramDraftPayload,
): AdminProgramDraftPayload => {
  const serverLecturesByKey = new Map(
    serverPayload.sections
      .flatMap((section) => section.lectures)
      .map((lecture) => [lecture.key, lecture]),
  );
  const serverProblemsByLectureKey = new Map(
    serverPayload.problems.map((problem) => [problem.lectureKey, problem]),
  );
  const serverResourcesByKey = new Map(
    serverPayload.resources.map((resource) => [resource.key, resource]),
  );

  return mergeServerThumbnailPreview(
    {
      ...snapshotPayload,
      problems: snapshotPayload.problems.map((problem) => {
        const serverProblem = serverProblemsByLectureKey.get(problem.lectureKey);
        if (!serverProblem) {
          return problem;
        }

        return {
          ...problem,
          questions: problem.questions.map((question, index) => {
            const serverQuestion = serverProblem.questions[index];
            if (!serverQuestion) {
              return question;
            }

            return {
              ...question,
              mediaAssetId: serverQuestion.mediaAssetId,
              mediaUploadErrorMessage: serverQuestion.mediaUploadErrorMessage,
              mediaUploadFileName: serverQuestion.mediaUploadFileName,
              mediaUploadStatus: serverQuestion.mediaUploadStatus,
              mediaUrl: serverQuestion.mediaUrl,
              mediaVideoId: serverQuestion.mediaVideoId,
            };
          }),
        };
      }),
      resources: snapshotPayload.resources.map((resource) => {
        const serverResource = serverResourcesByKey.get(resource.key);
        if (!serverResource) {
          return resource;
        }

        return {
          ...resource,
          fileName: serverResource.fileName,
          fileSize: serverResource.fileSize,
          fileUrl: serverResource.fileUrl,
          mimeType: serverResource.mimeType,
          uploadErrorMessage: serverResource.uploadErrorMessage,
          uploadStatus: serverResource.uploadStatus,
        };
      }),
      sections: snapshotPayload.sections.map((section) => ({
        ...section,
        lectures: section.lectures.map((lecture) => {
          const serverLecture = serverLecturesByKey.get(lecture.key);
          if (!serverLecture) {
            return lecture;
          }

          return {
            ...lecture,
            durationSeconds: serverLecture.durationSeconds,
            videoId: serverLecture.videoId,
            videoUploadErrorMessage: serverLecture.videoUploadErrorMessage,
            videoUploadFileName: serverLecture.videoUploadFileName,
            videoUploadStatus: serverLecture.videoUploadStatus,
          };
        }),
      })),
    },
    serverPayload,
  );
};

const mergeServerThumbnailPreview = (
  targetPayload: AdminProgramDraftPayload,
  serverPayload: AdminProgramDraftPayload,
): AdminProgramDraftPayload => {
  const serverThumbnailPreviewUrl = serverPayload.basicInfo.thumbnailPreviewUrl;

  if (!serverThumbnailPreviewUrl) {
    return targetPayload;
  }

  const targetThumbnailUrl = targetPayload.basicInfo.thumbnailUrl;
  const serverThumbnailUrl = serverPayload.basicInfo.thumbnailUrl;
  const targetThumbnailPreviewUrl = targetPayload.basicInfo.thumbnailPreviewUrl;
  const shouldUseServerPreview =
    targetThumbnailUrl === serverThumbnailUrl ||
    !targetThumbnailPreviewUrl ||
    isUnsafeStorageAssetUrl(targetThumbnailPreviewUrl);

  if (!shouldUseServerPreview) {
    return targetPayload;
  }

  return {
    ...targetPayload,
    basicInfo: {
      ...targetPayload.basicInfo,
      thumbnailPreviewUrl: serverThumbnailPreviewUrl,
      thumbnailUrl: serverThumbnailUrl ?? targetThumbnailUrl,
    },
  };
};

const reindexDraftResources = (
  resources: readonly AdminProgramDraftResource[],
): AdminProgramDraftResource[] => {
  const nextSortOrderByLecture = new Map<string, number>();

  return resources.map((resource) => {
    const nextSortOrder = nextSortOrderByLecture.get(resource.lectureKey) ?? 0;
    nextSortOrderByLecture.set(resource.lectureKey, nextSortOrder + 1);
    return {
      ...resource,
      sortOrder: nextSortOrder,
    };
  });
};

const LECTURE_TYPE_SHORT_LABELS: Record<AdminLectureType, string> = {
  OFFLINE: '오프라인',
  PRACTICUM: '실습',
  PROBLEM: '문제',
  RESOURCE: '첨부자료',
  VIDEO: '영상',
};

const getCurriculumGuideText = (programType: AdminProgramType | null): string => {
  switch (programType) {
    case 'OFFLINE':
      return '각 섹션 안에서 영상 강의, 오프라인 강의, 문제풀이 강의, 첨부자료를 구성합니다.';
    case 'HYBRID':
      return '각 섹션 안에서 영상 강의, 실습 강의, 문제풀이 강의, 첨부자료를 구성합니다.';
    case 'PROBLEM_SOLVING':
      return '각 섹션 안에서 문제풀이 강의와 첨부자료만 구성합니다.';
    case 'ONLINE':
    default:
      return '각 섹션 안에서 영상 강의, 문제풀이 강의, 첨부자료를 구성합니다.';
  }
};

const formatDraftDurationLabel = (durationSeconds: number | null): string => {
  if (durationSeconds === null || durationSeconds <= 0) {
    return '자동 반영 대기';
  }

  const totalMinutes = Math.ceil(durationSeconds / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${String(hours)}시간 ${String(minutes)}분`;
  }
  if (hours > 0) {
    return `${String(hours)}시간`;
  }

  return `${String(totalMinutes)}분`;
};

const formatDurationMinutesInput = (durationSeconds: number | null): string => {
  if (durationSeconds === null) {
    return '';
  }

  return String(Math.ceil(durationSeconds / 60));
};

const parseDurationMinutesInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed) * 60;
};

const formatDraftLectureCardLabel = (
  lectureIndex: number,
  lectureType: AdminLectureType,
): string => {
  return `강의 ${String(lectureIndex + 1)}-${LECTURE_TYPE_SHORT_LABELS[lectureType]}`;
};

const formatFileSizeInMb = (bytes: number | null): string => {
  if (bytes === null || bytes <= 0) {
    return '';
  }

  return (bytes / (1024 * 1024)).toFixed(1);
};

const deriveResourceTitleFromFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\.[^./\\]+$/, '');
};

const formatUploadStatusLabel = (
  status: AdminDraftUploadStatus | null,
  readyFallback: string,
  errorMessage?: string | null,
): string => {
  if (status === 'UPLOADING') {
    return '업로드 중';
  }
  if (status === 'PROCESSING') {
    return '인코딩 중';
  }
  if (status === 'READY') {
    return readyFallback;
  }
  if (status === 'FAILED') {
    return errorMessage?.trim() || '업로드 실패';
  }
  return '미설정';
};

const isUploadInProgress = (status: AdminDraftUploadStatus | null): boolean =>
  status === 'UPLOADING' || status === 'PROCESSING';

const formatVideoProcessingStageLabel = (
  processingStage: AdminVideoProcessingStage | null | undefined,
): string => {
  if (processingStage === 'STREAMING_UPLOAD') {
    return '스트리밍 파일 업로드 중';
  }
  return '인코딩 중';
};

const normalizeQuestionMediaUploadStatus = (
  question: Pick<
    AdminProgramDraftProblemQuestion,
    'mediaAssetId' | 'mediaUploadStatus' | 'mediaVideoId'
  >,
): AdminDraftUploadStatus | null => {
  if (question.mediaUploadStatus) {
    return question.mediaUploadStatus;
  }
  return question.mediaAssetId || question.mediaVideoId ? 'READY' : null;
};

const programTypeOptions = [
  { value: 'ONLINE', label: '온라인' },
  { value: 'OFFLINE', label: '오프라인' },
  { value: 'HYBRID', label: '실습예약 프로그램' },
  { value: 'PROBLEM_SOLVING', label: '문제풀이' },
] as const;

const levelOptions = [
  { value: '', label: '선택 안 함' },
  { value: 'BEGINNER', label: '입문' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '심화' },
] as const;

const accessPolicyOptions = [
  { value: 'UNLIMITED', label: '무제한' },
  { value: 'FIXED_DURATION', label: '지정 기간' },
  { value: 'ROLLING_DAYS', label: '결제일 기준' },
] as const;

const PROGRAM_CREATE_WORKSPACE_PATH_PREFIX = routePaths.adminProgramCreate;
const PROGRAM_EDIT_WORKSPACE_PATH_PATTERN =
  /^\/admin\/programs\/[^/]+\/(edit|curriculum|problems|resources)$/;

const toDateInputValue = (value: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(year)}-${month}-${day}`;
};

const toOfflinePlannerSchedules = (
  schedules: AdminProgramDraftLectureOfflineSchedule[],
): OfflineSchedulePlannerItem[] =>
  schedules[0]
    ? [
        {
          date: schedules[0].date ?? '',
          endTime: schedules[0].endTime ?? '',
          location: schedules[0].location ?? '',
          notes: schedules[0].notes ?? '',
          startTime: schedules[0].startTime ?? '',
        },
      ]
    : [];

const toDraftOfflineSchedules = (
  schedules: OfflineSchedulePlannerItem[],
): AdminProgramDraftLectureOfflineSchedule[] =>
  schedules.slice(0, 1).map((schedule) => ({
    date: schedule.date || null,
    endTime: schedule.endTime || null,
    location: schedule.location.trim() || null,
    notes: schedule.notes.trim() || null,
    startTime: schedule.startTime || null,
  }));

const toStartOfDayIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toEndOfDayIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toEndOfDayMinuteIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T23:59:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const addMonths = (value: Date, amount: number): Date => {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
};

const formatProgramRecruitmentRangeText = (startDate: string, endDate: string): string => {
  if (!startDate && !endDate) {
    return '상시 모집';
  }

  if (startDate && endDate) {
    return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  }

  if (startDate) {
    return `${formatDate(startDate)}부터`;
  }

  return `${formatDate(endDate)}까지`;
};

const formatProgramLearningRangeText = (startDate: string, endDate: string): string => {
  if (!startDate && !endDate) {
    return '수강 기간 선택';
  }

  if (startDate && endDate) {
    return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  }

  if (startDate) {
    return `${formatDate(startDate)}부터`;
  }

  return `${formatDate(endDate)}까지`;
};

const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  if (!startDate) {
    return false;
  }

  if (!endDate) {
    return date === startDate;
  }

  return date >= startDate && date <= endDate;
};

const DateRangePickerField = ({
  label,
  minDate,
  resetLabel,
  startDate,
  endDate,
  valueText,
  onChange,
  onReset,
}: DateRangePickerFieldProps) => {
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const rightCalendarMonth = useMemo(() => addMonths(calendarMonth, 1), [calendarMonth]);
  const leftCalendarCells = useMemo(
    () => buildCalendarCells(toMonthValue(calendarMonth)),
    [calendarMonth],
  );
  const rightCalendarCells = useMemo(
    () => buildCalendarCells(toMonthValue(rightCalendarMonth)),
    [rightCalendarMonth],
  );
  const previewEndDate =
    endDate || (startDate && hoveredDate && hoveredDate >= startDate ? hoveredDate : '');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredDate(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const handleDateSelect = (dateValue: string) => {
    if (!dateValue) {
      return;
    }

    if (!startDate || endDate || dateValue < startDate) {
      onChange(dateValue, '');
      return;
    }

    onChange(startDate, dateValue);
    setIsOpen(false);
    setHoveredDate(null);
  };

  return (
    <div className={styles['popupDateRangeField']}>
      <p className={styles['fieldLabel']}>{label}</p>
      <div className={styles['popupDateRangePicker']} ref={pickerRef}>
        <button
          className={classNames(
            styles['popupDateRangeTrigger'],
            isOpen && styles['popupDateRangeTriggerActive'],
          )}
          onClick={() => {
            setIsOpen((current) => !current);
          }}
          type='button'
        >
          <span aria-hidden='true' className={styles['popupDateRangeIcon']} />
          <span>{valueText}</span>
        </button>

        {isOpen ? (
          <div
            className={styles['popupDateRangePopover']}
            onMouseLeave={() => {
              setHoveredDate(null);
            }}
          >
            <div className={styles['popupDateRangeCalendarGrid']}>
              {[
                {
                  cells: leftCalendarCells,
                  key: 'left',
                  month: calendarMonth,
                },
                {
                  cells: rightCalendarCells,
                  key: 'right',
                  month: rightCalendarMonth,
                },
              ].map((calendar) => (
                <div className={styles['paymentDatePickerCalendarPanel']} key={calendar.key}>
                  <div className={styles['paymentDatePickerCalendarHead']}>
                    {calendar.key === 'left' ? (
                      <button
                        className={styles['paymentDatePickerNav']}
                        onClick={() => {
                          setCalendarMonth((previous) => addMonths(previous, -1));
                        }}
                        type='button'
                      >
                        이전
                      </button>
                    ) : (
                      <span className={styles['paymentDatePickerNavSpacer']} />
                    )}
                    <strong className={styles['paymentDatePickerMonthLabel']}>
                      {formatMonthLabel(toMonthValue(calendar.month))}
                    </strong>
                    {calendar.key === 'right' ? (
                      <button
                        className={styles['paymentDatePickerNav']}
                        onClick={() => {
                          setCalendarMonth((previous) => addMonths(previous, 1));
                        }}
                        type='button'
                      >
                        다음
                      </button>
                    ) : (
                      <span className={styles['paymentDatePickerNavSpacer']} />
                    )}
                  </div>
                  <div className={styles['paymentDatePickerWeekdays']}>
                    {calendarWeekdays.map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className={styles['paymentDatePickerDays']}>
                    {calendar.cells.map((cell, cellIndex) => {
                      const dateValue = cell.date ?? '';
                      const isSelectable =
                        cell.isCurrentMonth &&
                        Boolean(dateValue) &&
                        (!minDate || dateValue >= minDate);
                      const selectedStart = Boolean(dateValue) && dateValue === startDate;
                      const selectedEnd = Boolean(dateValue) && dateValue === endDate;
                      const inRange =
                        cell.isCurrentMonth &&
                        Boolean(dateValue) &&
                        isDateInRange(dateValue, startDate, previewEndDate);

                      return (
                        <button
                          className={classNames(
                            styles['paymentDatePickerDay'],
                            !cell.isCurrentMonth && styles['paymentDatePickerDayOutside'],
                            inRange && styles['paymentDatePickerDayInRange'],
                            selectedStart && styles['paymentDatePickerDaySelectedStart'],
                            selectedEnd && styles['paymentDatePickerDaySelectedEnd'],
                          )}
                          disabled={!isSelectable}
                          key={`${calendar.key}-${String(cellIndex)}-${dateValue}`}
                          onClick={() => {
                            handleDateSelect(dateValue);
                          }}
                          onMouseEnter={() => {
                            if (isSelectable) {
                              setHoveredDate(dateValue);
                            }
                          }}
                          type='button'
                        >
                          {dateValue ? Number(dateValue.split('-')[2]) : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles['popupDateRangeActions']}>
              <Button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                  setHoveredDate(null);
                }}
                size='sm'
                type='button'
                variant='secondary'
              >
                {resetLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const parseNonNegativeIntegerInput = (value: string, label: string) => {
  const trimmed = normalizeIntegerInputValue(value);
  if (!trimmed) {
    return { errorMessage: undefined, value: null };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { errorMessage: `${label}는 숫자만 입력해 주세요.`, value: null };
  }

  return { errorMessage: undefined, value: Number(trimmed) };
};

const parseDiscountPercentInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { errorMessage: undefined, value: null };
  }

  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return { errorMessage: '할인율은 숫자만 입력해 주세요.', value: null };
  }

  const percent = Number(trimmed);
  if (percent > 100) {
    return { errorMessage: '할인율은 100% 이하로 입력해 주세요.', value: null };
  }

  return { errorMessage: undefined, value: percent };
};

const buildBasicInfoInputValidationIssues = (
  basicInfo: AdminProgramDraftPayload['basicInfo'],
  numericInputValues: Record<NumericBasicInfoField, string>,
  discountPercentInput: string,
): DraftValidationIssue[] => {
  const issues: DraftValidationIssue[] = [];

  const priceValidation = parseNonNegativeIntegerInput(numericInputValues.price, '정가');
  if (numericInputValues.price.trim() && priceValidation.errorMessage) {
    issues.push({
      errorKey: 'price',
      focusKey: 'basic-price',
      message: priceValidation.errorMessage,
    });
  }

  const maxStudentsValidation = parseNonNegativeIntegerInput(
    numericInputValues.maxStudents,
    '정원',
  );
  if (numericInputValues.maxStudents.trim() && maxStudentsValidation.errorMessage) {
    issues.push({
      errorKey: 'maxStudents',
      focusKey: 'basic-max-students',
      message: maxStudentsValidation.errorMessage,
    });
  }

  const discountValidation = parseDiscountPercentInput(discountPercentInput);
  if (discountPercentInput.trim() && discountValidation.errorMessage) {
    issues.push({
      errorKey: 'discountPercent',
      focusKey: 'basic-discount-percent',
      message: discountValidation.errorMessage,
    });
  }

  if (
    basicInfo.accessPolicy === 'FIXED_DURATION' &&
    !isValidDateRange(basicInfo.saleStartAt, basicInfo.saleEndAt)
  ) {
    issues.push({
      errorKey: 'recruitmentRange',
      focusKey: 'basic-recruitment-range',
      message: '지정 기간 수강은 모집 시작일과 종료일을 입력해 주세요.',
    });
  }

  if (
    basicInfo.accessPolicy === 'FIXED_DURATION' &&
    calculateAccessDaysFromLearningRange(basicInfo.learningStartAt, basicInfo.learningEndAt) ===
      null
  ) {
    issues.push({
      errorKey: 'learningRange',
      focusKey: 'basic-learning-range',
      message: '지정 기간 수강은 수강 시작일과 종료일을 올바르게 입력해 주세요.',
    });
  }

  if (basicInfo.programType === 'OFFLINE' && basicInfo.accessPolicy === 'FIXED_DURATION') {
    const saleStartTime = Date.parse(basicInfo.saleStartAt ?? '');
    const saleEndTime = Date.parse(basicInfo.saleEndAt ?? '');
    const learningStartTime = Date.parse(basicInfo.learningStartAt ?? '');
    const learningEndTime = Date.parse(basicInfo.learningEndAt ?? '');

    if (
      Number.isFinite(saleStartTime) &&
      Number.isFinite(learningStartTime) &&
      saleStartTime > learningStartTime
    ) {
      issues.push({
        errorKey: 'recruitmentRange',
        focusKey: 'basic-recruitment-range',
        message: '모집 시작일은 수강 시작일보다 늦을 수 없습니다.',
      });
    }
    if (
      Number.isFinite(saleEndTime) &&
      Number.isFinite(learningEndTime) &&
      saleEndTime > learningEndTime
    ) {
      issues.push({
        errorKey: 'recruitmentRange',
        focusKey: 'basic-recruitment-range',
        message: '모집 종료일은 수강 종료일보다 늦을 수 없습니다.',
      });
    }
  }

  if (
    basicInfo.accessPolicy === 'ROLLING_DAYS' &&
    (basicInfo.accessDays === null || basicInfo.accessDays < 1)
  ) {
    issues.push({
      errorKey: 'accessDays',
      focusKey: 'basic-access-days',
      message: '결제일 기준 수강일수는 1일 이상 입력해 주세요.',
    });
  }

  return issues;
};

const buildDuplicatePeriodValidationIssues = (
  basicInfo: AdminProgramDraftPayload['basicInfo'],
  mode: AdminProgramCreateWorkspaceProps['mode'],
  now: number,
): DraftValidationIssue[] => {
  if (mode !== 'duplicate') {
    return [];
  }

  const issues: DraftValidationIssue[] = [];
  const saleEndTime = Date.parse(basicInfo.saleEndAt ?? '');
  const learningEndTime = Date.parse(basicInfo.learningEndAt ?? '');

  if (Number.isFinite(saleEndTime) && saleEndTime <= now) {
    issues.push({
      errorKey: 'recruitmentRange',
      focusKey: 'basic-recruitment-range',
      message: '새 기수 복제본의 모집 종료일은 현재 이후로 설정해 주세요.',
    });
  }

  if (Number.isFinite(learningEndTime) && learningEndTime <= now) {
    issues.push({
      errorKey: 'learningRange',
      focusKey: 'basic-learning-range',
      message: '새 기수 복제본의 수강 종료일은 현재 이후로 설정해 주세요.',
    });
  }

  return issues;
};

interface FixedDurationExtensionContext {
  previousLearningEndTime: number;
}

const resolveFixedDurationExtensionContext = (
  originalProgram: AdminProgramDetail,
  finalBasicInfo: AdminProgramDraftPayload['basicInfo'],
  now: number,
): FixedDurationExtensionContext | null => {
  if (
    originalProgram.accessPolicy !== 'FIXED_DURATION' ||
    finalBasicInfo.accessPolicy !== 'FIXED_DURATION'
  ) {
    return null;
  }

  const previousLearningEndTime = Date.parse(originalProgram.learningEndAt ?? '');
  const nextLearningEndTime = Date.parse(finalBasicInfo.learningEndAt ?? '');

  if (
    !Number.isFinite(previousLearningEndTime) ||
    !Number.isFinite(nextLearningEndTime) ||
    nextLearningEndTime <= previousLearningEndTime ||
    nextLearningEndTime <= now
  ) {
    return null;
  }

  if (originalProgram.operationStatus === 'CLOSURE_CONFIRMED') {
    const nextSaleEndTime = Date.parse(finalBasicInfo.saleEndAt ?? '');
    if (
      finalBasicInfo.programType !== 'OFFLINE' ||
      !Number.isFinite(nextSaleEndTime) ||
      nextSaleEndTime <= now
    ) {
      return null;
    }
  }

  return { previousLearningEndTime };
};

const countEnrollmentsReactivatedByFixedDurationExtension = (
  enrollments: readonly AdminProgramEnrollmentItem[],
  previousLearningEndTime: number,
  now: number,
): number => {
  return enrollments.filter((enrollment) => {
    if (enrollment.enrollmentStatus !== 'ACTIVE' && enrollment.enrollmentStatus !== 'EXPIRED') {
      return false;
    }

    const expireAt = Date.parse(enrollment.expireAt ?? '');
    if (!Number.isFinite(expireAt) || expireAt !== previousLearningEndTime) {
      return false;
    }

    return enrollment.enrollmentStatus === 'EXPIRED' || expireAt <= now;
  }).length;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '아직 저장되지 않음';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

const calculatePartCount = (fileSize: number): number => {
  return Math.max(1, Math.ceil(fileSize / TARGET_PART_SIZE_BYTES));
};

const stripETagQuotes = (value: string): string => value.replace(/^"+|"+$/g, '');

const isProgramCreateWorkspacePath = (pathname: string): boolean =>
  pathname === PROGRAM_CREATE_WORKSPACE_PATH_PREFIX ||
  pathname.startsWith(`${PROGRAM_CREATE_WORKSPACE_PATH_PREFIX}/`);

const isProgramWorkspacePath = (pathname: string): boolean =>
  isProgramCreateWorkspacePath(pathname) || PROGRAM_EDIT_WORKSPACE_PATH_PATTERN.test(pathname);

const buildCreateWorkspaceSnapshotKey = (draftId: number): string =>
  `admin-program-create-workspace:${String(draftId)}`;

const loadCreateWorkspaceSnapshot = (draftId: number): CreateWorkspaceSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(buildCreateWorkspaceSnapshotKey(draftId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CreateWorkspaceSnapshot;
  } catch {
    window.sessionStorage.removeItem(buildCreateWorkspaceSnapshotKey(draftId));
    return null;
  }
};

const saveCreateWorkspaceSnapshot = (draftId: number, snapshot: CreateWorkspaceSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(buildCreateWorkspaceSnapshotKey(draftId), JSON.stringify(snapshot));
};

const clearCreateWorkspaceSnapshot = (draftId: number | null) => {
  if (typeof window === 'undefined' || draftId === null) {
    return;
  }

  window.sessionStorage.removeItem(buildCreateWorkspaceSnapshotKey(draftId));
};

const uploadPart = async (uploadUrl: string, chunk: Blob, contentType: string): Promise<string> => {
  const response = await fetch(uploadUrl, {
    body: chunk,
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
    },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`영상 업로드에 실패했습니다. (${String(response.status)})`);
  }

  const eTag = response.headers.get('etag') ?? response.headers.get('ETag');
  if (!eTag) {
    throw new Error('영상 업로드는 완료됐지만 ETag를 읽지 못했습니다.');
  }

  return stripETagQuotes(eTag);
};

const formatProgressLabel = (
  label: string,
  progressPercent: number | null | undefined,
  showProgress: boolean,
): string => {
  if (!showProgress || progressPercent === null || progressPercent === undefined) {
    return label;
  }

  return `${label} ${String(Math.max(0, Math.min(100, Math.round(progressPercent))))}%`;
};

const buildVideoChunks = (
  file: File,
  parts: ReadonlyArray<{ partNumber: number; uploadUrl: string }>,
) => {
  const chunkSize = Math.ceil(file.size / parts.length);

  return parts.map((part, index) => {
    const start = index * chunkSize;
    const end = index === parts.length - 1 ? file.size : Math.min(start + chunkSize, file.size);

    return {
      blob: file.slice(start, end),
      partNumber: part.partNumber,
      uploadUrl: part.uploadUrl,
    };
  });
};

const uploadVideoChunks = async (
  chunks: ReturnType<typeof buildVideoChunks>,
  contentType: string,
  onProgress: (progressPercent: number) => void,
) => {
  const completedParts = new Array<{ eTag: string; partNumber: number }>(chunks.length);
  let nextIndex = 0;
  let completedUploadPartCount = 0;
  const workerCount = Math.min(VIDEO_PART_UPLOAD_CONCURRENCY, chunks.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (;;) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= chunks.length) {
          return;
        }

        const chunk = chunks[index];
        if (!chunk) {
          return;
        }
        const eTag = await uploadPart(chunk.uploadUrl, chunk.blob, contentType);
        completedParts[index] = {
          eTag,
          partNumber: chunk.partNumber,
        };
        completedUploadPartCount += 1;
        onProgress(Math.round((completedUploadPartCount / chunks.length) * 100));
      }
    }),
  );

  return completedParts;
};

const normalizePayloadFromDetail = (detail: AdminProgramDraftDetail): AdminProgramDraftPayload => {
  const nextPayload = normalizeDraftPayloadShape(detail.payload ?? createEmptyPayload());
  return {
    ...nextPayload,
    basicInfo: {
      ...createEmptyBasicInfo(),
      ...nextPayload.basicInfo,
      faqs: nextPayload.basicInfo?.faqs ?? [],
      checklists: nextPayload.basicInfo?.checklists ?? [],
      learningPoints: nextPayload.basicInfo?.learningPoints ?? [],
      learningOutcomes:
        nextPayload.basicInfo?.learningOutcomes ??
        (nextPayload.basicInfo?.learningPoints ?? []).map((item, index) => ({
          label: `학습 성과 ${String(index + 1)}`,
          value: item,
        })),
      accessPolicy: nextPayload.basicInfo?.accessPolicy ?? 'UNLIMITED',
      programType: nextPayload.basicInfo?.programType ?? 'ONLINE',
      recommendedFor: nextPayload.basicInfo?.recommendedFor ?? [],
      summaryItems: nextPayload.basicInfo?.summaryItems ?? [],
    },
    problems:
      nextPayload.problems?.map((problem) => ({
        ...problem,
        timeLimitSeconds: problem.timeLimitSeconds ?? null,
        questions: problem.questions.map((question) => ({
          ...question,
          mediaUploadErrorMessage: question.mediaUploadErrorMessage ?? null,
          mediaUploadFileName: question.mediaUploadFileName ?? null,
          mediaUploadStatus: normalizeQuestionMediaUploadStatus(question),
          options: normalizeQuestionOptions(question.options),
          questionType: resolveQuestionType(question.options),
        })),
      })) ?? [],
    sections: nextPayload.sections?.length
      ? nextPayload.sections.map((section) => ({
          ...section,
          lectures: section.lectures.map((lecture) =>
            normalizeLectureByType({
              ...lecture,
              lectureType:
                lecture.lectureType ??
                getDefaultLectureType(nextPayload.basicInfo?.programType ?? 'ONLINE'),
              offlineSchedules: lecture.offlineSchedules ?? [],
              videoUploadErrorMessage: lecture.videoUploadErrorMessage ?? null,
              videoUploadFileName: lecture.videoUploadFileName ?? null,
              videoUploadStatus: lecture.videoUploadStatus ?? null,
            }),
          ),
        }))
      : [createEmptySection(0)],
    resources: (nextPayload.resources ?? []).map((resource) => ({
      ...resource,
      key: resource.key ?? createClientKey('resource'),
      uploadErrorMessage: resource.uploadErrorMessage ?? null,
      uploadStatus: resource.uploadStatus ?? null,
    })),
  };
};

const serializeDraftPayloadForComparison = (payload: AdminProgramDraftPayload): string =>
  JSON.stringify(payload, (_key, value: unknown) => {
    if (value === null || Array.isArray(value) || typeof value !== 'object') {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
    );
  });

const areDraftPayloadsEqual = (
  left: AdminProgramDraftPayload,
  right: AdminProgramDraftPayload,
): boolean =>
  serializeDraftPayloadForComparison(left) === serializeDraftPayloadForComparison(right);

const resolveWorkspacePayload = (
  detail: AdminProgramDraftDetail,
  snapshot: CreateWorkspaceSnapshot | null,
): WorkspacePayloadResolution => {
  const serverPayload = normalizePayloadFromDetail(detail);
  const serverSerializedPayload = JSON.stringify(serverPayload);
  const serverResolution: WorkspacePayloadResolution = {
    lastSavedAt: detail.updatedAt,
    lastSavedPayload: serverSerializedPayload,
    payload: serverPayload,
  };

  if (!snapshot || !snapshot.payload || typeof snapshot.lastSavedPayload !== 'string') {
    return serverResolution;
  }

  let snapshotSavedPayload: AdminProgramDraftPayload;
  try {
    snapshotSavedPayload = normalizeDraftPayloadShape(
      JSON.parse(snapshot.lastSavedPayload) as AdminProgramDraftPayload,
    );
  } catch {
    return serverResolution;
  }

  const snapshotPayload = normalizeDraftPayloadShape(snapshot.payload);
  if (areDraftPayloadsEqual(snapshotPayload, snapshotSavedPayload)) {
    return serverResolution;
  }

  const currentServerBaseline = mergeServerUploadStateIntoSnapshot(
    snapshotSavedPayload,
    serverPayload,
  );
  if (!areDraftPayloadsEqual(currentServerBaseline, serverPayload)) {
    return serverResolution;
  }

  const restoredPayload = mergeServerUploadStateIntoSnapshot(snapshotPayload, serverPayload);
  if (areDraftPayloadsEqual(restoredPayload, serverPayload)) {
    return serverResolution;
  }

  return {
    lastSavedAt: detail.updatedAt,
    lastSavedPayload: serverSerializedPayload,
    payload: restoredPayload,
  };
};

const AdminProgramCreateWorkspace = ({
  mode = 'create',
  view = 'details',
}: AdminProgramCreateWorkspaceProps) => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const requestedDraftId = Number(searchParams.get('draftId') ?? '');
  const draftId =
    Number.isFinite(requestedDraftId) && requestedDraftId > 0 ? requestedDraftId : null;
  const requestedEditProgramId = Number(params['programId'] ?? '');
  const editProgramId =
    mode === 'edit' && Number.isFinite(requestedEditProgramId) && requestedEditProgramId > 0
      ? requestedEditProgramId
      : null;
  const requestedDuplicateSourceProgramId = Number(params['sourceProgramId'] ?? '');
  const duplicateSourceProgramId =
    mode === 'duplicate' &&
    Number.isFinite(requestedDuplicateSourceProgramId) &&
    requestedDuplicateSourceProgramId > 0
      ? requestedDuplicateSourceProgramId
      : null;
  const detailQuery = useAdminProgramDraftDetailQuery(draftId, draftId !== null);
  const originalProgramQuery = useAdminProgramDetailLiveQuery(editProgramId, mode === 'edit');
  const originalProgramEnrollmentsQuery = useAdminProgramEnrollmentsQuery(
    editProgramId,
    mode === 'edit',
  );
  const categoriesQuery = useAdminCategoriesTreeQuery(true);
  const problemAreasQuery = useAdminProblemAreasQuery(false);
  const problemAreas = useMemo(() => problemAreasQuery.data ?? [], [problemAreasQuery.data]);
  const rootProblemAreaOptions = useMemo(
    () =>
      problemAreas
        .filter((area) => area.active && area.parentId === null)
        .map((area) => ({
          label: area.name,
          value: String(area.id),
        })),
    [problemAreas],
  );
  const buildRootProblemAreaOptions = (selectedProblemAreaId: number | null) => {
    const options = rootProblemAreaOptions;
    if (
      selectedProblemAreaId === null ||
      options.some((option) => option.value === String(selectedProblemAreaId))
    ) {
      return options;
    }

    const selectedArea = problemAreas.find((area) => area.id === selectedProblemAreaId);

    return [
      ...options,
      {
        disabled: true,
        label: `${selectedArea?.name ?? String(selectedProblemAreaId)} (미사용)`,
        value: String(selectedProblemAreaId),
      },
    ];
  };
  const buildProblemAreaOptions = (
    rootProblemAreaId: number | null | undefined,
    selectedProblemAreaId: number | null,
  ) => {
    const childOptions = rootProblemAreaId
      ? problemAreas
          .filter((area) => area.active && area.parentId === rootProblemAreaId)
          .map((area) => ({
            label: area.name,
            value: String(area.id),
          }))
      : [];
    const options = childOptions;
    if (
      selectedProblemAreaId === null ||
      options.some((option) => option.value === String(selectedProblemAreaId))
    ) {
      return options;
    }

    const selectedArea = problemAreas.find((area) => area.id === selectedProblemAreaId);
    const isOutsideRoot =
      selectedArea?.parentId !== null && selectedArea?.parentId !== rootProblemAreaId;

    return [
      ...options,
      {
        disabled: true,
        label: `${selectedArea?.name ?? String(selectedProblemAreaId)} (${isOutsideRoot ? '문제영역 카테고리 불일치' : '미사용'})`,
        value: String(selectedProblemAreaId),
      },
    ];
  };
  const [payload, setPayload] = useState<AdminProgramDraftPayload | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [questionUploadStatus, setQuestionUploadStatus] = useState<Record<string, string>>({});
  const [pendingQuestionMediaSelections, setPendingQuestionMediaSelections] = useState<
    Record<string, PendingQuestionMediaFile>
  >({});
  const [pendingVideoSelections, setPendingVideoSelections] = useState<
    Record<string, PendingLocalFile>
  >({});
  const [lectureVideoProgressByKey, setLectureVideoProgressByKey] = useState<
    Record<string, number>
  >({});
  const [lectureVideoProcessingStageByKey, setLectureVideoProcessingStageByKey] = useState<
    Record<string, AdminVideoProcessingStage>
  >({});
  const [lectureVideoSizeLabels, setLectureVideoSizeLabels] = useState<Record<string, string>>({});
  const [pendingResourceSelections, setPendingResourceSelections] = useState<
    Record<string, PendingLocalFile>
  >({});
  const [pendingThumbnailSelection, setPendingThumbnailSelection] =
    useState<PendingThumbnailFile | null>(null);
  const [numericInputValues, setNumericInputValues] = useState<
    Record<NumericBasicInfoField, string>
  >({
    maxStudents: '',
    price: '',
  });
  const [discountPercentInput, setDiscountPercentInput] = useState('');
  const [basicInfoErrors, setBasicInfoErrors] = useState<Record<string, string | undefined>>({});
  const [expandedSectionKeys, setExpandedSectionKeys] = useState<string[]>([]);
  const [expandedLectureKeys, setExpandedLectureKeys] = useState<string[]>([]);
  const [collapsedProblemQuestionKeys, setCollapsedProblemQuestionKeys] = useState<string[]>([]);
  const [bulkProblemAreaLectureKey, setBulkProblemAreaLectureKey] = useState<string | null>(null);
  const [
    bulkProblemAreaQuestionIndexesByLectureKey,
    setBulkProblemAreaQuestionIndexesByLectureKey,
  ] = useState<Record<string, number[]>>({});
  const [bulkProblemAreaValueByLectureKey, setBulkProblemAreaValueByLectureKey] = useState<
    Record<string, string>
  >({});
  const [draggedProblemQuestion, setDraggedProblemQuestion] = useState<{
    lectureKey: string;
    questionIndex: number;
  } | null>(null);
  const [draftFocusHint, setDraftFocusHint] = useState<{
    message: string;
    x: number;
    y: number;
  } | null>(null);
  const [openLectureTypeMenuSectionKey, setOpenLectureTypeMenuSectionKey] = useState<string | null>(
    null,
  );
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadProgressModal, setUploadProgressModal] = useState<UploadProgressModalState | null>(
    null,
  );
  const [navigationDecisionState, setNavigationDecisionState] = useState<'idle' | 'saving'>('idle');
  const problemQuestionDragAutoScroller = useMemo(() => createViewportDragAutoScroller(), []);
  const hasRequestedDraftRef = useRef(false);
  const initializedDraftIdRef = useRef<number | null>(null);
  const lastSavedPayloadRef = useRef<string>('');
  const currentPayloadRef = useRef<AdminProgramDraftPayload | null>(null);
  const bypassNavigationBlockRef = useRef(false);
  const lectureTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const numericInputsInitializedForDraftRef = useRef<number | null>(null);
  const resumingVideoIdsRef = useRef<Set<number>>(new Set());
  const draftFocusHintTimerRef = useRef<number | null>(null);
  const draftAutoSaveTimerRef = useRef<number | null>(null);
  const draftSaveChainRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const finalizeAutoHiddenVideoCountRef = useRef(0);
  const invalidatedDraftIdRef = useRef<number | null>(null);
  const problemQuestionDragMovedRef = useRef(false);

  useEffect(
    () => () => {
      problemQuestionDragAutoScroller.stop();
      if (draftFocusHintTimerRef.current !== null) {
        window.clearTimeout(draftFocusHintTimerRef.current);
      }
      if (draftAutoSaveTimerRef.current !== null) {
        window.clearTimeout(draftAutoSaveTimerRef.current);
      }
    },
    [problemQuestionDragAutoScroller],
  );

  const createDraftMutation = useMutation({
    mutationFn: () => {
      if (mode === 'edit') {
        if (editProgramId === null) {
          throw new Error('수정할 프로그램을 찾지 못했습니다.');
        }
        return createAdminProgramEditDraft(editProgramId);
      }
      if (mode === 'duplicate') {
        if (duplicateSourceProgramId === null) {
          throw new Error('복제할 프로그램을 찾지 못했습니다.');
        }
        return createAdminProgramDuplicateDraft(duplicateSourceProgramId);
      }
      return createAdminProgramDraft();
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : mode === 'edit'
              ? '프로그램 수정 화면을 준비하지 못했습니다.'
              : mode === 'duplicate'
                ? '프로그램 복제 화면을 준비하지 못했습니다.'
                : '프로그램 초안을 생성하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (detail) => {
      const resolvedPayload = resolveWorkspacePayload(
        detail,
        loadCreateWorkspaceSnapshot(detail.id),
      );
      setPayload(resolvedPayload.payload);
      currentPayloadRef.current = resolvedPayload.payload;
      initializedDraftIdRef.current = detail.id;
      lastSavedPayloadRef.current = resolvedPayload.lastSavedPayload;
      setLastSavedAt(resolvedPayload.lastSavedAt);
      setSaveState(
        JSON.stringify(resolvedPayload.payload) === resolvedPayload.lastSavedPayload
          ? 'saved'
          : 'dirty',
      );
      setSearchParams({ draftId: String(detail.id) });
    },
  });

  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail || detail.status === 'ACTIVE' || invalidatedDraftIdRef.current === detail.id) {
      return;
    }

    invalidatedDraftIdRef.current = detail.id;
    clearCreateWorkspaceSnapshot(detail.id);
    initializedDraftIdRef.current = null;
    currentPayloadRef.current = null;
    lastSavedPayloadRef.current = '';
    numericInputsInitializedForDraftRef.current = null;
    hasRequestedDraftRef.current = false;
    setPayload(null);
    setLastSavedAt(null);
    setSaveState('saved');
    setBasicInfoErrors({});
    setSearchParams({}, { replace: true });
    showToast({
      message: '운영 일정이 변경되어 기존 수정 초안을 폐기했습니다. 최신 정보로 다시 불러옵니다.',
      variant: 'info',
    });
  }, [detailQuery.data, setSearchParams, showToast]);

  const saveMutation = useMutation({
    mutationFn: ({
      draftId: targetDraftId,
      nextPayload,
    }: {
      draftId: number;
      nextPayload: AdminProgramDraftPayload;
    }) => updateAdminProgramDraft(targetDraftId, nextPayload, { mode }),
    onError: (error: unknown) => {
      setSaveState('error');
      showToast({
        message:
          error instanceof Error
            ? error.message
            : mode === 'edit'
              ? '프로그램 수정 내용을 저장하지 못했습니다.'
              : '프로그램 초안을 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (detail, variables) => {
      const serverPayload = normalizePayloadFromDetail(detail);
      const savedPayload = mergeServerUploadStateIntoSnapshot(
        normalizeDraftPayloadShape(variables.nextPayload),
        serverPayload,
      );
      const savedSerializedPayload = JSON.stringify(savedPayload);
      lastSavedPayloadRef.current = savedSerializedPayload;
      setLastSavedAt(detail.updatedAt);
      const latestPayload = currentPayloadRef.current
        ? mergeServerUploadStateIntoSnapshot(currentPayloadRef.current, serverPayload)
        : savedPayload;
      currentPayloadRef.current = latestPayload;
      setPayload(latestPayload);
      const latestSerializedPayload = latestPayload
        ? JSON.stringify(latestPayload)
        : lastSavedPayloadRef.current;
      saveCreateWorkspaceSnapshot(detail.id, {
        lastSavedAt: detail.updatedAt,
        lastSavedPayload: savedSerializedPayload,
        payload: latestPayload ?? savedPayload,
      });
      setSaveState(latestSerializedPayload === savedSerializedPayload ? 'saved' : 'dirty');
      void queryClient.invalidateQueries({ queryKey: adminProgramDraftsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: adminProgramDraftDetailQueryKey(detail.id) });
    },
  });

  const saveCurrentDraftPayload = useCallback(
    (options?: {
      force?: boolean;
      payloadOverride?: AdminProgramDraftPayload | undefined;
    }): Promise<boolean> => {
      const runSave = async (): Promise<boolean> => {
        const sourcePayload = options?.payloadOverride ?? currentPayloadRef.current;
        if (draftId === null || sourcePayload === null) {
          return true;
        }

        const nextPayload = normalizeDraftPayloadShape(sourcePayload);
        if (nextPayload === null) {
          return false;
        }

        if (nextPayload !== currentPayloadRef.current) {
          currentPayloadRef.current = nextPayload;
          setPayload(nextPayload);
        }

        if (!options?.force && JSON.stringify(nextPayload) === lastSavedPayloadRef.current) {
          setSaveState('saved');
          return true;
        }

        setSaveState('saving');

        try {
          await saveMutation.mutateAsync({ draftId, nextPayload });
          return true;
        } catch {
          return false;
        }
      };

      const savePromise = draftSaveChainRef.current.then(runSave, runSave);
      draftSaveChainRef.current = savePromise.catch(() => false);
      return savePromise;
    },
    [draftId, saveMutation],
  );

  const scheduleDraftAutoSave = useCallback(
    (delayMs = 300) => {
      if (draftId === null) {
        return;
      }

      if (draftAutoSaveTimerRef.current !== null) {
        window.clearTimeout(draftAutoSaveTimerRef.current);
      }

      draftAutoSaveTimerRef.current = window.setTimeout(() => {
        draftAutoSaveTimerRef.current = null;

        void saveCurrentDraftPayload();
      }, delayMs);
    },
    [draftId, saveCurrentDraftPayload],
  );

  const finalizeMutation = useMutation({
    mutationFn: async (targetDraftId: number) => {
      const payloadForFinalize =
        currentPayloadRef.current === null
          ? null
          : preparePayloadForFinalize(currentPayloadRef.current);
      finalizeAutoHiddenVideoCountRef.current =
        currentPayloadRef.current === null
          ? 0
          : countVideoLecturesToAutoHideOnFinalize(currentPayloadRef.current);
      const saved = await flushPendingDraftSave({
        payloadOverride: payloadForFinalize ?? undefined,
      });
      if (!saved) {
        throw new Error('입력값 또는 업로드 항목을 확인해 주세요.');
      }
      return finalizeAdminProgramDraft(targetDraftId, { mode });
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : mode === 'edit'
              ? '프로그램 수정을 완료하지 못했습니다.'
              : '프로그램 등록을 완료하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, targetDraftId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
        queryClient.invalidateQueries({ queryKey: adminProgramDraftsQueryKey() }),
      ]);
      const autoHiddenVideoCount = finalizeAutoHiddenVideoCountRef.current;
      showToast({
        message:
          autoHiddenVideoCount > 0
            ? mode === 'edit'
              ? '프로그램 수정을 완료했습니다. 영상이 없는 영상 강의는 비공개로 저장되었습니다.'
              : '프로그램 등록을 완료했습니다. 영상이 없는 영상 강의는 비공개로 저장되었습니다.'
            : mode === 'edit'
              ? '프로그램 수정을 완료했습니다.'
              : '프로그램 등록을 완료했습니다. 숨김 상태로 생성되었습니다.',
        variant: 'success',
      });
      clearCreateWorkspaceSnapshot(targetDraftId);
      navigateWithoutPrompt(routePaths.adminPrograms);
    },
  });

  const discardMutation = useMutation({
    mutationFn: (targetDraftId: number) => discardAdminProgramDraft(targetDraftId, { mode }),
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : mode === 'edit'
              ? '프로그램 수정을 취소하지 못했습니다.'
              : '프로그램 초안을 폐기하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, targetDraftId) => {
      await queryClient.invalidateQueries({ queryKey: adminProgramDraftsQueryKey() });
      showToast({
        message:
          mode === 'edit' ? '프로그램 수정을 취소했습니다.' : '프로그램 초안을 폐기했습니다.',
        variant: 'success',
      });
      clearCreateWorkspaceSnapshot(targetDraftId);
      navigateWithoutPrompt(routePaths.adminPrograms);
    },
  });

  const hasUnsavedChanges =
    saveState === 'dirty' || saveState === 'saving' || saveState === 'error';
  const allowedLectureTypes = useMemo(
    () => getAllowedLectureTypes(payload?.basicInfo.programType ?? null),
    [payload?.basicInfo.programType],
  );
  const recruitmentStartDate = toDateInputValue(payload?.basicInfo.saleStartAt ?? null);
  const recruitmentEndDate = toDateInputValue(
    payload?.basicInfo.saleEndAt
      ? new Date(Date.parse(payload.basicInfo.saleEndAt) - 1).toISOString()
      : null,
  );
  const visibleRecruitmentRangeText = formatProgramRecruitmentRangeText(
    recruitmentStartDate,
    recruitmentEndDate,
  );
  const learningStartDate = toDateInputValue(payload?.basicInfo.learningStartAt ?? null);
  const learningEndDate = toDateInputValue(payload?.basicInfo.learningEndAt ?? null);
  const visibleLearningRangeText = formatProgramLearningRangeText(
    learningStartDate,
    learningEndDate,
  );
  const addLectureTriggerLabel = mode === 'edit' ? '강의 추가' : '새 강의 추가';
  const offlineScheduleMinDate = toDateInputValue(payload?.basicInfo.learningStartAt ?? null);
  const offlineScheduleMaxDate = toDateInputValue(payload?.basicInfo.learningEndAt ?? null);
  const hasOfflineSchedulePeriod =
    offlineScheduleMinDate.length > 0 && offlineScheduleMaxDate.length > 0;
  let navigationBlocker: Pick<Blocker, 'proceed' | 'reset' | 'state'> = IDLE_NAVIGATION_BLOCKER;

  try {
    // `useBlocker` is unavailable outside a data-router context in some test setups.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigationBlocker = useBlocker(
      ({ currentLocation, nextLocation }) =>
        !bypassNavigationBlockRef.current &&
        hasUnsavedChanges &&
        !(
          isProgramWorkspacePath(currentLocation.pathname) &&
          isProgramWorkspacePath(nextLocation.pathname)
        ) &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search ||
          currentLocation.hash !== nextLocation.hash),
    );
  } catch {
    navigationBlocker = IDLE_NAVIGATION_BLOCKER;
  }

  useEffect(() => {
    if (draftId !== null || hasRequestedDraftRef.current) {
      return;
    }

    hasRequestedDraftRef.current = true;
    createDraftMutation.mutate();
  }, [createDraftMutation, draftId, duplicateSourceProgramId, editProgramId, mode]);

  useEffect(() => {
    if (openLectureTypeMenuSectionKey === null) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!lectureTypeMenuRef.current?.contains(event.target as Node)) {
        setOpenLectureTypeMenuSectionKey(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenLectureTypeMenuSectionKey(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [openLectureTypeMenuSectionKey]);

  useEffect(() => {
    const detail = detailQuery.data ?? createDraftMutation.data;
    if (!detail || detail.status !== 'ACTIVE' || initializedDraftIdRef.current === detail.id) {
      return;
    }

    const resolvedPayload = resolveWorkspacePayload(detail, loadCreateWorkspaceSnapshot(detail.id));
    setPayload(resolvedPayload.payload);
    currentPayloadRef.current = resolvedPayload.payload;
    initializedDraftIdRef.current = detail.id;
    lastSavedPayloadRef.current = resolvedPayload.lastSavedPayload;
    setLastSavedAt(resolvedPayload.lastSavedAt);
    setSaveState(
      JSON.stringify(resolvedPayload.payload) === resolvedPayload.lastSavedPayload
        ? 'saved'
        : 'dirty',
    );
  }, [createDraftMutation.data, detailQuery.data]);

  useEffect(() => {
    if (draftId === null || payload === null || initializedDraftIdRef.current !== draftId) {
      return;
    }

    currentPayloadRef.current = payload;
    const serializedPayload = JSON.stringify(payload);
    saveCreateWorkspaceSnapshot(draftId, {
      lastSavedAt,
      lastSavedPayload: lastSavedPayloadRef.current,
      payload,
    });
    setSaveState(serializedPayload === lastSavedPayloadRef.current ? 'saved' : 'dirty');
  }, [draftId, lastSavedAt, payload]);

  useEffect(() => {
    if (
      draftId === null ||
      payload === null ||
      numericInputsInitializedForDraftRef.current === draftId
    ) {
      return;
    }

    numericInputsInitializedForDraftRef.current = draftId;
    setNumericInputValues({
      maxStudents:
        payload.basicInfo.maxStudents === null ? '' : String(payload.basicInfo.maxStudents),
      price: formatIntegerInputValue(payload.basicInfo.price),
    });
    setDiscountPercentInput(
      formatDiscountPercent(payload.basicInfo.price, payload.basicInfo.salePrice),
    );
    setBasicInfoErrors({});
  }, [draftId, payload]);

  useEffect(() => {
    const previewObjectUrl = pendingThumbnailSelection?.previewObjectUrl;

    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [pendingThumbnailSelection?.previewObjectUrl]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const updatePayload = useCallback(
    (updater: (current: AdminProgramDraftPayload) => AdminProgramDraftPayload) => {
      const current = currentPayloadRef.current;
      if (!current) {
        return null;
      }

      const next = updater(current);
      currentPayloadRef.current = next;
      setPayload(next);
      return next;
    },
    [],
  );

  const persistLectureVideoUploadState = useCallback(
    async (
      targetDraftId: number,
      lectureKey: string,
      payload: {
        durationSeconds?: number | null;
        errorMessage?: string | null;
        fileName?: string | null;
        status: AdminDraftUploadStatus;
        videoId?: number | null;
      },
    ) => {
      await updateDraftLectureVideoUploadState(targetDraftId, lectureKey, payload);
      await queryClient.invalidateQueries({
        queryKey: adminProgramDraftDetailQueryKey(targetDraftId),
      });
    },
    [queryClient],
  );

  const persistResourceUploadState = async (
    targetDraftId: number,
    resourceKey: string,
    payload: {
      errorMessage?: string | null;
      fileName?: string | null;
      fileSize?: number | null;
      fileUrl?: string | null;
      mimeType?: string | null;
      status: AdminDraftUploadStatus;
    },
  ) => {
    await updateDraftResourceUploadState(targetDraftId, resourceKey, payload);
    await queryClient.invalidateQueries({
      queryKey: adminProgramDraftDetailQueryKey(targetDraftId),
    });
  };

  const persistProblemQuestionMediaUploadState = useCallback(
    async (
      targetDraftId: number,
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
    ) => {
      await updateDraftProblemQuestionMediaUploadState(
        targetDraftId,
        lectureKey,
        questionIndex,
        payload,
      );
      await queryClient.invalidateQueries({
        queryKey: adminProgramDraftDetailQueryKey(targetDraftId),
      });
    },
    [queryClient],
  );

  const toggleSectionExpanded = (sectionKey: string) => {
    setExpandedSectionKeys((current) =>
      current.includes(sectionKey)
        ? current.filter((key) => key !== sectionKey)
        : [...current, sectionKey],
    );
  };

  const toggleLectureExpanded = (lectureKey: string) => {
    setExpandedLectureKeys((current) =>
      current.includes(lectureKey)
        ? current.filter((key) => key !== lectureKey)
        : [...current, lectureKey],
    );
  };

  const toggleProblemQuestionCollapsed = (lectureKey: string, questionIndex: number) => {
    const questionKey = `${lectureKey}:${String(questionIndex)}`;
    setCollapsedProblemQuestionKeys((current) =>
      current.includes(questionKey)
        ? current.filter((key) => key !== questionKey)
        : [...current, questionKey],
    );
  };

  const navigateWithoutPrompt = (nextPath: string) => {
    bypassNavigationBlockRef.current = true;
    void navigate(nextPath);
    window.setTimeout(() => {
      bypassNavigationBlockRef.current = false;
    }, 0);
  };

  const updateBasicInfo = <K extends keyof AdminProgramDraftPayload['basicInfo']>(
    field: K,
    value: AdminProgramDraftPayload['basicInfo'][K],
  ) => {
    updatePayload((current) => ({
      ...current,
      basicInfo: normalizeDraftBasicInfo({
        ...current.basicInfo,
        [field]: value,
      }),
    }));
  };

  const uploadPendingProgramThumbnail = async (): Promise<boolean> => {
    if (!pendingThumbnailSelection) {
      return true;
    }

    const file = pendingThumbnailSelection.file;
    setIsUploadingThumbnail(true);
    setUploadProgressModal({
      description: '대표 이미지 업로드가 끝날 때까지 잠시 기다려 주세요.',
      title: '대표 이미지 업로드 중',
    });

    try {
      const uploadTarget = await createAdminProgramThumbnailUploadTarget({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
      });

      await uploadAdminProgramThumbnailFile(uploadTarget.uploadUrl, file);

      const nextPayload = updatePayload((current) => ({
        ...current,
        basicInfo: {
          ...current.basicInfo,
          thumbnailPreviewUrl: uploadTarget.previewUrl,
          thumbnailUrl: uploadTarget.storageUrl,
        },
      }));
      if (!nextPayload) {
        throw new Error('대표 이미지를 초안에 반영하지 못했습니다.');
      }
      setPendingThumbnailSelection(null);

      const saved = await saveCurrentDraftPayload({ force: true });
      if (!saved) {
        showToast({
          message:
            '대표 이미지는 업로드됐지만 초안 저장에 실패했습니다. 저장 상태를 확인해 주세요.',
          variant: 'error',
        });
        return false;
      }

      showToast({
        message: '대표 이미지를 업로드하고 초안에 저장했습니다.',
        variant: 'success',
      });
      return true;
    } catch (error: unknown) {
      showToast({
        message: error instanceof Error ? error.message : '대표 이미지 업로드에 실패했습니다.',
        variant: 'error',
      });
      return false;
    } finally {
      setIsUploadingThumbnail(false);
      setUploadProgressModal(null);
    }
  };

  const validateBasicInfoInputs = (): boolean => {
    const nextErrors: Record<string, string | undefined> = {};
    const basicInfo = currentPayloadRef.current?.basicInfo ?? null;

    if (basicInfo) {
      for (const issue of buildBasicInfoInputValidationIssues(
        basicInfo,
        numericInputValues,
        discountPercentInput,
      )) {
        if (issue.errorKey) {
          nextErrors[issue.errorKey] = issue.message;
        }
      }
    }

    setBasicInfoErrors(nextErrors);
    return Object.values(nextErrors).every((message) => !message);
  };

  const handleProgramThumbnailFileChange = (file: File | null) => {
    if (!file) {
      return;
    }

    const validationMessage = validateProgramThumbnailFile(file);
    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    const previewObjectUrl =
      typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
    setPendingThumbnailSelection({
      file,
      previewObjectUrl,
      sizeLabel: `${formatFileSizeInMb(file.size)} MB`,
    });
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        thumbnailCropOffsetX: DEFAULT_ADMIN_IMAGE_CROP.offsetX,
        thumbnailCropOffsetY: DEFAULT_ADMIN_IMAGE_CROP.offsetY,
        thumbnailCropZoom: DEFAULT_ADMIN_IMAGE_CROP.zoom,
        thumbnailPreviewUrl: previewObjectUrl,
        thumbnailUrl: current.basicInfo.thumbnailUrl,
      },
    }));
  };

  const handleNumericBasicInfoChange = (
    field: NumericBasicInfoField,
    label: string,
    value: string,
  ) => {
    const nextValue = field === 'price' ? formatIntegerInputValue(value) : value;
    setNumericInputValues((current) => ({ ...current, [field]: nextValue }));
    const parsed = parseNonNegativeIntegerInput(nextValue, label);
    setBasicInfoErrors((current) => ({ ...current, [field]: parsed.errorMessage }));
    if (!parsed.errorMessage) {
      updateBasicInfo(field, parsed.value);
    }
  };

  const handleDiscountPercentChange = (value: string) => {
    setDiscountPercentInput(value);
    const parsed = parseDiscountPercentInput(value);
    setBasicInfoErrors((current) => ({ ...current, discountPercent: parsed.errorMessage }));
    if (!parsed.errorMessage) {
      updateBasicInfo(
        'salePrice',
        parsed.value === null
          ? null
          : calculateSalePriceFromPercent(payload?.basicInfo.price ?? null, value),
      );
    }
  };

  const handleRecruitmentRangeChange = (startDate: string, endDate: string) => {
    setBasicInfoErrors((current) => ({ ...current, recruitmentRange: undefined }));
    updatePayload((current) => {
      return {
        ...current,
        basicInfo: {
          ...current.basicInfo,
          saleEndAt: endDate ? toEndOfDayIsoStringOrNull(endDate) : null,
          saleStartAt: toStartOfDayIsoStringOrNull(startDate),
        },
      };
    });
  };

  const handleLearningRangeChange = (startDate: string, endDate: string) => {
    setBasicInfoErrors((current) => ({ ...current, learningRange: undefined }));
    updatePayload((current) => ({
      ...current,
      basicInfo: normalizeDraftBasicInfo({
        ...current.basicInfo,
        accessDays: calculateAccessDaysFromLearningRange(
          toStartOfDayIsoStringOrNull(startDate),
          endDate ? toEndOfDayMinuteIsoStringOrNull(endDate) : null,
        ),
        accessPolicy: 'FIXED_DURATION',
        learningEndAt: endDate ? toEndOfDayMinuteIsoStringOrNull(endDate) : null,
        learningStartAt: toStartOfDayIsoStringOrNull(startDate),
      }),
    }));
  };

  const handleRollingAccessDaysChange = (value: string) => {
    const normalizedValue = value.trim();
    const parsedValue = normalizedValue ? Number(normalizedValue) : null;
    const nextAccessDays =
      parsedValue !== null && Number.isInteger(parsedValue) && parsedValue >= 1
        ? parsedValue
        : null;

    setBasicInfoErrors((current) => ({
      ...current,
      accessDays:
        normalizedValue && nextAccessDays === null
          ? '결제일 기준 수강일수는 1 이상의 정수로 입력해 주세요.'
          : undefined,
    }));
    updatePayload((current) => ({
      ...current,
      basicInfo: normalizeDraftBasicInfo({
        ...current.basicInfo,
        accessDays: nextAccessDays,
        accessPolicy: 'ROLLING_DAYS',
        learningEndAt: null,
        learningStartAt: null,
      }),
    }));
  };

  const resetRecruitmentRange = () => {
    setBasicInfoErrors((current) => ({ ...current, recruitmentRange: undefined }));
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        saleEndAt: null,
        saleStartAt: null,
      },
    }));
  };

  const resetLearningRange = () => {
    setBasicInfoErrors((current) => ({ ...current, learningRange: undefined }));
    updatePayload((current) => ({
      ...current,
      basicInfo: normalizeDraftBasicInfo({
        ...current.basicInfo,
        learningEndAt: null,
        learningStartAt: null,
      }),
    }));
  };

  const updateStringList = (
    field: 'learningPoints' | 'recommendedFor' | 'checklists',
    index: number,
    value: string,
  ) => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        [field]: current.basicInfo[field].map((item, itemIndex) =>
          itemIndex === index ? value : item,
        ),
      },
    }));
  };

  const addStringListItem = (field: 'learningPoints' | 'recommendedFor' | 'checklists') => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        [field]: [...current.basicInfo[field], ''],
      },
    }));
  };

  const removeStringListItem = (
    field: 'learningPoints' | 'recommendedFor' | 'checklists',
    index: number,
  ) => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        [field]: current.basicInfo[field].filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const updateStructuredInfoItem = (
    field: 'learningOutcomes' | 'summaryItems',
    index: number,
    key: keyof AdminProgramSummaryFormItem,
    value: string,
  ) => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        [field]: current.basicInfo[field].map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  };

  const addStructuredInfoItem = (field: 'learningOutcomes' | 'summaryItems') => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        [field]: [...current.basicInfo[field], { label: '', value: '' }],
      },
    }));
  };

  const removeStructuredInfoItem = (field: 'learningOutcomes' | 'summaryItems', index: number) => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        [field]: current.basicInfo[field].filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const updateFaqItem = (index: number, key: keyof AdminProgramFaqFormItem, value: string) => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        faqs: current.basicInfo.faqs.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  };

  const addFaqItem = () => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        faqs: [...current.basicInfo.faqs, { answer: '', question: '' }],
      },
    }));
  };

  const removeFaqItem = (index: number) => {
    updatePayload((current) => ({
      ...current,
      basicInfo: {
        ...current.basicInfo,
        faqs: current.basicInfo.faqs.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const addSection = () => {
    const nextSection = createEmptySection(payload?.sections.length ?? 0);
    updatePayload((current) => ({
      ...current,
      sections: [...current.sections, nextSection],
    }));
    setExpandedSectionKeys((current) => [...current, nextSection.key]);
  };

  const updateSection = (
    sectionKey: string,
    updater: (section: AdminProgramDraftSection) => AdminProgramDraftSection,
  ) => {
    updatePayload((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.key === sectionKey ? updater(section) : section,
      ),
    }));
  };

  const removeSection = (sectionKey: string) => {
    updatePayload((current) => ({
      ...current,
      problems: current.problems.filter(
        (problem) =>
          !current.sections
            .find((section) => section.key === sectionKey)
            ?.lectures.some((lecture) => lecture.key === problem.lectureKey),
      ),
      resources: reindexDraftResources(
        current.resources.filter(
          (resource) =>
            !current.sections
              .find((section) => section.key === sectionKey)
              ?.lectures.some((lecture) => lecture.key === resource.lectureKey),
        ),
      ),
      sections: current.sections
        .filter((section) => section.key !== sectionKey)
        .map((section, index) => ({ ...section, sortOrder: index })),
    }));
    setExpandedSectionKeys((current) => current.filter((key) => key !== sectionKey));
    setOpenLectureTypeMenuSectionKey((current) => (current === sectionKey ? null : current));
  };

  const moveSection = (sectionKey: string, direction: 'up' | 'down') => {
    updatePayload((current) => {
      const currentIndex = current.sections.findIndex((section) => section.key === sectionKey);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      return {
        ...current,
        sections: moveArrayItem(current.sections, currentIndex, targetIndex).map(
          (section, index) => ({
            ...section,
            sortOrder: index,
          }),
        ),
      };
    });
  };

  const addLecture = (sectionKey: string, lectureType: AdminLectureType) => {
    const nextLecture = createEmptyLecture(0, lectureType);
    updateSection(sectionKey, (section) => ({
      ...section,
      lectures: [...section.lectures, { ...nextLecture, sortOrder: section.lectures.length }],
    }));
    setExpandedSectionKeys((current) =>
      current.includes(sectionKey) ? current : [...current, sectionKey],
    );
    setExpandedLectureKeys((current) => [...current, nextLecture.key]);
    setOpenLectureTypeMenuSectionKey(null);
    scheduleDraftAutoSave(0);
  };

  const updateLecture = (
    sectionKey: string,
    lectureKey: string,
    updater: (
      lecture: AdminProgramDraftSection['lectures'][number],
    ) => AdminProgramDraftSection['lectures'][number],
  ) => {
    updateSection(sectionKey, (section) => ({
      ...section,
      lectures: section.lectures.map((lecture) =>
        lecture.key === lectureKey ? updater(lecture) : lecture,
      ),
    }));
  };

  const removeLecture = (sectionKey: string, lectureKey: string) => {
    const removedResourceKeys =
      currentPayloadRef.current?.resources
        .filter((resource) => resource.lectureKey === lectureKey)
        .map((resource) => resource.key) ?? [];

    updatePayload((current) => ({
      ...current,
      problems: current.problems.filter((problem) => problem.lectureKey !== lectureKey),
      resources: reindexDraftResources(
        current.resources.filter((resource) => resource.lectureKey !== lectureKey),
      ),
      sections: current.sections.map((section) =>
        section.key !== sectionKey
          ? section
          : {
              ...section,
              lectures: section.lectures
                .filter((lecture) => lecture.key !== lectureKey)
                .map((lecture, index) => ({ ...lecture, sortOrder: index })),
            },
      ),
    }));
    setExpandedLectureKeys((current) => current.filter((key) => key !== lectureKey));
    setPendingVideoSelections((current) => {
      const next = { ...current };
      delete next[lectureKey];
      return next;
    });
    setLectureVideoSizeLabels((current) => {
      const next = { ...current };
      delete next[lectureKey];
      return next;
    });
    setPendingResourceSelections((current) => {
      const next = { ...current };
      for (const resourceKey of removedResourceKeys) {
        delete next[resourceKey];
      }
      return next;
    });
    scheduleDraftAutoSave(0);
  };

  const moveLecture = (sectionKey: string, lectureKey: string, direction: 'up' | 'down') => {
    updateSection(sectionKey, (section) => {
      const currentIndex = section.lectures.findIndex((lecture) => lecture.key === lectureKey);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      return {
        ...section,
        lectures: moveArrayItem(section.lectures, currentIndex, targetIndex).map(
          (lecture, index) => ({
            ...lecture,
            sortOrder: index,
          }),
        ),
      };
    });
    scheduleDraftAutoSave(0);
  };

  const upsertProblem = useCallback(
    (
      lectureKey: string,
      updater: (problem: AdminProgramDraftProblem) => AdminProgramDraftProblem,
    ) => {
      updatePayload((current) => {
        const lectureTitle = current.sections
          .flatMap((section) => section.lectures)
          .find((lecture) => lecture.key === lectureKey)
          ?.title?.trim();
        const existingProblem =
          current.problems.find((problem) => problem.lectureKey === lectureKey) ??
          createEmptyProblem(lectureKey);
        const nextProblem = updater({
          ...existingProblem,
          title: existingProblem.title?.trim() || lectureTitle || '문제',
        });
        const hasProblem = current.problems.some((problem) => problem.lectureKey === lectureKey);

        return {
          ...current,
          problems: hasProblem
            ? current.problems.map((problem) =>
                problem.lectureKey === lectureKey ? nextProblem : problem,
              )
            : [...current.problems, nextProblem],
        };
      });
    },
    [updatePayload],
  );

  const removeProblem = (lectureKey: string) => {
    updatePayload((current) => ({
      ...current,
      problems: current.problems.filter((problem) => problem.lectureKey !== lectureKey),
    }));
    setCollapsedProblemQuestionKeys((current) => {
      const prefix = `${lectureKey}:`;
      return current.filter((key) => !key.startsWith(prefix));
    });
    setQuestionUploadStatus((current) => {
      const next: Record<string, string> = {};
      const prefix = `${lectureKey}:`;

      for (const [key, value] of Object.entries(current)) {
        if (!key.startsWith(prefix)) {
          next[key] = value;
        }
      }

      return next;
    });
    setPendingQuestionMediaSelections((current) => {
      const next: Record<string, PendingQuestionMediaFile> = {};
      const prefix = `${lectureKey}:`;

      for (const [key, value] of Object.entries(current)) {
        if (!key.startsWith(prefix)) {
          next[key] = value;
        }
      }

      return next;
    });
  };

  const addProblemQuestion = (lectureKey: string) => {
    upsertProblem(lectureKey, (problem) => ({
      ...problem,
      questions: [
        ...problem.questions,
        { ...createEmptyQuestion(), sortOrder: problem.questions.length },
      ],
    }));
  };

  const updateProblemRootArea = (lectureKey: string, nextProblemAreaId: number | null) => {
    upsertProblem(lectureKey, (problem) => {
      if (problem.problemAreaId === nextProblemAreaId) {
        return problem;
      }

      const hasSelectedQuestionArea = problem.questions.some(
        (question) => question.problemAreaId !== null,
      );
      if (
        hasSelectedQuestionArea &&
        !window.confirm(
          '문제영역 카테고리를 변경하면 문항에 선택된 문제영역이 모두 미선택으로 변경됩니다. 계속하시겠습니까?',
        )
      ) {
        return problem;
      }

      return {
        ...problem,
        problemAreaId: nextProblemAreaId,
        questions: problem.questions.map((question) => ({
          ...question,
          problemAreaId: null,
        })),
      };
    });
  };

  const updateProblemQuestion = useCallback(
    (
      lectureKey: string,
      questionIndex: number,
      updater: (question: AdminProgramDraftProblemQuestion) => AdminProgramDraftProblemQuestion,
    ) => {
      upsertProblem(lectureKey, (problem) => ({
        ...problem,
        questions: problem.questions.map((question, index) =>
          index === questionIndex ? updater(question) : question,
        ),
      }));
    },
    [upsertProblem],
  );

  const removeProblemQuestion = (lectureKey: string, questionIndex: number) => {
    const targetProblem =
      currentPayloadRef.current?.problems.find((problem) => problem.lectureKey === lectureKey) ??
      null;
    const nextQuestionCount = targetProblem ? targetProblem.questions.length - 1 : 0;

    if (nextQuestionCount <= 0) {
      removeProblem(lectureKey);
      return;
    }

    upsertProblem(lectureKey, (problem) => ({
      ...problem,
      questions: problem.questions
        .filter((_, index) => index !== questionIndex)
        .map((question, index) => ({ ...question, sortOrder: index })),
    }));
    setCollapsedProblemQuestionKeys((current) => {
      const next: string[] = [];
      const prefix = `${lectureKey}:`;

      for (const key of current) {
        if (!key.startsWith(prefix)) {
          next.push(key);
          continue;
        }

        const rawIndex = key.slice(prefix.length);
        const currentIndex = Number(rawIndex);

        if (!Number.isInteger(currentIndex) || currentIndex === questionIndex) {
          continue;
        }

        const nextIndex = currentIndex > questionIndex ? currentIndex - 1 : currentIndex;
        next.push(`${prefix}${String(nextIndex)}`);
      }

      return next;
    });
    setQuestionUploadStatus((current) => {
      const next: Record<string, string> = {};
      const prefix = `${lectureKey}:`;

      for (const [key, value] of Object.entries(current)) {
        if (!key.startsWith(prefix)) {
          next[key] = value;
          continue;
        }

        const rawIndex = key.slice(prefix.length);
        const currentIndex = Number(rawIndex);

        if (!Number.isInteger(currentIndex) || currentIndex === questionIndex) {
          continue;
        }

        const nextIndex = currentIndex > questionIndex ? currentIndex - 1 : currentIndex;
        next[`${prefix}${String(nextIndex)}`] = value;
      }

      return next;
    });
    setPendingQuestionMediaSelections((current) => {
      const next: Record<string, PendingQuestionMediaFile> = {};
      const prefix = `${lectureKey}:`;

      for (const [key, value] of Object.entries(current)) {
        if (!key.startsWith(prefix)) {
          next[key] = value;
          continue;
        }

        const rawIndex = key.slice(prefix.length);
        const currentIndex = Number(rawIndex);

        if (!Number.isInteger(currentIndex) || currentIndex === questionIndex) {
          continue;
        }

        const nextIndex = currentIndex > questionIndex ? currentIndex - 1 : currentIndex;
        next[`${prefix}${String(nextIndex)}`] = value;
      }

      return next;
    });
  };

  const hasActiveProblemQuestionMediaUpload = (lectureKey: string) =>
    Object.entries(questionUploadStatus).some(
      ([key, status]) => key.startsWith(`${lectureKey}:`) && status.includes('중'),
    );

  const moveProblemQuestion = (
    lectureKey: string,
    fromIndex: number,
    toIndex: number,
    options: { scheduleSave?: boolean } = {},
  ) => {
    const targetProblem =
      currentPayloadRef.current?.problems.find((problem) => problem.lectureKey === lectureKey) ??
      null;

    if (
      !targetProblem ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= targetProblem.questions.length ||
      toIndex >= targetProblem.questions.length
    ) {
      return;
    }

    if (hasActiveProblemQuestionMediaUpload(lectureKey)) {
      showToast({
        message: '문제 미디어 업로드가 끝난 뒤 문제 순서를 변경해 주세요.',
        variant: 'error',
      });
      return;
    }

    upsertProblem(lectureKey, (problem) => ({
      ...problem,
      questions: moveArrayItem(problem.questions, fromIndex, toIndex).map((question, index) => ({
        ...question,
        sortOrder: index,
      })),
    }));
    setCollapsedProblemQuestionKeys((current) =>
      remapQuestionIndexedKeys(current, lectureKey, fromIndex, toIndex),
    );
    setQuestionUploadStatus((current) =>
      remapQuestionIndexedRecord(current, lectureKey, fromIndex, toIndex),
    );
    setPendingQuestionMediaSelections((current) =>
      remapQuestionIndexedRecord(current, lectureKey, fromIndex, toIndex),
    );
    if (options.scheduleSave ?? true) {
      scheduleDraftAutoSave(0);
    }
  };

  const handleProblemQuestionDragStart = (
    event: DragEvent<HTMLButtonElement>,
    lectureKey: string,
    questionIndex: number,
  ) => {
    if (hasActiveProblemQuestionMediaUpload(lectureKey)) {
      event.preventDefault();
      showToast({
        message: '문제 미디어 업로드가 끝난 뒤 문제 순서를 변경해 주세요.',
        variant: 'error',
      });
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    problemQuestionDragMovedRef.current = false;
    setDraggedProblemQuestion({ lectureKey, questionIndex });
  };

  const handleProblemQuestionDragOver = (
    event: DragEvent<HTMLElement>,
    lectureKey: string,
    questionIndex: number,
  ) => {
    if (draggedProblemQuestion === null || draggedProblemQuestion.lectureKey !== lectureKey) {
      return;
    }

    event.preventDefault();
    problemQuestionDragAutoScroller.update(event.clientY);

    if (draggedProblemQuestion.questionIndex === questionIndex) {
      return;
    }

    moveProblemQuestion(lectureKey, draggedProblemQuestion.questionIndex, questionIndex, {
      scheduleSave: false,
    });
    problemQuestionDragMovedRef.current = true;
    setDraggedProblemQuestion({ lectureKey, questionIndex });
  };

  const handleProblemQuestionDragEnd = () => {
    problemQuestionDragAutoScroller.stop();

    if (problemQuestionDragMovedRef.current) {
      scheduleDraftAutoSave(0);
    }

    problemQuestionDragMovedRef.current = false;
    setDraggedProblemQuestion(null);
  };

  const setAllProblemQuestionsCollapsed = (lectureKey: string, collapsed: boolean) => {
    const questionCount =
      currentPayloadRef.current?.problems.find((problem) => problem.lectureKey === lectureKey)
        ?.questions.length ?? 0;
    const prefix = `${lectureKey}:`;

    setCollapsedProblemQuestionKeys((current) => {
      const withoutLectureQuestions = current.filter((key) => !key.startsWith(prefix));

      if (!collapsed) {
        return withoutLectureQuestions;
      }

      return [
        ...withoutLectureQuestions,
        ...Array.from({ length: questionCount }, (_, index) => `${prefix}${String(index)}`),
      ];
    });
  };

  const enterBulkProblemAreaMode = (lectureKey: string) => {
    setBulkProblemAreaLectureKey(lectureKey);
    setBulkProblemAreaQuestionIndexesByLectureKey((current) => ({
      ...current,
      [lectureKey]: [],
    }));
    setBulkProblemAreaValueByLectureKey((current) => ({
      ...current,
      [lectureKey]: '',
    }));
    setAllProblemQuestionsCollapsed(lectureKey, true);
  };

  const cancelBulkProblemAreaMode = (lectureKey: string) => {
    setBulkProblemAreaLectureKey((current) => (current === lectureKey ? null : current));
    setBulkProblemAreaQuestionIndexesByLectureKey((current) => {
      const next = { ...current };
      delete next[lectureKey];
      return next;
    });
    setBulkProblemAreaValueByLectureKey((current) => {
      const next = { ...current };
      delete next[lectureKey];
      return next;
    });
  };

  const setBulkProblemAreaSelectedQuestions = (lectureKey: string, questionIndexes: number[]) => {
    setBulkProblemAreaQuestionIndexesByLectureKey((current) => ({
      ...current,
      [lectureKey]: questionIndexes,
    }));
  };

  const toggleBulkProblemAreaQuestion = (lectureKey: string, questionIndex: number) => {
    setBulkProblemAreaQuestionIndexesByLectureKey((current) => {
      const currentIndexes = current[lectureKey] ?? [];
      const nextIndexes = currentIndexes.includes(questionIndex)
        ? currentIndexes.filter((index) => index !== questionIndex)
        : [...currentIndexes, questionIndex].sort((left, right) => left - right);

      return {
        ...current,
        [lectureKey]: nextIndexes,
      };
    });
  };

  const applyBulkProblemArea = (lectureKey: string) => {
    const problem =
      currentPayloadRef.current?.problems.find((item) => item.lectureKey === lectureKey) ?? null;
    const targetProblemAreaId = Number(bulkProblemAreaValueByLectureKey[lectureKey] ?? '');
    const selectedQuestionIndexes = (bulkProblemAreaQuestionIndexesByLectureKey[lectureKey] ?? [])
      .filter((index) => problem && index >= 0 && index < problem.questions.length)
      .sort((left, right) => left - right);

    if (!problem?.problemAreaId) {
      showToast({ message: '문제영역 카테고리를 먼저 선택해 주세요.', variant: 'error' });
      return;
    }

    if (!selectedQuestionIndexes.length) {
      showToast({ message: '변경할 문항을 선택해 주세요.', variant: 'error' });
      return;
    }

    if (!Number.isFinite(targetProblemAreaId) || targetProblemAreaId <= 0) {
      showToast({ message: '적용할 문제영역을 선택해 주세요.', variant: 'error' });
      return;
    }

    const selectedQuestionIndexSet = new Set(selectedQuestionIndexes);
    upsertProblem(lectureKey, (current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        selectedQuestionIndexSet.has(questionIndex)
          ? { ...question, problemAreaId: targetProblemAreaId }
          : question,
      ),
    }));
    setBulkProblemAreaSelectedQuestions(lectureKey, []);
    showToast({
      message: `선택한 문항 ${String(selectedQuestionIndexes.length)}개의 문제영역을 변경했습니다.`,
      variant: 'success',
    });
  };

  const updateProblemOption = (
    lectureKey: string,
    questionIndex: number,
    optionIndex: number,
    updater: (option: AdminProgramDraftProblemOption) => AdminProgramDraftProblemOption,
  ) => {
    updateProblemQuestion(lectureKey, questionIndex, (question) => ({
      ...question,
      options: question.options.map((option, index) =>
        index === optionIndex ? updater(option) : option,
      ),
    }));
  };

  const addResource = (lectureKey: string) => {
    updatePayload((current) => ({
      ...current,
      resources: [
        ...current.resources,
        createEmptyResource(
          lectureKey,
          current.resources.filter((resource) => resource.lectureKey === lectureKey).length,
        ),
      ],
    }));
  };

  const updateResource = (
    resourceIndex: number,
    updater: (resource: AdminProgramDraftResource) => AdminProgramDraftResource,
  ) => {
    updatePayload((current) => ({
      ...current,
      resources: current.resources.map((resource, index) =>
        index === resourceIndex ? updater(resource) : resource,
      ),
    }));
  };

  const removeResource = (resourceIndex: number) => {
    const resourceKey = currentPayloadRef.current?.resources[resourceIndex]?.key ?? null;
    updatePayload((current) => ({
      ...current,
      resources: reindexDraftResources(
        current.resources.filter((_, index) => index !== resourceIndex),
      ),
    }));
    if (resourceKey) {
      setPendingResourceSelections((current) => {
        const next = { ...current };
        delete next[resourceKey];
        return next;
      });
    }
  };

  const renderLectureProblemWorkspace = (lectureKey: string) => {
    const problem = payload?.problems.find((item) => item.lectureKey === lectureKey) ?? null;
    const allProblemQuestionsCollapsed = problem
      ? problem.questions.every((_, questionIndex) =>
          collapsedProblemQuestionKeys.includes(`${lectureKey}:${String(questionIndex)}`),
        )
      : false;
    const isBulkProblemAreaMode = bulkProblemAreaLectureKey === lectureKey;
    const bulkProblemAreaValue = bulkProblemAreaValueByLectureKey[lectureKey] ?? '';
    const bulkProblemAreaSelectedQuestionIndexes = problem
      ? (bulkProblemAreaQuestionIndexesByLectureKey[lectureKey] ?? []).filter(
          (questionIndex) => questionIndex >= 0 && questionIndex < problem.questions.length,
        )
      : [];
    const bulkProblemAreaSelectedQuestionIndexSet = new Set(bulkProblemAreaSelectedQuestionIndexes);
    const allBulkProblemAreaQuestionsSelected =
      Boolean(problem?.questions.length) &&
      bulkProblemAreaSelectedQuestionIndexes.length === problem?.questions.length;

    return (
      <div className={styles['lectureWorkspaceSection']}>
        {problem ? (
          <div
            className={classNames(styles['stackListCompact'], styles['problemQuestionList'])}
            onDragOver={(event) => {
              if (
                draggedProblemQuestion === null ||
                draggedProblemQuestion.lectureKey !== lectureKey
              ) {
                return;
              }

              event.preventDefault();
              problemQuestionDragAutoScroller.update(event.clientY);
            }}
          >
            <div className={styles['problemQuestionDivider']} aria-hidden='true' />
            <div className={styles['problemQuestionListToolbar']}>
              <div>
                <h5 className={styles['panelTitle']}>문제 문항</h5>
                <p className={styles['metaText']}>
                  {isBulkProblemAreaMode
                    ? '체크한 문항의 문제영역을 한 번에 변경합니다.'
                    : '접은 상태에서 오른쪽 이동 핸들을 드래그하면 문항 순서를 바꿀 수 있습니다.'}
                </p>
              </div>
              <div className={styles['actionRow']}>
                {!isBulkProblemAreaMode ? (
                  <>
                    <Button
                      onClick={() => {
                        setAllProblemQuestionsCollapsed(lectureKey, !allProblemQuestionsCollapsed);
                      }}
                      type='button'
                      variant='secondary'
                    >
                      {allProblemQuestionsCollapsed ? '문제 모두 펼치기' : '문제 모두 접기'}
                    </Button>
                    <Button
                      disabled={!problem.problemAreaId}
                      onClick={() => {
                        enterBulkProblemAreaMode(lectureKey);
                      }}
                      type='button'
                      variant='secondary'
                    >
                      영역 일괄 변경
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      cancelBulkProblemAreaMode(lectureKey);
                    }}
                    type='button'
                    variant='secondary'
                  >
                    일괄 변경 취소
                  </Button>
                )}
              </div>
            </div>
            {isBulkProblemAreaMode ? (
              <div className={styles['bulkProblemAreaBar']}>
                <div className={styles['bulkProblemAreaInfo']}>
                  <strong>선택 {String(bulkProblemAreaSelectedQuestionIndexes.length)}개</strong>
                  <span>선택한 문항에 적용할 문제영역을 고르세요.</span>
                </div>
                <div className={styles['bulkProblemAreaControls']}>
                  <Button
                    onClick={() => {
                      setBulkProblemAreaSelectedQuestions(
                        lectureKey,
                        Array.from({ length: problem.questions.length }, (_, index) => index),
                      );
                    }}
                    size='sm'
                    type='button'
                    variant='secondary'
                  >
                    {allBulkProblemAreaQuestionsSelected ? '전체 선택됨' : '전체 선택'}
                  </Button>
                  <Button
                    disabled={!bulkProblemAreaSelectedQuestionIndexes.length}
                    onClick={() => {
                      setBulkProblemAreaSelectedQuestions(lectureKey, []);
                    }}
                    size='sm'
                    type='button'
                    variant='secondary'
                  >
                    선택 해제
                  </Button>
                  <AdminDropdownField
                    className={styles['bulkProblemAreaSelect']}
                    compact
                    disabled={!problem.problemAreaId}
                    label='변경할 문제영역'
                    onChange={(nextValue) => {
                      setBulkProblemAreaValueByLectureKey((current) => ({
                        ...current,
                        [lectureKey]: nextValue,
                      }));
                    }}
                    options={buildProblemAreaOptions(
                      problem.problemAreaId,
                      bulkProblemAreaValue ? Number(bulkProblemAreaValue) : null,
                    )}
                    placeholder='문제영역 선택'
                    value={bulkProblemAreaValue}
                  />
                  <Button
                    disabled={
                      !bulkProblemAreaSelectedQuestionIndexes.length || !bulkProblemAreaValue
                    }
                    onClick={() => {
                      applyBulkProblemArea(lectureKey);
                    }}
                    size='sm'
                    type='button'
                  >
                    선택 문항에 적용
                  </Button>
                </div>
              </div>
            ) : null}
            {problem.questions.map((question, questionIndex) => {
              const uploadKey = `${lectureKey}:${String(questionIndex)}`;
              const pendingQuestionMediaSelection =
                pendingQuestionMediaSelections[uploadKey] ?? null;
              const questionMediaInputId = `problem-question-media-upload-${lectureKey}-${String(questionIndex)}`;
              const questionMediaUploadStatus = normalizeQuestionMediaUploadStatus(question);
              const questionMediaStatusLabel =
                questionUploadStatus[uploadKey] ??
                formatUploadStatusLabel(
                  questionMediaUploadStatus,
                  question.mediaAssetId || question.mediaVideoId ? '업로드 완료' : '파일 미선택',
                  question.mediaUploadErrorMessage,
                );
              const questionCollapsed =
                isBulkProblemAreaMode || collapsedProblemQuestionKeys.includes(uploadKey);
              const isBulkProblemAreaQuestionSelected =
                bulkProblemAreaSelectedQuestionIndexSet.has(questionIndex);
              const currentQuestionProblemAreaLabel =
                question.problemAreaId === null
                  ? '미선택'
                  : (problemAreas.find((area) => area.id === question.problemAreaId)?.name ??
                    String(question.problemAreaId));
              const cancelPendingQuestionMediaSelection = () => {
                if (!pendingQuestionMediaSelection) {
                  return;
                }

                setPendingQuestionMediaSelections((current) => {
                  const next = { ...current };
                  delete next[uploadKey];
                  return next;
                });
                setQuestionUploadStatus((current) => {
                  const next = { ...current };
                  delete next[uploadKey];
                  return next;
                });
                updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                  ...current,
                  mediaAssetId: pendingQuestionMediaSelection.previousMediaAssetId,
                  mediaType: pendingQuestionMediaSelection.previousMediaType,
                  mediaUploadErrorMessage:
                    pendingQuestionMediaSelection.previousMediaUploadErrorMessage,
                  mediaUploadFileName: pendingQuestionMediaSelection.previousMediaUploadFileName,
                  mediaUploadStatus: pendingQuestionMediaSelection.previousMediaUploadStatus,
                  mediaUrl: pendingQuestionMediaSelection.previousMediaUrl,
                  mediaVideoId: pendingQuestionMediaSelection.previousMediaVideoId,
                }));
              };

              return (
                <article
                  className={classNames(
                    styles['panel'],
                    styles['problemQuestionCard'],
                    questionCollapsed ? styles['problemQuestionCardCollapsed'] : null,
                  )}
                  data-dragging={
                    draggedProblemQuestion?.lectureKey === lectureKey &&
                    draggedProblemQuestion.questionIndex === questionIndex
                  }
                  key={`problem-question-${lectureKey}-${String(questionIndex)}`}
                  onDragOver={(event) => {
                    handleProblemQuestionDragOver(event, lectureKey, questionIndex);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleProblemQuestionDragEnd();
                  }}
                >
                  <div
                    className={classNames(
                      styles['panelToolbar'],
                      isBulkProblemAreaMode ? styles['problemQuestionBulkToolbar'] : null,
                    )}
                  >
                    {isBulkProblemAreaMode ? (
                      <label className={styles['bulkProblemAreaCheckbox']}>
                        <input
                          aria-label={`문제 ${String(questionIndex + 1)} 선택`}
                          checked={isBulkProblemAreaQuestionSelected}
                          onChange={() => {
                            toggleBulkProblemAreaQuestion(lectureKey, questionIndex);
                          }}
                          type='checkbox'
                        />
                        <span aria-hidden='true' className={styles['bulkProblemAreaCheckboxBox']}>
                          {isBulkProblemAreaQuestionSelected ? (
                            <img alt='' src={checkIconSrc} />
                          ) : null}
                        </span>
                      </label>
                    ) : null}
                    <div className={styles['problemQuestionSummaryBlock']}>
                      <div className={styles['problemQuestionTitleStack']}>
                        <h6 className={styles['panelTitle']}>문제 {String(questionIndex + 1)}</h6>
                        <p className={styles['metaText']}>
                          {question.mediaType ? questionMediaStatusLabel : '미디어 없음'}
                        </p>
                      </div>
                      {questionCollapsed ? (
                        <p
                          className={styles['problemQuestionCollapsedSummary']}
                          title={summarizeProblemQuestionText(question.questionText)}
                        >
                          {summarizeProblemQuestionText(question.questionText)}
                        </p>
                      ) : null}
                      {isBulkProblemAreaMode ? (
                        <div
                          className={styles['problemQuestionCurrentArea']}
                          title={`현재 문제영역: ${currentQuestionProblemAreaLabel}`}
                        >
                          <span>현재 문제영역</span>
                          <strong>{currentQuestionProblemAreaLabel}</strong>
                        </div>
                      ) : null}
                    </div>
                    {!isBulkProblemAreaMode ? (
                      <div className={styles['problemQuestionToolbarActions']}>
                        {questionCollapsed ? (
                          <div className={styles['problemQuestionOrderControls']}>
                            <button
                              aria-label={`${String(questionIndex + 1)}번 문제 드래그 이동`}
                              className={classNames(
                                styles['problemQuestionOrderButton'],
                                styles['problemQuestionDragHandle'],
                              )}
                              draggable
                              onDragEnd={handleProblemQuestionDragEnd}
                              onDragStart={(event) => {
                                handleProblemQuestionDragStart(event, lectureKey, questionIndex);
                              }}
                              title='드래그해서 문제 순서 변경'
                              type='button'
                            >
                              <span
                                className={styles['problemQuestionGripIcon']}
                                aria-hidden='true'
                              />
                            </button>
                          </div>
                        ) : null}
                        <Button
                          onClick={() => {
                            toggleProblemQuestionCollapsed(lectureKey, questionIndex);
                          }}
                          type='button'
                          variant='secondary'
                        >
                          {questionCollapsed ? '문제 펼치기' : '문제 접기'}
                        </Button>
                        <Button
                          onClick={() => {
                            removeProblemQuestion(lectureKey, questionIndex);
                          }}
                          type='button'
                          variant='danger'
                        >
                          문제 삭제
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {!questionCollapsed ? (
                    <div className={styles['problemQuestionBody']}>
                      <div className={styles['problemQuestionSectionBlock']}>
                        <div className={styles['problemQuestionSectionHeader']}>
                          <strong>문제영역</strong>
                          <span>문제가 속한 영역을 선택합니다.</span>
                        </div>
                        <div
                          data-draft-focus-key={`${lectureKey}:${String(questionIndex)}:problemArea`}
                        >
                          <AdminDropdownField
                            className={styles['problemQuestionFieldWithoutLabel']}
                            compact
                            label='문제영역'
                            onChange={(nextValue) => {
                              updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                                ...current,
                                problemAreaId: nextValue ? Number(nextValue) : null,
                              }));
                            }}
                            options={buildProblemAreaOptions(
                              problem?.problemAreaId,
                              question.problemAreaId,
                            )}
                            placeholder='문제영역 선택'
                            value={
                              question.problemAreaId === null ? '' : String(question.problemAreaId)
                            }
                            disabled={!problem?.problemAreaId}
                          />
                        </div>
                      </div>

                      <div
                        className={classNames(
                          styles['problemQuestionSectionBlock'],
                          styles['problemQuestionMediaBlock'],
                        )}
                        data-draft-focus-key={`${lectureKey}:${String(questionIndex)}:media`}
                      >
                        <div className={styles['problemQuestionSectionHeader']}>
                          <strong>이미지 / 영상</strong>
                          <span>문제 이해에 필요한 자료가 있을 때만 연결합니다.</span>
                        </div>
                        <div className={styles['questionMediaRow']}>
                          <AdminFileDropZone
                            actions={
                              <>
                                {pendingQuestionMediaSelection ? (
                                  <Button
                                    onClick={() => {
                                      void handleQuestionMediaUpload(lectureKey, questionIndex);
                                    }}
                                    size='sm'
                                    type='button'
                                    variant='secondary'
                                  >
                                    업로드 시작
                                  </Button>
                                ) : null}
                                {pendingQuestionMediaSelection ? (
                                  <Button
                                    onClick={cancelPendingQuestionMediaSelection}
                                    size='sm'
                                    type='button'
                                    variant='secondary'
                                  >
                                    선택 취소
                                  </Button>
                                ) : null}
                                {(question.mediaAssetId || question.mediaVideoId) &&
                                !pendingQuestionMediaSelection ? (
                                  <Button
                                    onClick={() => {
                                      updateProblemQuestion(
                                        lectureKey,
                                        questionIndex,
                                        (current) => ({
                                          ...current,
                                          mediaAssetId: null,
                                          mediaType: null,
                                          mediaUploadErrorMessage: null,
                                          mediaUploadFileName: null,
                                          mediaUploadStatus: null,
                                          mediaUrl: null,
                                          mediaVideoId: null,
                                        }),
                                      );
                                      if (draftId !== null) {
                                        void persistProblemQuestionMediaUploadState(
                                          draftId,
                                          lectureKey,
                                          questionIndex,
                                          {
                                            clearMedia: true,
                                            errorMessage: null,
                                            fileName: null,
                                            mediaAssetId: null,
                                            mediaType: null,
                                            mediaUrl: null,
                                            mediaVideoId: null,
                                            status: null,
                                          },
                                        );
                                      }
                                      setQuestionUploadStatus((current) => {
                                        const next = { ...current };
                                        delete next[uploadKey];
                                        return next;
                                      });
                                    }}
                                    size='sm'
                                    type='button'
                                    variant='secondary'
                                  >
                                    미디어 제거
                                  </Button>
                                ) : null}
                              </>
                            }
                            accept='image/*,video/*'
                            buttonLabel={
                              pendingQuestionMediaSelection ||
                              question.mediaAssetId ||
                              question.mediaVideoId
                                ? '파일 변경'
                                : '파일 선택'
                            }
                            id={questionMediaInputId}
                            label='문제 미디어 파일'
                            onFilesSelected={(files) => {
                              const file = files[0];
                              if (!file) {
                                return;
                              }
                              handleQuestionMediaSelection(lectureKey, questionIndex, file);
                            }}
                            onClear={
                              pendingQuestionMediaSelection
                                ? cancelPendingQuestionMediaSelection
                                : undefined
                            }
                            selectedLabel={
                              pendingQuestionMediaSelection?.file.name ??
                              question.mediaUploadFileName ??
                              (question.mediaAssetId || question.mediaVideoId
                                ? '업로드된 미디어'
                                : undefined)
                            }
                            selectedMeta={pendingQuestionMediaSelection?.sizeLabel}
                          />
                        </div>

                        {question.mediaType ? (
                          <div className={styles['curriculumStatGrid']}>
                            <div className={styles['curriculumStatCard']}>
                              <span className={styles['curriculumStatLabel']}>현재 상태</span>
                              <strong className={styles['curriculumStatValue']}>
                                {questionMediaStatusLabel}
                              </strong>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className={styles['problemQuestionSectionBlock']}>
                        <div className={styles['problemQuestionSectionHeader']}>
                          <strong>문제</strong>
                          <span>수강생에게 노출될 문제 본문을 입력합니다.</span>
                        </div>
                        <TextAreaField
                          data-draft-focus-key={`${lectureKey}:${String(questionIndex)}:questionText`}
                          labelClassName={styles['srOnly']}
                          label='문제'
                          name={`problem-question-text-${lectureKey}-${String(questionIndex)}`}
                          onChange={(event) => {
                            updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                              ...current,
                              questionText: event.target.value,
                            }));
                          }}
                          value={question.questionText}
                        />
                      </div>

                      <div
                        className={classNames(
                          styles['problemQuestionSectionBlock'],
                          styles['problemQuestionOptionsBlock'],
                        )}
                      >
                        <div className={styles['problemQuestionSectionHeader']}>
                          <strong>보기</strong>
                          <span>
                            정답 보기에 체크하세요. 복수정답이면 여러 개를 체크하면 됩니다.
                          </span>
                        </div>
                        <div className={styles['stackListCompact']}>
                          {question.options.map((option, optionIndex) => (
                            <div
                              className={styles['quizOptionRow']}
                              key={`problem-option-${String(optionIndex)}`}
                            >
                              <span className={styles['quizOptionLabel']}>
                                {formatQuizOptionLabel(optionIndex)}
                              </span>
                              <TextField
                                data-draft-focus-key={`${lectureKey}:${String(questionIndex)}:option-${String(optionIndex)}`}
                                errorClassName={styles['quizOptionFieldError']}
                                fieldClassName={styles['quizOptionField']}
                                label={`${formatQuizOptionLabel(optionIndex)} 보기`}
                                labelClassName={styles['srOnly']}
                                name={`problem-option-${lectureKey}-${String(questionIndex)}-${String(optionIndex)}`}
                                onChange={(event) => {
                                  updateProblemOption(
                                    lectureKey,
                                    questionIndex,
                                    optionIndex,
                                    (current) => ({
                                      ...current,
                                      optionText: event.target.value,
                                    }),
                                  );
                                }}
                                value={option.optionText}
                              />
                              <label className={styles['quizOptionCheckbox']}>
                                <input
                                  aria-label={`${formatQuizOptionLabel(optionIndex)} 보기 정답 선택`}
                                  checked={option.correct}
                                  onChange={(event) => {
                                    updateProblemQuestion(lectureKey, questionIndex, (current) => {
                                      const nextOptions = current.options.map(
                                        (currentOption, currentOptionIndex) =>
                                          currentOptionIndex === optionIndex
                                            ? {
                                                ...currentOption,
                                                correct: event.target.checked,
                                              }
                                            : currentOption,
                                      );

                                      return {
                                        ...current,
                                        options: nextOptions,
                                        questionType: resolveQuestionType(nextOptions),
                                      };
                                    });
                                  }}
                                  type='checkbox'
                                />
                                <span
                                  aria-hidden='true'
                                  className={classNames(
                                    styles['quizOptionCheckboxVisual'],
                                    option.correct
                                      ? styles['quizOptionCheckboxVisualChecked']
                                      : null,
                                  )}
                                >
                                  {option.correct ? <img alt='' src={checkIconSrc} /> : null}
                                </span>
                                <span>정답</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={styles['problemQuestionSectionBlock']}>
                        <div className={styles['problemQuestionSectionHeader']}>
                          <strong>해설</strong>
                          <span>정답 확인 후 보여줄 풀이 내용을 입력합니다.</span>
                        </div>
                        <TextAreaField
                          labelClassName={styles['srOnly']}
                          label='해설'
                          name={`problem-question-explanation-${lectureKey}-${String(questionIndex)}`}
                          onChange={(event) => {
                            updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                              ...current,
                              explanation: event.target.value,
                            }));
                          }}
                          rows={3}
                          value={question.explanation ?? ''}
                        />
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}

            {!isBulkProblemAreaMode ? (
              <div className={styles['actionRow']}>
                <Button
                  onClick={() => {
                    addProblemQuestion(lectureKey);
                  }}
                  type='button'
                  variant='primary'
                >
                  문제 추가
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className={styles['actionRow']}>
            <Button
              onClick={() => {
                upsertProblem(lectureKey, (current) => current);
              }}
              type='button'
              variant='primary'
            >
              문제 추가
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderLectureResourceWorkspace = (lectureKey: string) => {
    const lectureResources = (payload?.resources ?? [])
      .map((resource, resourceIndex) => ({ resource, resourceIndex }))
      .filter(({ resource }) => resource.lectureKey === lectureKey);

    return (
      <div className={styles['lectureWorkspaceSection']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h5 className={styles['panelTitle']}>첨부자료</h5>
          </div>
          <Button
            onClick={() => {
              addResource(lectureKey);
            }}
            type='button'
            variant='secondary'
          >
            첨부자료 추가
          </Button>
        </div>

        <div className={styles['stackListCompact']}>
          {lectureResources.length ? (
            lectureResources.map(({ resource, resourceIndex }, lectureResourceIndex) => {
              const resourceOrdinal = lectureResourceIndex + 1;
              const resourceDisplayTitle = resource.title?.trim() || resource.fileName?.trim();
              const pendingSelection = pendingResourceSelections[resource.key] ?? null;
              const fileInputId = `draft-resource-upload-${lectureKey}-${String(resourceIndex)}`;
              const uploadStatusLabel = pendingSelection
                ? `업로드 대기 · ${pendingSelection.sizeLabel}`
                : formatUploadStatusLabel(
                    resource.uploadStatus,
                    resource.fileName?.trim() ? '업로드 완료' : '파일 미선택',
                    resource.uploadErrorMessage,
                  );
              const cancelPendingResourceSelection = () => {
                setPendingResourceSelections((current) => {
                  const next = { ...current };
                  delete next[resource.key];
                  return next;
                });
              };

              return (
                <article
                  className={classNames(styles['panel'], styles['draftResourcePanel'])}
                  data-draft-focus-key={`resource-${resource.key}`}
                  key={`draft-resource-${lectureKey}-${String(resourceIndex)}`}
                >
                  <div className={styles['panelToolbar']}>
                    <div>
                      <h6 className={styles['panelTitle']}>
                        {`첨부자료 ${String(resourceOrdinal)}`}
                        {resourceDisplayTitle ? ` · ${resourceDisplayTitle}` : ''}
                      </h6>
                      <p className={styles['metaText']}>{uploadStatusLabel}</p>
                    </div>
                    <Button
                      onClick={() => {
                        removeResource(resourceIndex);
                      }}
                      type='button'
                      variant='danger'
                    >
                      자료 삭제
                    </Button>
                  </div>

                  <AdminFileDropZone
                    actions={
                      pendingSelection ? (
                        <>
                          <Button
                            onClick={(event) => {
                              void handleLectureResourceUpload(resourceIndex, event);
                            }}
                            type='button'
                            variant='secondary'
                          >
                            업로드 시작
                          </Button>
                          <Button
                            onClick={cancelPendingResourceSelection}
                            type='button'
                            variant='secondary'
                          >
                            선택 취소
                          </Button>
                        </>
                      ) : null
                    }
                    accept={RESOURCE_DOCUMENT_WITH_IMAGE_ACCEPT}
                    buttonLabel={pendingSelection || resource.fileName ? '파일 변경' : '파일 선택'}
                    id={fileInputId}
                    label='첨부자료 파일'
                    onFilesSelected={(files) => {
                      const file = files[0];
                      if (!file) {
                        return;
                      }
                      handleLectureResourceSelection(resource.key, file);
                    }}
                    onClear={pendingSelection ? cancelPendingResourceSelection : undefined}
                    selectedLabel={pendingSelection?.file.name ?? resource.fileName ?? undefined}
                    selectedMeta={
                      pendingSelection?.sizeLabel ||
                      (resource.fileSize ? `${formatFileSizeInMb(resource.fileSize)} MB` : null)
                    }
                  />

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      data-draft-focus-key={`resource-${resource.key}`}
                      label='표시할 파일명'
                      name={`draft-resource-title-${lectureKey}-${String(resourceIndex)}`}
                      onChange={(event) => {
                        updateResource(resourceIndex, (current) => ({
                          ...current,
                          title: event.target.value,
                        }));
                      }}
                      placeholder='플레이어와 수강 화면에 표시할 파일명'
                      value={resource.title ?? ''}
                    />
                  </div>
                </article>
              );
            })
          ) : (
            <p className={styles['helperText']}>등록된 첨부자료가 없습니다.</p>
          )}
        </div>
      </div>
    );
  };

  const flushPendingDraftSave = async (options?: {
    event?: ReactMouseEvent<HTMLButtonElement>;
    force?: boolean;
    hintMessage?: string;
    pendingThumbnailAction?: 'block' | 'upload';
    payloadOverride?: AdminProgramDraftPayload | undefined;
  }): Promise<boolean> => {
    if (draftId === null || currentPayloadRef.current === null) {
      return true;
    }

    const basicInputIssues = currentPayloadRef.current
      ? buildBasicInfoInputValidationIssues(
          currentPayloadRef.current.basicInfo,
          numericInputValues,
          discountPercentInput,
        )
      : [];

    if (!validateBasicInfoInputs()) {
      const firstIssue = basicInputIssues.find((issue) => issue.focusKey);
      const message = firstIssue?.message ?? options?.hintMessage ?? '숫자 입력값을 확인해 주세요.';
      if (firstIssue?.focusKey) {
        focusDraftField(firstIssue.focusKey);
      }
      if (options?.event) {
        showDraftFocusHint(message, options.event);
      }
      showToast({
        message,
        variant: 'error',
      });
      return false;
    }

    if (pendingThumbnailSelection) {
      if (isUploadingThumbnail) {
        showToast({
          message: '대표 이미지 업로드가 끝난 뒤 다시 시도해 주세요.',
          variant: 'error',
        });
        return false;
      }
      if (options?.pendingThumbnailAction !== 'block') {
        const uploaded = await uploadPendingProgramThumbnail();
        if (!uploaded) {
          return false;
        }
      } else {
        showToast({
          message: '선택한 대표 이미지는 업로드 시작을 먼저 눌러 주세요.',
          variant: 'error',
        });
        return false;
      }
    }

    return options?.force === undefined
      ? saveCurrentDraftPayload({ payloadOverride: options?.payloadOverride })
      : saveCurrentDraftPayload({
          force: options.force,
          payloadOverride: options.payloadOverride,
        });
  };

  const handleManualSave = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    await flushPendingDraftSave({
      event,
      force: true,
      hintMessage: '임시저장 전에 숫자 입력값을 확인해 주세요.',
    });
  };

  const handleDraftNavigation = (nextPath: string) => {
    void navigate(nextPath);
  };

  const handleDiscard = () => {
    if (draftId === null) {
      return;
    }

    if (
      !window.confirm(
        mode === 'edit'
          ? '수정을 취소하면 저장하지 않은 수정 내용이 사라집니다. 계속하시겠습니까?'
          : '작성 중인 초안을 폐기하면 되돌릴 수 없습니다. 계속하시겠습니까?',
      )
    ) {
      return;
    }

    discardMutation.mutate(draftId);
  };

  const handleStayOnPage = () => {
    setNavigationDecisionState('idle');
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset?.();
    }
  };

  const handleLeaveWithoutSaving = () => {
    setNavigationDecisionState('idle');
    if (navigationBlocker.state === 'blocked') {
      clearCreateWorkspaceSnapshot(draftId);
      navigationBlocker.proceed?.();
    }
  };

  const handleSaveAndLeave = async () => {
    setNavigationDecisionState('saving');

    const saved = await flushPendingDraftSave();
    if (!saved) {
      setNavigationDecisionState('idle');
      return;
    }

    setNavigationDecisionState('idle');
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.proceed?.();
    }
  };

  const pollEncodedVideoReady = useCallback(
    async (
      videoId: number,
      options: {
        onProgress?: (
          progressPercent: number | null,
          processingStage: AdminVideoProcessingStage | null,
        ) => void;
        profile?: AdminVideoEncodingProfile;
        startIfUploaded?: boolean;
      } = {},
    ): Promise<number | null> => {
      for (let attempt = 0; attempt < VIDEO_ENCODING_MAX_POLL_ATTEMPTS; attempt += 1) {
        const status = await fetchAdminVideoStatus(videoId);
        if (status.status === 'PROCESSING') {
          options.onProgress?.(status.progressPercent ?? 0, status.processingStage ?? 'ENCODING');
        }
        if (status.status === 'READY') {
          options.onProgress?.(100, null);
          return status.durationSeconds;
        }
        if (status.status === 'FAILED') {
          throw new Error(status.errorMessage || '영상 인코딩에 실패했습니다.');
        }
        if (status.status === 'UPLOADED' && options.startIfUploaded !== false) {
          await startAdminVideoEncoding(videoId, options.profile);
          options.onProgress?.(status.progressPercent ?? 0, 'ENCODING');
        }
        if (status.status === 'UPLOADING') {
          throw new Error('영상 인코딩이 정상적으로 시작되지 않았습니다. 다시 업로드해 주세요.');
        }
        await new Promise((resolve) => window.setTimeout(resolve, VIDEO_ENCODING_POLL_INTERVAL_MS));
      }

      throw new Error('영상 인코딩 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    },
    [],
  );

  const pollVideoReady = useCallback(
    async (videoId: number, lectureKey: string): Promise<number | null> => {
      return pollEncodedVideoReady(videoId, {
        onProgress: (progressPercent, processingStage) => {
          setLectureVideoProgressByKey((current) => ({
            ...current,
            [lectureKey]: progressPercent ?? 0,
          }));
          setLectureVideoProcessingStageByKey((current) => {
            if (processingStage === null) {
              const next = { ...current };
              delete next[lectureKey];
              return next;
            }
            return {
              ...current,
              [lectureKey]: processingStage,
            };
          });
        },
      });
    },
    [pollEncodedVideoReady],
  );

  const uploadAndEncodeVideo = async (
    file: File,
    options: {
      onEncodingProgress?: (
        progressPercent: number | null,
        processingStage: AdminVideoProcessingStage | null,
      ) => void;
      onProcessingStarted?: (videoId: number) => Promise<void> | void;
      onUploadProgress?: (progressPercent: number) => void;
      profile?: AdminVideoEncodingProfile;
      usage?: 'LECTURE' | 'PROBLEM';
    } = {},
  ) => {
    const uploadSessionPayload = {
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      filename: file.name,
      partCount: calculatePartCount(file.size),
      ...(options.usage ? { usage: options.usage } : {}),
    };
    const session = await createAdminVideoUploadSession(uploadSessionPayload);
    const chunks = buildVideoChunks(file, session.parts);
    const completedParts = await uploadVideoChunks(
      chunks,
      file.type || 'application/octet-stream',
      options.onUploadProgress ?? (() => {}),
    );

    await completeAdminVideoUpload(session.videoId, {
      parts: completedParts,
      uploadId: session.uploadId,
    });
    await startAdminVideoEncoding(session.videoId, options.profile);
    await options.onProcessingStarted?.(session.videoId);
    const durationSeconds = await pollEncodedVideoReady(session.videoId, {
      ...(options.onEncodingProgress ? { onProgress: options.onEncodingProgress } : {}),
      ...(options.profile ? { profile: options.profile } : {}),
      startIfUploaded: false,
    });

    return {
      durationSeconds,
      fileName: file.name,
      videoId: session.videoId,
    };
  };

  useEffect(() => {
    if (draftId === null || payload === null) {
      return;
    }

    payload.sections.forEach((section) => {
      section.lectures.forEach((lecture) => {
        if (lecture.videoUploadStatus !== 'PROCESSING' || lecture.videoId === null) {
          return;
        }
        if (resumingVideoIdsRef.current.has(lecture.videoId)) {
          return;
        }

        resumingVideoIdsRef.current.add(lecture.videoId);
        void (async () => {
          try {
            const durationSeconds = await pollVideoReady(lecture.videoId as number, lecture.key);

            updatePayload((current) => ({
              ...current,
              sections: current.sections.map((currentSection) => ({
                ...currentSection,
                lectures: currentSection.lectures.map((currentLecture) =>
                  currentLecture.key === lecture.key
                    ? {
                        ...currentLecture,
                        durationSeconds: durationSeconds ?? currentLecture.durationSeconds,
                        videoUploadErrorMessage: null,
                        videoUploadStatus: 'READY',
                      }
                    : currentLecture,
                ),
              })),
            }));
            await persistLectureVideoUploadState(draftId, lecture.key, {
              durationSeconds,
              errorMessage: null,
              fileName: lecture.videoUploadFileName,
              status: 'READY',
              videoId: lecture.videoId,
            });
            setLectureVideoProgressByKey((current) => {
              const next = { ...current };
              delete next[lecture.key];
              return next;
            });
            setLectureVideoProcessingStageByKey((current) => {
              const next = { ...current };
              delete next[lecture.key];
              return next;
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : '영상 인코딩 상태를 확인하지 못했습니다.';
            updatePayload((current) => ({
              ...current,
              sections: current.sections.map((currentSection) => ({
                ...currentSection,
                lectures: currentSection.lectures.map((currentLecture) =>
                  currentLecture.key === lecture.key
                    ? {
                        ...currentLecture,
                        videoUploadErrorMessage: errorMessage,
                        videoUploadStatus: 'FAILED',
                      }
                    : currentLecture,
                ),
              })),
            }));
            await persistLectureVideoUploadState(draftId, lecture.key, {
              errorMessage,
              fileName: lecture.videoUploadFileName,
              status: 'FAILED',
              videoId: lecture.videoId,
            });
          } finally {
            if (lecture.videoId !== null) {
              resumingVideoIdsRef.current.delete(lecture.videoId);
            }
          }
        })();
      });
    });
  }, [draftId, payload, persistLectureVideoUploadState, pollVideoReady, updatePayload]);

  useEffect(() => {
    if (draftId === null || payload === null) {
      return;
    }

    payload.problems.forEach((problem) => {
      problem.questions.forEach((question, questionIndex) => {
        if (
          question.mediaUploadStatus !== 'PROCESSING' ||
          question.mediaVideoId === null ||
          question.mediaType !== 'VIDEO'
        ) {
          return;
        }
        if (resumingVideoIdsRef.current.has(question.mediaVideoId)) {
          return;
        }

        const uploadKey = `${problem.lectureKey}:${String(questionIndex)}`;
        resumingVideoIdsRef.current.add(question.mediaVideoId);
        void (async () => {
          try {
            await pollEncodedVideoReady(question.mediaVideoId as number, {
              onProgress: (progressPercent) => {
                setQuestionUploadStatus((current) => ({
                  ...current,
                  [uploadKey]: formatProgressLabel('문제 영상 인코딩 중', progressPercent, true),
                }));
              },
              profile: 'PROBLEM_HLS_720',
            });

            updateProblemQuestion(problem.lectureKey, questionIndex, (current) => ({
              ...current,
              mediaUploadErrorMessage: null,
              mediaUploadStatus: 'READY',
            }));
            await persistProblemQuestionMediaUploadState(
              draftId,
              problem.lectureKey,
              questionIndex,
              {
                errorMessage: null,
                fileName: question.mediaUploadFileName,
                mediaType: 'VIDEO',
                mediaVideoId: question.mediaVideoId,
                status: 'READY',
              },
            );
            setQuestionUploadStatus((current) => ({
              ...current,
              [uploadKey]: '인코딩 완료',
            }));
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : '문제 영상 인코딩 상태를 확인하지 못했습니다.';
            updateProblemQuestion(problem.lectureKey, questionIndex, (current) => ({
              ...current,
              mediaUploadErrorMessage: errorMessage,
              mediaUploadStatus: 'FAILED',
            }));
            await persistProblemQuestionMediaUploadState(
              draftId,
              problem.lectureKey,
              questionIndex,
              {
                errorMessage,
                fileName: question.mediaUploadFileName,
                mediaType: 'VIDEO',
                mediaVideoId: question.mediaVideoId,
                status: 'FAILED',
              },
            );
            setQuestionUploadStatus((current) => ({
              ...current,
              [uploadKey]: '인코딩 실패',
            }));
          } finally {
            if (question.mediaVideoId !== null) {
              resumingVideoIdsRef.current.delete(question.mediaVideoId);
            }
          }
        })();
      });
    });
  }, [
    draftId,
    payload,
    persistProblemQuestionMediaUploadState,
    pollEncodedVideoReady,
    updateProblemQuestion,
  ]);

  const handleLectureVideoSelection = (lectureKey: string, file: File) => {
    const sizeLabel = `${formatFileSizeInMb(file.size)} MB`;
    setPendingVideoSelections((current) => ({
      ...current,
      [lectureKey]: {
        file,
        sizeLabel,
      },
    }));
    setLectureVideoSizeLabels((current) => ({
      ...current,
      [lectureKey]: sizeLabel,
    }));
  };

  const handleLectureVideoUpload = async (
    sectionKey: string,
    lectureKey: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    const pendingSelection = pendingVideoSelections[lectureKey];
    if (!pendingSelection) {
      showToast({
        message: '먼저 업로드할 영상을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    const file = pendingSelection.file;
    if (
      !(await flushPendingDraftSave({
        event,
        hintMessage: '영상 업로드 전에 입력값을 확인해 주세요.',
        pendingThumbnailAction: 'upload',
      }))
    ) {
      return;
    }

    try {
      if (draftId === null) {
        throw new Error(
          mode === 'edit'
            ? '프로그램 수정 화면을 먼저 준비해 주세요.'
            : '프로그램 초안을 먼저 저장해 주세요.',
        );
      }

      showToast({
        message: '영상 업로드와 인코딩을 백그라운드에서 진행합니다.',
        variant: 'success',
      });

      updatePayload((current) => ({
        ...current,
        sections: current.sections.map((section) => ({
          ...section,
          lectures: section.lectures.map((currentLecture) =>
            currentLecture.key === lectureKey
              ? {
                  ...currentLecture,
                  durationSeconds: null,
                  videoId: null,
                  videoUploadErrorMessage: null,
                  videoUploadFileName: file.name,
                  videoUploadStatus: 'UPLOADING',
                }
              : currentLecture,
          ),
        })),
      }));
      await persistLectureVideoUploadState(draftId, lectureKey, {
        errorMessage: null,
        fileName: file.name,
        status: 'UPLOADING',
        videoId: null,
      });
      setLectureVideoProgressByKey((current) => ({
        ...current,
        [lectureKey]: 0,
      }));
      setLectureVideoProcessingStageByKey((current) => {
        const next = { ...current };
        delete next[lectureKey];
        return next;
      });
      setPendingVideoSelections((current) => {
        const next = { ...current };
        delete next[lectureKey];
        return next;
      });

      const encodedVideo = await uploadAndEncodeVideo(file, {
        onEncodingProgress: (progressPercent, processingStage) => {
          setLectureVideoProgressByKey((current) => ({
            ...current,
            [lectureKey]: progressPercent ?? 0,
          }));
          setLectureVideoProcessingStageByKey((current) => {
            if (processingStage === null) {
              const next = { ...current };
              delete next[lectureKey];
              return next;
            }
            return {
              ...current,
              [lectureKey]: processingStage,
            };
          });
        },
        onProcessingStarted: async (videoId) => {
          setLectureVideoProgressByKey((current) => ({
            ...current,
            [lectureKey]: 0,
          }));
          setLectureVideoProcessingStageByKey((current) => ({
            ...current,
            [lectureKey]: 'ENCODING',
          }));
          updatePayload((current) => ({
            ...current,
            sections: current.sections.map((section) => ({
              ...section,
              lectures: section.lectures.map((currentLecture) =>
                currentLecture.key === lectureKey
                  ? {
                      ...currentLecture,
                      videoId,
                      videoUploadErrorMessage: null,
                      videoUploadFileName: file.name,
                      videoUploadStatus: 'PROCESSING',
                    }
                  : currentLecture,
              ),
            })),
          }));
          await persistLectureVideoUploadState(draftId, lectureKey, {
            errorMessage: null,
            fileName: file.name,
            status: 'PROCESSING',
            videoId,
          });
        },
        onUploadProgress: (progressPercent) => {
          setLectureVideoProgressByKey((current) => ({
            ...current,
            [lectureKey]: progressPercent,
          }));
        },
      });

      updateLecture(sectionKey, lectureKey, (lecture) => ({
        ...lecture,
        durationSeconds: encodedVideo.durationSeconds ?? lecture.durationSeconds,
        videoId: encodedVideo.videoId,
        videoUploadErrorMessage: null,
        videoUploadFileName: file.name,
        videoUploadStatus: 'READY',
      }));
      await persistLectureVideoUploadState(draftId, lectureKey, {
        durationSeconds: encodedVideo.durationSeconds,
        errorMessage: null,
        fileName: file.name,
        status: 'READY',
        videoId: encodedVideo.videoId,
      });
      setLectureVideoProgressByKey((current) => {
        const next = { ...current };
        delete next[lectureKey];
        return next;
      });
      setLectureVideoProcessingStageByKey((current) => {
        const next = { ...current };
        delete next[lectureKey];
        return next;
      });
      showToast({
        message: mode === 'edit' ? '강의 영상을 연결했습니다.' : '강의 영상을 초안에 연결했습니다.',
        variant: 'success',
      });
    } catch (error) {
      updatePayload((current) => ({
        ...current,
        sections: current.sections.map((section) => ({
          ...section,
          lectures: section.lectures.map((currentLecture) =>
            currentLecture.key === lectureKey
              ? {
                  ...currentLecture,
                  videoId: null,
                  videoUploadErrorMessage:
                    error instanceof Error ? error.message : '강의 영상 업로드에 실패했습니다.',
                  videoUploadFileName: file.name,
                  videoUploadStatus: 'FAILED',
                }
              : currentLecture,
          ),
        })),
      }));
      if (draftId !== null) {
        try {
          await persistLectureVideoUploadState(draftId, lectureKey, {
            errorMessage:
              error instanceof Error ? error.message : '강의 영상 업로드에 실패했습니다.',
            fileName: file.name,
            status: 'FAILED',
            videoId: null,
          });
        } catch {
          // Preserve local failure state even if status persistence fails.
        }
      }
      setLectureVideoProgressByKey((current) => {
        const next = { ...current };
        delete next[lectureKey];
        return next;
      });
      showToast({
        message: error instanceof Error ? error.message : '강의 영상 업로드에 실패했습니다.',
        variant: 'error',
      });
    }
  };

  const handleQuestionMediaSelection = (lectureKey: string, questionIndex: number, file: File) => {
    const uploadKey = `${lectureKey}:${String(questionIndex)}`;
    const previousQuestion =
      currentPayloadRef.current?.problems.find((problem) => problem.lectureKey === lectureKey)
        ?.questions[questionIndex] ?? null;

    setPendingQuestionMediaSelections((current) => ({
      ...current,
      [uploadKey]: {
        file,
        previousMediaAssetId: previousQuestion?.mediaAssetId ?? null,
        previousMediaType: previousQuestion?.mediaType ?? null,
        previousMediaUploadErrorMessage: previousQuestion?.mediaUploadErrorMessage ?? null,
        previousMediaUploadFileName: previousQuestion?.mediaUploadFileName ?? null,
        previousMediaUploadStatus: normalizeQuestionMediaUploadStatus(
          previousQuestion ?? { mediaAssetId: null, mediaUploadStatus: null, mediaVideoId: null },
        ),
        previousMediaUrl: previousQuestion?.mediaUrl ?? null,
        previousMediaVideoId: previousQuestion?.mediaVideoId ?? null,
        sizeLabel: `${formatFileSizeInMb(file.size)} MB`,
      },
    }));
    setQuestionUploadStatus((current) => ({
      ...current,
      [uploadKey]: `업로드 대기 · ${file.name}`,
    }));
    updateProblemQuestion(lectureKey, questionIndex, (question) => ({
      ...question,
      mediaAssetId: null,
      mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      mediaUploadErrorMessage: null,
      mediaUploadFileName: file.name,
      mediaUploadStatus: 'UPLOADING',
      mediaUrl: null,
      mediaVideoId: null,
    }));
  };

  const handleQuestionMediaUpload = async (lectureKey: string, questionIndex: number) => {
    const uploadKey = `${lectureKey}:${String(questionIndex)}`;
    const pendingSelection = pendingQuestionMediaSelections[uploadKey];
    if (!pendingSelection) {
      return;
    }

    const { file } = pendingSelection;

    try {
      if (draftId === null) {
        throw new Error('프로그램 초안을 먼저 저장해 주세요.');
      }

      setQuestionUploadStatus((current) => ({
        ...current,
        [uploadKey]: '초안 저장 중',
      }));

      const saved = await flushPendingDraftSave({
        force: true,
        pendingThumbnailAction: 'upload',
      });
      if (!saved) {
        throw new Error('강의 정보를 임시저장한 뒤 다시 업로드해 주세요.');
      }

      setQuestionUploadStatus((current) => ({
        ...current,
        [uploadKey]: '문제 미디어 업로드 중',
      }));

      if (file.type.startsWith('video/')) {
        const encodedVideo = await uploadAndEncodeVideo(file, {
          onEncodingProgress: (progressPercent) => {
            setQuestionUploadStatus((current) => ({
              ...current,
              [uploadKey]: formatProgressLabel('문제 영상 인코딩 중', progressPercent, true),
            }));
          },
          onProcessingStarted: async (videoId) => {
            updateProblemQuestion(lectureKey, questionIndex, (question) => ({
              ...question,
              mediaAssetId: null,
              mediaType: 'VIDEO',
              mediaUploadErrorMessage: null,
              mediaUploadFileName: file.name,
              mediaUploadStatus: 'PROCESSING',
              mediaUrl: null,
              mediaVideoId: videoId,
            }));
            await persistProblemQuestionMediaUploadState(draftId, lectureKey, questionIndex, {
              errorMessage: null,
              fileName: file.name,
              mediaAssetId: null,
              mediaType: 'VIDEO',
              mediaUrl: null,
              mediaVideoId: videoId,
              status: 'PROCESSING',
            });
          },
          onUploadProgress: (progressPercent) => {
            setQuestionUploadStatus((current) => ({
              ...current,
              [uploadKey]: `문제 영상 업로드 중 ${String(progressPercent)}%`,
            }));
          },
          profile: 'PROBLEM_HLS_720',
          usage: 'PROBLEM',
        });

        updateProblemQuestion(lectureKey, questionIndex, (question) => ({
          ...question,
          mediaUploadErrorMessage: null,
          mediaUploadStatus: 'READY',
          mediaVideoId: encodedVideo.videoId,
        }));
        await persistProblemQuestionMediaUploadState(draftId, lectureKey, questionIndex, {
          errorMessage: null,
          fileName: file.name,
          mediaAssetId: null,
          mediaType: 'VIDEO',
          mediaUrl: null,
          mediaVideoId: encodedVideo.videoId,
          status: 'READY',
        });
        setQuestionUploadStatus((current) => ({
          ...current,
          [uploadKey]: '인코딩 완료',
        }));
        setPendingQuestionMediaSelections((current) => {
          const next = { ...current };
          delete next[uploadKey];
          return next;
        });
        showToast({
          message:
            mode === 'edit' ? '문제 영상을 연결했습니다.' : '문제 영상을 초안에 연결했습니다.',
          variant: 'success',
        });
        return;
      }

      const uploadTarget = await createAdminProblemMediaUploadTarget({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
      });

      await uploadAdminProblemMediaFile(uploadTarget.uploadUrl, file);
      updateProblemQuestion(lectureKey, questionIndex, (question) => ({
        ...question,
        mediaAssetId: uploadTarget.assetId,
        mediaType: uploadTarget.mediaType,
        mediaUploadErrorMessage: null,
        mediaUploadFileName: file.name,
        mediaUploadStatus: 'READY',
        mediaUrl: uploadTarget.previewUrl,
        mediaVideoId: null,
      }));
      if (draftId !== null) {
        await persistProblemQuestionMediaUploadState(draftId, lectureKey, questionIndex, {
          errorMessage: null,
          fileName: file.name,
          mediaAssetId: uploadTarget.assetId,
          mediaType: uploadTarget.mediaType,
          mediaUrl: uploadTarget.previewUrl,
          mediaVideoId: null,
          status: 'READY',
        });
      }

      setQuestionUploadStatus((current) => ({
        ...current,
        [uploadKey]: '업로드 완료',
      }));
      setPendingQuestionMediaSelections((current) => {
        const next = { ...current };
        delete next[uploadKey];
        return next;
      });
      showToast({
        message:
          mode === 'edit' ? '문제 미디어를 연결했습니다.' : '문제 미디어를 초안에 연결했습니다.',
        variant: 'success',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '문제 미디어 업로드에 실패했습니다.';
      updateProblemQuestion(lectureKey, questionIndex, (question) => ({
        ...question,
        mediaUploadErrorMessage: errorMessage,
        mediaUploadStatus: 'FAILED',
      }));
      if (draftId !== null) {
        try {
          await persistProblemQuestionMediaUploadState(draftId, lectureKey, questionIndex, {
            errorMessage,
            fileName: file.name,
            status: 'FAILED',
          });
        } catch {
          // Preserve local failure state even if status persistence fails.
        }
      }
      setQuestionUploadStatus((current) => ({
        ...current,
        [uploadKey]: '업로드 실패',
      }));
      showToast({
        message: errorMessage,
        variant: 'error',
      });
    }
  };

  const handleLectureResourceSelection = (resourceKey: string, file: File) => {
    const validationMessage = validateResourceDocumentWithImagePolicy({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (validationMessage) {
      showToast({ message: validationMessage, variant: 'error' });
      return;
    }

    setPendingResourceSelections((current) => ({
      ...current,
      [resourceKey]: {
        file,
        sizeLabel: `${formatFileSizeInMb(file.size)} MB`,
      },
    }));
  };

  const handleLectureResourceUpload = async (
    resourceIndex: number,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    const resource = payload?.resources[resourceIndex];
    if (!resource) {
      return;
    }
    const pendingSelection = pendingResourceSelections[resource.key];
    if (!pendingSelection) {
      showToast({
        message: '먼저 업로드할 자료 파일을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    const file = pendingSelection.file;

    setUploadProgressModal({
      description: '자료 업로드가 끝날 때까지 잠시 기다려 주세요.',
      title: '첨부자료 업로드 중',
    });

    try {
      if (
        !(await flushPendingDraftSave({
          event,
          hintMessage: '자료 업로드 전에 입력값을 확인해 주세요.',
          pendingThumbnailAction: 'upload',
        }))
      ) {
        return;
      }
      if (draftId === null) {
        throw new Error(
          mode === 'edit'
            ? '프로그램 수정 화면을 먼저 준비해 주세요.'
            : '프로그램 초안을 먼저 저장해 주세요.',
        );
      }

      updateResource(resourceIndex, (current) => ({
        ...current,
        fileName: null,
        fileSize: null,
        fileUrl: null,
        mimeType: null,
        uploadErrorMessage: null,
        uploadStatus: 'UPLOADING',
      }));
      await persistResourceUploadState(draftId, resource.key, {
        errorMessage: null,
        status: 'UPLOADING',
      });
      setPendingResourceSelections((current) => {
        const next = { ...current };
        delete next[resource.key];
        return next;
      });

      const uploadTarget = await createAdminResourceUploadTarget({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
      });

      await uploadAdminResourceFile(uploadTarget.uploadUrl, file);

      updateResource(resourceIndex, (current) => ({
        ...current,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: uploadTarget.fileUrl,
        mimeType: file.type || 'application/octet-stream',
        title: current.title?.trim() ? current.title : deriveResourceTitleFromFileName(file.name),
        uploadErrorMessage: null,
        uploadStatus: 'READY',
      }));
      await persistResourceUploadState(draftId, resource.key, {
        errorMessage: null,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: uploadTarget.fileUrl,
        mimeType: file.type || 'application/octet-stream',
        status: 'READY',
      });
      showToast({
        message: mode === 'edit' ? '강의 자료를 연결했습니다.' : '강의 자료를 초안에 연결했습니다.',
        variant: 'success',
      });
    } catch (error) {
      updateResource(resourceIndex, (current) => ({
        ...current,
        uploadErrorMessage:
          error instanceof Error ? error.message : '강의 자료 업로드에 실패했습니다.',
        uploadStatus: 'FAILED',
      }));
      if (draftId !== null) {
        try {
          await persistResourceUploadState(draftId, resource.key, {
            errorMessage:
              error instanceof Error ? error.message : '강의 자료 업로드에 실패했습니다.',
            status: 'FAILED',
          });
        } catch {
          // Preserve local failure state even if status persistence fails.
        }
      }
      showToast({
        message: error instanceof Error ? error.message : '강의 자료 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setUploadProgressModal(null);
    }
  };

  const isBootstrappingDraft =
    draftId === null
      ? createDraftMutation.isPending && payload === null
      : detailQuery.isPending && payload === null;

  if (isBootstrappingDraft) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>
          {mode === 'edit'
            ? '프로그램 수정 화면을 준비하는 중입니다.'
            : '통합 등록 워크스페이스를 준비하는 중입니다.'}
        </h1>
        <p className={styles['stateDescription']}>
          {mode === 'edit'
            ? '프로그램 수정 데이터를 불러오고 있습니다.'
            : '프로그램 초안과 기본 데이터를 불러오고 있습니다.'}
        </p>
      </section>
    );
  }

  if (createDraftMutation.isError || detailQuery.isError || categoriesQuery.isError) {
    const error = createDraftMutation.error || detailQuery.error || categoriesQuery.error;

    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>
          {mode === 'edit'
            ? '프로그램 수정 화면을 불러오지 못했습니다.'
            : '통합 등록 화면을 불러오지 못했습니다.'}
        </h1>
        <p className={styles['stateDescription']}>
          {error instanceof Error
            ? error.message
            : mode === 'edit'
              ? '프로그램 수정 화면 준비에 실패했습니다.'
              : '프로그램 초안 준비에 실패했습니다.'}
        </p>
      </section>
    );
  }

  if (payload === null) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>
          {mode === 'edit'
            ? '프로그램 수정 화면을 준비하는 중입니다.'
            : '통합 등록 워크스페이스를 준비하는 중입니다.'}
        </h1>
        <p className={styles['stateDescription']}>
          {mode === 'edit'
            ? '프로그램 수정 데이터를 마무리하고 있습니다.'
            : '프로그램 초안 데이터를 마무리하고 있습니다.'}
        </p>
      </section>
    );
  }

  const createDraftSearch = draftId === null ? '' : `?draftId=${String(draftId)}`;
  const basicInfoIssues: DraftValidationIssue[] = [];
  if (payload.basicInfo.categoryId === null) {
    basicInfoIssues.push({
      errorKey: 'category',
      focusKey: 'basic-category',
      message: '기본정보: 카테고리를 선택해 주세요.',
    });
  }
  if (!payload.basicInfo.title?.trim()) {
    basicInfoIssues.push({
      errorKey: 'title',
      focusKey: 'basic-title',
      message: '기본정보: 프로그램명을 입력해 주세요.',
    });
  }
  if (payload.basicInfo.price === null || payload.basicInfo.price === undefined) {
    basicInfoIssues.push({
      errorKey: 'price',
      focusKey: 'basic-price',
      message: '기본정보: 정가를 입력해 주세요.',
    });
  }
  const basicInfoInputIssues = buildBasicInfoInputValidationIssues(
    payload.basicInfo,
    numericInputValues,
    discountPercentInput,
  );
  const duplicatePeriodIssues = buildDuplicatePeriodValidationIssues(
    payload.basicInfo,
    mode,
    Date.now(),
  );
  const structuredInfoIssues = buildStructuredInfoFinalizeIssues(payload.basicInfo);
  const curriculumSectionIssues = payload.sections.flatMap((section) => {
    const sectionLabel = section.title?.trim() || '미제목 섹션';
    return section.title?.trim()
      ? []
      : [
          {
            focusKey: `curriculum-sectionTitle-${section.key}`,
            message: `${sectionLabel}: 섹션명을 입력해 주세요.`,
          },
        ];
  });
  const blockingFinalizeIssues = payload.sections.flatMap((section) =>
    section.lectures.flatMap((lecture) => {
      const issues: Array<{ focusKey?: string; message: string }> = [];
      const sectionLabel = section.title?.trim() || '미제목 섹션';
      const lectureLabel = lecture.title?.trim() || '미제목 강의';
      if (!lecture.title?.trim()) {
        issues.push({
          focusKey: `curriculum-lectureTitle-${lecture.key}`,
          message: `${sectionLabel} / ${lectureLabel}: 강의명을 입력해 주세요.`,
        });
      }
      if (pendingVideoSelections[lecture.key]) {
        issues.push({
          focusKey: `curriculum-lecture-${lecture.key}`,
          message: `${lectureLabel}: 선택한 영상 파일 업로드 시작이 필요합니다.`,
        });
      }
      if (
        lecture.videoId === null &&
        (lecture.videoUploadStatus === 'UPLOADING' || lecture.videoUploadStatus === 'PROCESSING')
      ) {
        issues.push({
          focusKey: `curriculum-lecture-${lecture.key}`,
          message: `${lectureLabel}: 영상 업로드 또는 인코딩이 아직 진행 중입니다.`,
        });
      }

      const lectureResources = payload.resources.filter(
        (resource) => resource.lectureKey === lecture.key,
      );
      for (const resource of lectureResources) {
        const resourceLabel = resource.title?.trim() || '미제목 자료';
        if (!resource.title?.trim()) {
          issues.push({
            focusKey: `curriculum-resource-${resource.key}`,
            message: `${lectureLabel} / ${resourceLabel}: 자료 제목을 입력해 주세요.`,
          });
        }
        if (pendingResourceSelections[resource.key]) {
          issues.push({
            focusKey: `curriculum-resource-${resource.key}`,
            message: `${lectureLabel} / ${resourceLabel}: 선택한 자료 파일 업로드 시작이 필요합니다.`,
          });
          continue;
        }
        if (resource.uploadStatus === 'UPLOADING' || resource.uploadStatus === 'PROCESSING') {
          issues.push({
            focusKey: `curriculum-resource-${resource.key}`,
            message: `${lectureLabel} / ${resourceLabel}: 자료 업로드가 아직 진행 중입니다.`,
          });
          continue;
        }
        if (resource.uploadStatus === 'FAILED') {
          issues.push({
            focusKey: `curriculum-resource-${resource.key}`,
            message: `${lectureLabel} / ${resourceLabel}: 자료 업로드가 실패했습니다.`,
          });
          continue;
        }
        if (!resource.fileUrl || !resource.fileName || !resource.fileSize) {
          issues.push({
            focusKey: `curriculum-resource-${resource.key}`,
            message: `${lectureLabel} / ${resourceLabel}: 자료 파일을 업로드해야 합니다.`,
          });
        }
      }

      const lectureProblem = payload.problems.find((problem) => problem.lectureKey === lecture.key);
      if (isProblemLecture(lecture) && (!lectureProblem || lectureProblem.questions.length === 0)) {
        issues.push({
          focusKey: `curriculum-lecture-${lecture.key}`,
          message: `${sectionLabel} / ${lectureLabel}: 문제풀이 강의에는 문제를 1개 이상 추가해야 합니다.`,
        });
      }
      if (lectureProblem && lectureProblem.passScore === null) {
        issues.push({
          focusKey: `curriculum-${lecture.key}:0:passScore`,
          message: `${lectureLabel}: 합격 점수를 입력해 주세요.`,
        });
      }
      if (lectureProblem && lectureProblem.problemAreaId === null) {
        issues.push({
          focusKey: `curriculum-lecture-${lecture.key}`,
          message: `${lectureLabel}: 문제영역 카테고리를 선택해 주세요.`,
        });
      }
      lectureProblem?.questions.forEach((question, questionIndex) => {
        const questionUploadKey = `${lecture.key}:${String(questionIndex)}`;
        const questionLabel = question.questionText.trim() || `문제 ${String(questionIndex + 1)}`;
        if (question.problemAreaId === null) {
          issues.push({
            focusKey: `curriculum-${lecture.key}:${String(questionIndex)}:problemArea`,
            message: `${lectureLabel} / ${questionLabel}: 문제영역을 선택해 주세요.`,
          });
        }
        if (!question.questionText.trim()) {
          issues.push({
            focusKey: `curriculum-${lecture.key}:${String(questionIndex)}:questionText`,
            message: `${lectureLabel} / ${questionLabel}: 문제 내용을 입력해 주세요.`,
          });
        }
        question.options.forEach((option, optionIndex) => {
          if (!option.optionText.trim()) {
            issues.push({
              focusKey: `curriculum-${lecture.key}:${String(questionIndex)}:option-${String(optionIndex)}`,
              message: `${lectureLabel} / ${questionLabel}: ${formatQuizOptionLabel(optionIndex)} 보기 내용을 입력해 주세요.`,
            });
          }
        });
        if (pendingQuestionMediaSelections[questionUploadKey]) {
          issues.push({
            focusKey: `curriculum-${lecture.key}:${String(questionIndex)}:media`,
            message: `${lectureLabel} / ${questionLabel}: 선택한 문제 미디어 업로드 시작이 필요합니다.`,
          });
          return;
        }
        if (isUploadInProgress(question.mediaUploadStatus)) {
          issues.push({
            focusKey: `curriculum-${lecture.key}:${String(questionIndex)}:media`,
            message: `${lectureLabel} / ${questionLabel}: 문제 미디어 업로드가 아직 진행 중입니다.`,
          });
          return;
        }
        if (question.mediaUploadStatus === 'FAILED') {
          issues.push({
            focusKey: `curriculum-${lecture.key}:${String(questionIndex)}:media`,
            message: `${lectureLabel} / ${questionLabel}: 문제 미디어 업로드가 실패했습니다.`,
          });
          return;
        }
        if (
          question.mediaUploadStatus === 'READY' &&
          question.mediaAssetId === null &&
          question.mediaVideoId === null &&
          !question.mediaUrl
        ) {
          issues.push({
            focusKey: `curriculum-${lecture.key}:${String(questionIndex)}:media`,
            message: `${lectureLabel} / ${questionLabel}: 문제 미디어 연결 정보가 누락되었습니다.`,
          });
        }
      });

      return issues;
    }),
  );
  const allFinalizeIssues = [
    ...basicInfoInputIssues,
    ...duplicatePeriodIssues,
    ...basicInfoIssues,
    ...structuredInfoIssues,
    ...curriculumSectionIssues,
    ...blockingFinalizeIssues,
  ];
  const blockingUploadMessages = allFinalizeIssues
    .filter((issue) => !issue.focusKey)
    .map((issue) => issue.message);
  const autoHiddenVideoMessages = payload.sections.flatMap((section) =>
    section.lectures.flatMap((lecture) => {
      if (!shouldAutoHideVideoLectureOnFinalize(lecture)) {
        return [];
      }

      const lectureLabel = lecture.title?.trim() || '미제목 강의';
      return [`${lectureLabel}: 영상이 없어 비공개로 저장됩니다.`];
    }),
  );
  const applyBasicInfoValidationErrors = (issues: DraftValidationIssue[]) => {
    const nextErrors: Record<string, string | undefined> = {};
    for (const issue of issues) {
      if (issue.errorKey) {
        nextErrors[issue.errorKey] = issue.message;
      }
    }
    setBasicInfoErrors((current) => ({
      ...current,
      category: nextErrors['category'],
      discountPercent: nextErrors['discountPercent'],
      learningRange: nextErrors['learningRange'],
      maxStudents: nextErrors['maxStudents'],
      price: nextErrors['price'],
      recruitmentRange: nextErrors['recruitmentRange'],
      title: nextErrors['title'],
    }));
  };
  const showDraftFocusHint = (message: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (draftFocusHintTimerRef.current !== null) {
      window.clearTimeout(draftFocusHintTimerRef.current);
    }

    const hintWidth = 320;
    const hintHeight = 96;
    setDraftFocusHint({
      message,
      x: Math.min(event.clientX + 16, Math.max(16, window.innerWidth - hintWidth)),
      y: Math.min(event.clientY + 16, Math.max(16, window.innerHeight - hintHeight)),
    });
    draftFocusHintTimerRef.current = window.setTimeout(() => {
      setDraftFocusHint(null);
      draftFocusHintTimerRef.current = null;
    }, 2600);
  };
  const focusDraftFieldTarget = (focusKey: string): boolean => {
    const target = Array.from(
      document.querySelectorAll<HTMLElement>('[data-draft-focus-key]'),
    ).find((element) => element.dataset['draftFocusKey'] === focusKey);
    if (!target) {
      return false;
    }

    const focusTarget = target.matches('button, input, textarea, select, [tabindex]')
      ? target
      : target.querySelector<HTMLElement>('button, input, textarea, select, [tabindex]');
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      focusTarget?.focus();
    }, 160);
    return true;
  };
  const focusDraftField = (focusKey: string): boolean => {
    if (focusKey.startsWith('basic-') && activeView !== 'details') {
      handleDraftNavigation(`${baseDetailsPath}${createDraftSearch}`);
      window.setTimeout(() => {
        focusDraftFieldTarget(focusKey);
      }, 220);
      return true;
    }

    if (focusKey.startsWith('curriculum-') && activeView !== 'curriculum') {
      const curriculumFocusKey = focusKey.slice('curriculum-'.length);
      handleDraftNavigation(`${baseCurriculumPath}${createDraftSearch}`);
      window.setTimeout(() => {
        focusDraftField(curriculumFocusKey);
      }, 220);
      return true;
    }
    if (focusKey.startsWith('curriculum-')) {
      return focusDraftField(focusKey.slice('curriculum-'.length));
    }

    if (focusKey.startsWith('sectionTitle-')) {
      const sectionKey = focusKey.slice('sectionTitle-'.length);
      if (!expandedSectionKeys.includes(sectionKey)) {
        setExpandedSectionKeys((current) =>
          current.includes(sectionKey) ? current : [...current, sectionKey],
        );
        window.setTimeout(() => {
          focusDraftFieldTarget(focusKey);
        }, 220);
        return true;
      }
    }

    if (focusKey.startsWith('lectureTitle-')) {
      const lectureKey = focusKey.slice('lectureTitle-'.length);
      const parentSection = payload.sections.find((section) =>
        section.lectures.some((lecture) => lecture.key === lectureKey),
      );
      const needsSectionExpand = parentSection && !expandedSectionKeys.includes(parentSection.key);
      const needsLectureExpand = !expandedLectureKeys.includes(lectureKey);

      if (needsSectionExpand || needsLectureExpand) {
        if (parentSection) {
          setExpandedSectionKeys((current) =>
            current.includes(parentSection.key) ? current : [...current, parentSection.key],
          );
        }
        setExpandedLectureKeys((current) =>
          current.includes(lectureKey) ? current : [...current, lectureKey],
        );
        window.setTimeout(() => {
          focusDraftFieldTarget(focusKey);
        }, 220);
        return true;
      }
    }

    if (focusKey.startsWith('lecture-')) {
      const lectureKey = focusKey.slice('lecture-'.length);
      const parentSection = payload.sections.find((section) =>
        section.lectures.some((lecture) => lecture.key === lectureKey),
      );
      if (parentSection && !expandedSectionKeys.includes(parentSection.key)) {
        setExpandedSectionKeys((current) =>
          current.includes(parentSection.key) ? current : [...current, parentSection.key],
        );
        window.setTimeout(() => {
          focusDraftFieldTarget(focusKey);
        }, 220);
        return true;
      }
    }

    if (focusKey.startsWith('resource-')) {
      const resourceKey = focusKey.slice('resource-'.length);
      const resource = payload.resources.find((item) => item.key === resourceKey);
      const parentSection = resource
        ? payload.sections.find((section) =>
            section.lectures.some((lecture) => lecture.key === resource.lectureKey),
          )
        : null;
      const needsSectionExpand = parentSection && !expandedSectionKeys.includes(parentSection.key);
      const needsLectureExpand =
        resource?.lectureKey && !expandedLectureKeys.includes(resource.lectureKey);

      if (needsSectionExpand || needsLectureExpand) {
        if (parentSection) {
          setExpandedSectionKeys((current) =>
            current.includes(parentSection.key) ? current : [...current, parentSection.key],
          );
        }
        if (resource?.lectureKey) {
          setExpandedLectureKeys((current) =>
            current.includes(resource.lectureKey) ? current : [...current, resource.lectureKey],
          );
        }
        window.setTimeout(() => {
          focusDraftFieldTarget(focusKey);
        }, 220);
        return true;
      }
    }

    const [lectureKey, questionIndexPart] = focusKey.split(':');
    if (lectureKey && questionIndexPart) {
      const questionKey = `${lectureKey}:${questionIndexPart}`;
      const parentSection = payload.sections.find((section) =>
        section.lectures.some((lecture) => lecture.key === lectureKey),
      );
      if (parentSection && !expandedSectionKeys.includes(parentSection.key)) {
        setExpandedSectionKeys((current) =>
          current.includes(parentSection.key) ? current : [...current, parentSection.key],
        );
      }
      if (!expandedLectureKeys.includes(lectureKey)) {
        setExpandedLectureKeys((current) =>
          current.includes(lectureKey) ? current : [...current, lectureKey],
        );
      }
      if (collapsedProblemQuestionKeys.includes(questionKey)) {
        setCollapsedProblemQuestionKeys((current) => current.filter((key) => key !== questionKey));
      }
      if (
        (parentSection && !expandedSectionKeys.includes(parentSection.key)) ||
        !expandedLectureKeys.includes(lectureKey) ||
        collapsedProblemQuestionKeys.includes(questionKey)
      ) {
        window.setTimeout(() => {
          focusDraftFieldTarget(focusKey);
        }, 220);
        return true;
      }
    }

    return focusDraftFieldTarget(focusKey);
  };
  const activeView: Exclude<AdminProgramCreateView, 'problems' | 'resources'> =
    view === 'problems' || view === 'resources' ? 'curriculum' : view;
  const baseDetailsPath =
    mode === 'edit' && editProgramId !== null
      ? routePaths.adminProgramEdit(String(editProgramId))
      : routePaths.adminProgramCreate;
  const baseCurriculumPath =
    mode === 'edit' && editProgramId !== null
      ? routePaths.adminProgramCurriculum(String(editProgramId))
      : routePaths.adminProgramCreateCurriculum;
  const createTabs: ReadonlyArray<{
    key: Exclude<AdminProgramCreateView, 'problems' | 'resources'>;
    label: string;
    path: string;
  }> = [
    {
      key: 'details',
      label: '기본정보',
      path: `${baseDetailsPath}${createDraftSearch}`,
    },
    {
      key: 'curriculum',
      label: '강의 구성',
      path: `${baseCurriculumPath}${createDraftSearch}`,
    },
  ];

  return (
    <section className={styles['workspace']}>
      {draftFocusHint ? (
        <div
          aria-live='polite'
          className={styles['draftFocusHint']}
          role='status'
          style={{ left: draftFocusHint.x, top: draftFocusHint.y }}
        >
          {draftFocusHint.message}
        </div>
      ) : null}
      <section className={styles['editorShell']}>
        <div className={styles['editorToolbar']}>
          <Button
            onClick={() => {
              handleDraftNavigation(routePaths.adminPrograms);
            }}
            type='button'
            variant='secondary'
          >
            목록으로 돌아가기
          </Button>

          <div className={styles['editorToolbarActions']}>
            <Button
              disabled={saveMutation.isPending || finalizeMutation.isPending}
              onClick={(event) => {
                void handleManualSave(event);
              }}
              type='button'
              variant='secondary'
            >
              {saveMutation.isPending ? '저장 중...' : '임시저장'}
            </Button>
            <Button
              disabled={finalizeMutation.isPending || discardMutation.isPending}
              onClick={(event) => {
                const duplicatePeriodIssuesAtSubmit = buildDuplicatePeriodValidationIssues(
                  payload.basicInfo,
                  mode,
                  Date.now(),
                );
                const focusableFinalizeIssueAtSubmit = [
                  ...basicInfoInputIssues,
                  ...duplicatePeriodIssuesAtSubmit,
                  ...basicInfoIssues,
                  ...structuredInfoIssues,
                  ...curriculumSectionIssues,
                  ...blockingFinalizeIssues,
                ].find((issue) => issue.focusKey);
                applyBasicInfoValidationErrors([
                  ...basicInfoInputIssues,
                  ...duplicatePeriodIssuesAtSubmit,
                  ...basicInfoIssues,
                ]);
                if (focusableFinalizeIssueAtSubmit?.focusKey) {
                  focusDraftField(focusableFinalizeIssueAtSubmit.focusKey);
                  showDraftFocusHint(focusableFinalizeIssueAtSubmit.message, event);
                  showToast({
                    message: focusableFinalizeIssueAtSubmit.message,
                    variant: 'error',
                  });
                  return;
                }
                if (blockingUploadMessages.length > 0) {
                  const message = blockingUploadMessages[0] ?? '업로드 항목을 확인해 주세요.';
                  showDraftFocusHint(message, event);
                  showToast({
                    message,
                    variant: 'error',
                  });
                  return;
                }
                if (mode === 'edit' && editProgramId !== null) {
                  const workspaceDetail = detailQuery.data ?? createDraftMutation.data;
                  if (workspaceDetail?.finalProgramId !== editProgramId) {
                    showToast({
                      message:
                        '현재 수정 초안이 이 프로그램과 연결되어 있지 않습니다. 프로그램 목록에서 수정을 다시 시작해 주세요.',
                      variant: 'error',
                    });
                    return;
                  }

                  const originalProgram = originalProgramQuery.data;
                  if (!originalProgram) {
                    showToast({
                      message: originalProgramQuery.isError
                        ? '기존 프로그램의 수강 기간을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
                        : '기존 프로그램의 수강 기간을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.',
                      variant: 'error',
                    });
                    return;
                  }

                  const reactivationNow = Date.now();
                  const extensionContext = resolveFixedDurationExtensionContext(
                    originalProgram,
                    payload.basicInfo,
                    reactivationNow,
                  );

                  if (extensionContext) {
                    const originalEnrollments = originalProgramEnrollmentsQuery.data;
                    if (!originalEnrollments) {
                      showToast({
                        message: originalProgramEnrollmentsQuery.isError
                          ? '기존 만료 수강권을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
                          : '기존 만료 수강권을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.',
                        variant: 'error',
                      });
                      return;
                    }

                    const reactivatedEnrollmentCount =
                      countEnrollmentsReactivatedByFixedDurationExtension(
                        originalEnrollments,
                        extensionContext.previousLearningEndTime,
                        reactivationNow,
                      );

                    if (
                      reactivatedEnrollmentCount > 0 &&
                      !window.confirm(
                        `수강 종료일을 연장하면 기존 만료 수강권 ${String(reactivatedEnrollmentCount)}개가 새 종료일까지 다시 활성화됩니다.\n기존 수강생에게 수강 권한을 다시 부여하시겠습니까?`,
                      )
                    ) {
                      return;
                    }
                  }
                }
                if (draftId !== null) {
                  finalizeMutation.mutate(draftId);
                }
              }}
              type='button'
            >
              {finalizeMutation.isPending
                ? mode === 'edit'
                  ? '반영 중...'
                  : '등록 중...'
                : mode === 'edit'
                  ? '수정 완료'
                  : '등록 완료'}
            </Button>
            <Button
              disabled={discardMutation.isPending || finalizeMutation.isPending}
              onClick={handleDiscard}
              type='button'
              variant='danger'
            >
              {mode === 'edit' ? '수정 취소' : '초안 폐기'}
            </Button>
          </div>
        </div>

        <div className={styles['editorHeaderCompact']}>
          <div className={styles['pageHeader']}>
            <h1 className={styles['pageTitle']}>
              {mode === 'edit' ? '프로그램 수정' : '새 프로그램 통합 등록'}
            </h1>
          </div>
          <div className={styles['editorMetaRow']}>
            <span className={styles['badge']}>
              {mode === 'edit' ? `프로그램 #${String(editProgramId)}` : `초안 #${String(draftId)}`}
            </span>
            <span className={styles['badgeAccent']}>
              {saveState === 'saved'
                ? '저장됨'
                : saveState === 'saving'
                  ? '저장 중'
                  : saveState === 'dirty'
                    ? '변경 사항 있음'
                    : '저장 실패'}
            </span>
            <span className={styles['badge']}>마지막 저장 {formatDateTime(lastSavedAt)}</span>
            {blockingUploadMessages.length ? (
              <span className={styles['badge']}>
                {mode === 'edit' ? '확인 항목 처리 후 수정 가능' : '확인 항목 처리 후 등록 가능'}
              </span>
            ) : null}
            {autoHiddenVideoMessages.length ? (
              <span className={styles['badge']}>영상 없는 강의는 비공개 저장</span>
            ) : null}
          </div>
        </div>

        {blockingUploadMessages.length ? (
          <div className={styles['uploadBlockingSummary']}>
            <strong className={styles['panelTitle']}>
              {mode === 'edit' ? '수정 완료 전에 확인할 항목' : '등록 전에 확인할 항목'}
            </strong>
            <div className={styles['stackListCompact']}>
              {blockingUploadMessages.map((message) => (
                <p className={styles['metaText']} key={message}>
                  {message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        {autoHiddenVideoMessages.length ? (
          <div className={styles['uploadBlockingSummary']}>
            <strong className={styles['panelTitle']}>
              {mode === 'edit'
                ? '수정 완료 시 비공개로 저장되는 강의'
                : '등록 완료 시 비공개로 저장되는 강의'}
            </strong>
            <div className={styles['stackListCompact']}>
              {autoHiddenVideoMessages.map((message) => (
                <p className={styles['metaText']} key={message}>
                  {message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {navigationBlocker.state === 'blocked' ? (
        <Modal
          description='저장하지 않은 변경 사항이 있습니다. 저장하지 않고 이동하면 현재 입력 내용이 사라집니다.'
          onClose={handleStayOnPage}
          title='페이지를 이동하시겠습니까?'
        >
          <div className={styles['stackList']}>
            <p className={styles['helperText']}>
              {mode === 'edit'
                ? '수정 완료하지 않은 내용은 다른 페이지로 이동하면 반영되지 않습니다.'
                : '임시저장 버튼을 누르지 않은 내용은 다른 페이지로 이동하면 복구되지 않습니다.'}
            </p>
            <div className={styles['actionRow']}>
              <Button onClick={handleStayOnPage} type='button' variant='secondary'>
                {mode === 'edit' ? '계속 수정' : '계속 작성'}
              </Button>
              {mode === 'create' ? (
                <Button
                  disabled={navigationDecisionState === 'saving'}
                  onClick={() => {
                    void handleSaveAndLeave();
                  }}
                  type='button'
                  variant='secondary'
                >
                  {navigationDecisionState === 'saving' ? '저장 중...' : '저장 후 이동'}
                </Button>
              ) : null}
              <Button
                disabled={navigationDecisionState === 'saving'}
                onClick={handleLeaveWithoutSaving}
                type='button'
                variant='danger'
              >
                {mode === 'edit' ? '수정하지 않고 이동' : '저장하지 않고 이동'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {uploadProgressModal ? (
        <Modal
          description={uploadProgressModal.description}
          onClose={() => {
            return;
          }}
          title={uploadProgressModal.title}
        >
          <div className={styles['loadingModalBody']}>
            <LoadingSpinner />
            <p className={styles['loadingModalText']}>{uploadProgressModal.description}</p>
          </div>
        </Modal>
      ) : null}

      <section className={styles['editorWorkspacePanel']}>
        <nav
          aria-label={mode === 'edit' ? '프로그램 수정 섹션' : '새 프로그램 등록 섹션'}
          className={styles['workspaceTabs']}
        >
          <div className={styles['workspaceTabGroup']}>
            {createTabs.map((tab) => (
              <button
                aria-current={activeView === tab.key ? 'page' : undefined}
                className={
                  activeView === tab.key ? styles['workspaceTabActive'] : styles['workspaceTab']
                }
                key={tab.key}
                onClick={() => {
                  if (activeView === tab.key) {
                    return;
                  }
                  handleDraftNavigation(tab.path);
                }}
                type='button'
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className={styles['workspaceBody']}>
          <div className={styles['stackList']}>
            {activeView === 'details' ? (
              <section className={styles['panel']}>
                <div className={styles['panelToolbar']}>
                  <div>
                    <h2 className={styles['panelTitle']}>기본정보</h2>
                    <p className={styles['metaText']}>
                      프로그램의 핵심 정보와 판매 정책을 먼저 정리합니다.
                    </p>
                  </div>
                </div>

                <div className={styles['form']}>
                  <div data-draft-focus-key='basic-category'>
                    <AdminCategoryPicker
                      helperText='프로그램을 노출할 카테고리를 선택해 주세요.'
                      label='카테고리'
                      onChange={(nextValue) => {
                        setBasicInfoErrors((current) => ({ ...current, category: undefined }));
                        updateBasicInfo('categoryId', Number(nextValue));
                      }}
                      tree={categoriesQuery.data ?? []}
                      value={
                        payload.basicInfo.categoryId === null
                          ? ''
                          : String(payload.basicInfo.categoryId)
                      }
                    />
                    {basicInfoErrors['category'] ? (
                      <p className={styles['fieldErrorText']} role='alert'>
                        {basicInfoErrors['category']}
                      </p>
                    ) : null}
                  </div>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      data-draft-focus-key='basic-title'
                      errorMessage={basicInfoErrors['title']}
                      label='프로그램명'
                      name='draft-title'
                      onChange={(event) => {
                        const nextTitle = event.target.value;
                        setBasicInfoErrors((current) => ({ ...current, title: undefined }));
                        updatePayload((current) => ({
                          ...current,
                          basicInfo: {
                            ...current.basicInfo,
                            title: nextTitle,
                          },
                        }));
                      }}
                      value={payload.basicInfo.title ?? ''}
                    />
                  </div>

                  <div className={styles['compactFieldRow']}>
                    <AdminDropdownField
                      compact
                      label='프로그램 형태'
                      onChange={(nextValue) => {
                        updatePayload((current) => ({
                          ...current,
                          basicInfo: {
                            ...current.basicInfo,
                            programType: nextValue as AdminProgramType,
                          },
                        }));
                      }}
                      options={programTypeOptions}
                      value={payload.basicInfo.programType ?? 'ONLINE'}
                    />
                    <AdminDropdownField
                      compact
                      label='난이도'
                      onChange={(nextValue) => {
                        updateBasicInfo(
                          'level',
                          nextValue ? (nextValue as AdminProgramLevel) : null,
                        );
                      }}
                      options={levelOptions}
                      value={payload.basicInfo.level ?? ''}
                    />
                  </div>

                  <TextAreaField
                    label='프로그램 소개'
                    name='draft-description'
                    onChange={(event) => {
                      updateBasicInfo('description', event.target.value);
                    }}
                    value={payload.basicInfo.description ?? ''}
                  />

                  <div className={styles['mediaField']}>
                    <div className={styles['mediaFieldHeader']}>
                      <div className={styles['mediaFieldCopy']}>
                        <p className={styles['fieldLabel']}>대표 이미지</p>
                        <p className={styles['mediaFieldHint']}>
                          프로그램 카드와 상세 상단에 노출될 이미지를 선택합니다. 선택한 이미지는
                          업로드 시작을 누를 때 업로드됩니다.
                        </p>
                      </div>
                    </div>
                    <AdminImageCropField
                      accept={PROGRAM_THUMBNAIL_FILE_ACCEPT}
                      alt={
                        payload.basicInfo.title
                          ? `${payload.basicInfo.title} 대표 이미지`
                          : '프로그램 대표 이미지'
                      }
                      aspectRatio={4 / 3}
                      disabled={isUploadingThumbnail}
                      fileCaption={
                        pendingThumbnailSelection
                          ? `업로드 대기 중 · ${pendingThumbnailSelection.file.name} · ${pendingThumbnailSelection.sizeLabel}`
                          : null
                      }
                      imageUrl={payload.basicInfo.thumbnailPreviewUrl}
                      label='대표 이미지 미리보기'
                      onChange={(nextCrop) => {
                        updatePayload((current) => ({
                          ...current,
                          basicInfo: {
                            ...current.basicInfo,
                            thumbnailCropOffsetX: nextCrop.offsetX,
                            thumbnailCropOffsetY: nextCrop.offsetY,
                            thumbnailCropZoom: nextCrop.zoom,
                          },
                        }));
                      }}
                      onRemove={() => {
                        updatePayload((current) => ({
                          ...current,
                          basicInfo: {
                            ...current.basicInfo,
                            thumbnailCropOffsetX: DEFAULT_ADMIN_IMAGE_CROP.offsetX,
                            thumbnailCropOffsetY: DEFAULT_ADMIN_IMAGE_CROP.offsetY,
                            thumbnailCropZoom: DEFAULT_ADMIN_IMAGE_CROP.zoom,
                            thumbnailPreviewUrl: null,
                            thumbnailUrl: null,
                          },
                        }));
                        setPendingThumbnailSelection(null);
                      }}
                      onSelectFile={handleProgramThumbnailFileChange}
                      onUploadStart={() => {
                        void uploadPendingProgramThumbnail();
                      }}
                      uploadButtonDisabled={!pendingThumbnailSelection || isUploadingThumbnail}
                      uploadButtonLabel={isUploadingThumbnail ? '업로드 중...' : '업로드 시작'}
                      value={normalizeAdminImageCrop({
                        offsetX:
                          payload.basicInfo.thumbnailCropOffsetX ??
                          DEFAULT_ADMIN_IMAGE_CROP.offsetX,
                        offsetY:
                          payload.basicInfo.thumbnailCropOffsetY ??
                          DEFAULT_ADMIN_IMAGE_CROP.offsetY,
                        zoom: payload.basicInfo.thumbnailCropZoom ?? DEFAULT_ADMIN_IMAGE_CROP.zoom,
                      })}
                    />
                  </div>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      data-draft-focus-key='basic-price'
                      errorMessage={basicInfoErrors['price']}
                      inputMode='numeric'
                      label='정가'
                      name='draft-price'
                      onChange={(event) => {
                        handleNumericBasicInfoChange('price', '정가', event.target.value);
                      }}
                      value={numericInputValues.price}
                    />
                    <TextField
                      data-draft-focus-key='basic-discount-percent'
                      errorMessage={basicInfoErrors['discountPercent']}
                      inputMode='decimal'
                      label='할인율(%)'
                      name='draft-discount-percent'
                      onChange={(event) => {
                        handleDiscountPercentChange(event.target.value);
                      }}
                      value={discountPercentInput}
                    />
                  </div>

                  <div
                    className={classNames(
                      styles['inlineFieldGrid'],
                      styles['inlineFieldGridSingle'],
                    )}
                  >
                    <TextField
                      data-draft-focus-key='basic-max-students'
                      errorMessage={basicInfoErrors['maxStudents']}
                      inputMode='numeric'
                      label='정원'
                      name='draft-max-students'
                      onChange={(event) => {
                        handleNumericBasicInfoChange('maxStudents', '정원', event.target.value);
                      }}
                      value={numericInputValues.maxStudents}
                    />
                  </div>

                  <div data-draft-focus-key='basic-recruitment-range'>
                    <DateRangePickerField
                      endDate={recruitmentEndDate}
                      label='모집 기간'
                      onChange={handleRecruitmentRangeChange}
                      onReset={resetRecruitmentRange}
                      resetLabel='상시 모집'
                      startDate={recruitmentStartDate}
                      valueText={visibleRecruitmentRangeText}
                    />
                    {basicInfoErrors['recruitmentRange'] ? (
                      <p className={styles['fieldErrorText']} role='alert'>
                        {basicInfoErrors['recruitmentRange']}
                      </p>
                    ) : null}
                  </div>

                  <p className={styles['policyHint']}>
                    {payload.basicInfo.programType === 'OFFLINE'
                      ? '오프라인 프로그램은 개강일이 지나면 관리자 화면에서 개강됨 상태로 표시됩니다.'
                      : '모집 종료일을 비워 두면 상시 모집으로 운영할 수 있습니다.'}
                  </p>

                  <div className={styles['accessPeriodRow']}>
                    <AdminDropdownField
                      compact
                      label='수강 기간'
                      onChange={(nextValue) => {
                        const nextPolicy = nextValue as AdminProgramAccessPolicy;
                        updatePayload((current) => ({
                          ...current,
                          basicInfo: normalizeDraftBasicInfo({
                            ...current.basicInfo,
                            accessDays:
                              nextPolicy === 'FIXED_DURATION'
                                ? calculateAccessDaysFromLearningRange(
                                    current.basicInfo.learningStartAt,
                                    current.basicInfo.learningEndAt,
                                  )
                                : nextPolicy === 'ROLLING_DAYS'
                                  ? current.basicInfo.accessDays
                                  : null,
                            accessPolicy: nextPolicy,
                            learningEndAt:
                              nextPolicy === 'FIXED_DURATION'
                                ? current.basicInfo.learningEndAt
                                : null,
                            learningStartAt:
                              nextPolicy === 'FIXED_DURATION'
                                ? current.basicInfo.learningStartAt
                                : null,
                          }),
                        }));
                      }}
                      options={accessPolicyOptions}
                      value={payload.basicInfo.accessPolicy ?? 'UNLIMITED'}
                    />

                    <div className={styles['accessPeriodControl']}>
                      {payload.basicInfo.accessPolicy === 'FIXED_DURATION' ? (
                        <div data-draft-focus-key='basic-learning-range'>
                          <DateRangePickerField
                            endDate={learningEndDate}
                            label='지정 기간'
                            onChange={handleLearningRangeChange}
                            onReset={resetLearningRange}
                            resetLabel='기간 초기화'
                            startDate={learningStartDate}
                            valueText={visibleLearningRangeText}
                          />
                          {basicInfoErrors['learningRange'] ? (
                            <p className={styles['fieldErrorText']} role='alert'>
                              {basicInfoErrors['learningRange']}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {payload.basicInfo.accessPolicy === 'ROLLING_DAYS' ? (
                        <div data-draft-focus-key='basic-access-days'>
                          <TextField
                            errorMessage={basicInfoErrors['accessDays']}
                            inputMode='numeric'
                            label='결제일 기준 수강일수'
                            min={1}
                            name='draft-access-days'
                            onChange={(event) => {
                              handleRollingAccessDaysChange(event.target.value);
                            }}
                            placeholder='예: 90'
                            type='number'
                            value={payload.basicInfo.accessDays ?? ''}
                          />
                        </div>
                      ) : null}

                      {payload.basicInfo.accessPolicy === 'UNLIMITED' ? (
                        <p className={styles['policyHint']}>
                          무제한 수강은 지정 수강기간이나 결제일 기준 수강일수를 사용하지 않습니다.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <AdminFieldArray
                    addLabel='핵심 포인트 추가'
                    emptyMessage='등록된 핵심 포인트가 없습니다.'
                    helperText='강의 소개 첫 영역에 노출할 제목과 설명 카드를 입력합니다.'
                    items={payload.basicInfo.summaryItems}
                    label='핵심 포인트'
                    onAdd={() => {
                      addStructuredInfoItem('summaryItems');
                    }}
                    onRemove={(index) => {
                      removeStructuredInfoItem('summaryItems', index);
                    }}
                    renderItem={(item, index) => (
                      <div className={styles['summaryPointFieldGroup']}>
                        <TextField
                          data-draft-focus-key={buildStructuredInfoFocusKey(
                            'summaryItems',
                            index,
                            'label',
                          )}
                          label='핵심 포인트 제목'
                          name={`draft-summary-label-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'summaryItems',
                              index,
                              'label',
                              event.target.value,
                            );
                          }}
                          value={item.label}
                        />
                        <TextAreaField
                          data-draft-focus-key={buildStructuredInfoFocusKey(
                            'summaryItems',
                            index,
                            'value',
                          )}
                          label='핵심 포인트 설명'
                          name={`draft-summary-value-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'summaryItems',
                              index,
                              'value',
                              event.target.value,
                            );
                          }}
                          rows={4}
                          value={item.value}
                        />
                      </div>
                    )}
                  />

                  <AdminFieldArray
                    addLabel='학습 성과 추가'
                    emptyMessage='등록된 학습 성과가 없습니다.'
                    helperText='이 강의를 듣고 나면 할 수 있게 되는 제목과 설명을 입력합니다.'
                    items={payload.basicInfo.learningOutcomes ?? []}
                    label='학습 성과'
                    onAdd={() => {
                      addStructuredInfoItem('learningOutcomes');
                    }}
                    onRemove={(index) => {
                      removeStructuredInfoItem('learningOutcomes', index);
                    }}
                    renderItem={(item, index) => (
                      <div className={styles['summaryPointFieldGroup']}>
                        <TextField
                          data-draft-focus-key={buildStructuredInfoFocusKey(
                            'learningOutcomes',
                            index,
                            'label',
                          )}
                          label='학습 성과 제목'
                          name={`draft-learning-outcome-label-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'learningOutcomes',
                              index,
                              'label',
                              event.target.value,
                            );
                          }}
                          value={item.label}
                        />
                        <TextAreaField
                          data-draft-focus-key={buildStructuredInfoFocusKey(
                            'learningOutcomes',
                            index,
                            'value',
                          )}
                          label='학습 성과 설명'
                          name={`draft-learning-outcome-value-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'learningOutcomes',
                              index,
                              'value',
                              event.target.value,
                            );
                          }}
                          rows={4}
                          value={item.value}
                        />
                      </div>
                    )}
                  />

                  <AdminFieldArray
                    addLabel='추천 대상 추가'
                    emptyMessage='등록된 추천 대상이 없습니다.'
                    helperText='어떤 수강생에게 적합한 강의인지 정리합니다.'
                    items={payload.basicInfo.recommendedFor}
                    label='추천 대상'
                    onAdd={() => {
                      addStringListItem('recommendedFor');
                    }}
                    onRemove={(index) => {
                      removeStringListItem('recommendedFor', index);
                    }}
                    renderItem={(item, index) => (
                      <TextField
                        label={`추천 대상 ${String(index + 1)}`}
                        name={`draft-recommended-for-${String(index)}`}
                        onChange={(event) => {
                          updateStringList('recommendedFor', index, event.target.value);
                        }}
                        value={item}
                      />
                    )}
                  />

                  <AdminFieldArray
                    addLabel='체크리스트 추가'
                    emptyMessage='등록된 체크리스트가 없습니다.'
                    helperText='수강 전 준비사항이나 확인할 내용을 정리합니다.'
                    items={payload.basicInfo.checklists}
                    label='체크리스트'
                    onAdd={() => {
                      addStringListItem('checklists');
                    }}
                    onRemove={(index) => {
                      removeStringListItem('checklists', index);
                    }}
                    renderItem={(item, index) => (
                      <TextField
                        label={`체크리스트 ${String(index + 1)}`}
                        name={`draft-checklist-${String(index)}`}
                        onChange={(event) => {
                          updateStringList('checklists', index, event.target.value);
                        }}
                        value={item}
                      />
                    )}
                  />

                  <AdminFieldArray
                    addLabel='FAQ 추가'
                    emptyMessage='등록된 FAQ가 없습니다.'
                    helperText='자주 묻는 질문을 추가합니다.'
                    items={payload.basicInfo.faqs}
                    label='FAQ'
                    onAdd={addFaqItem}
                    onRemove={removeFaqItem}
                    renderItem={(item, index) => (
                      <div className={styles['faqFieldGrid']}>
                        <TextField
                          label='질문'
                          name={`draft-faq-question-${String(index)}`}
                          onChange={(event) => {
                            updateFaqItem(index, 'question', event.target.value);
                          }}
                          value={item.question}
                        />
                        <TextAreaField
                          label='답변'
                          name={`draft-faq-answer-${String(index)}`}
                          onChange={(event) => {
                            updateFaqItem(index, 'answer', event.target.value);
                          }}
                          value={item.answer}
                        />
                      </div>
                    )}
                  />
                </div>
              </section>
            ) : null}

            {activeView === 'curriculum' ? (
              <section className={styles['panel']}>
                <div className={styles['panelToolbar']}>
                  <div>
                    <h2 className={styles['panelTitle']}>강의 구성</h2>
                    <p className={styles['metaText']}>
                      통합등록에서도 섹션이 최상위입니다. 각 섹션을 펼친 뒤 강의를 만들고{' '}
                      {getCurriculumGuideText(payload.basicInfo.programType ?? null)}
                    </p>
                  </div>
                </div>

                <div className={styles['stackList']}>
                  {payload.sections.map((section, sectionIndex) => {
                    const sectionExpanded = expandedSectionKeys.includes(section.key);

                    return (
                      <article className={styles['curriculumSectionCard']} key={section.key}>
                        <div className={styles['curriculumHeader']}>
                          <div className={styles['curriculumSummary']}>
                            <div className={styles['curriculumBadgeRow']}>
                              <span className={styles['curriculumLevelBadge']} data-level='section'>
                                {`섹션 ${String(sectionIndex + 1)}`}
                              </span>
                              <span className={styles['curriculumLevelHint']}>
                                강의 구성 최상위 단위
                              </span>
                            </div>
                            <div className={styles['curriculumTitleRow']}>
                              <h3 className={styles['panelTitle']}>
                                {section.title?.trim() || '미제목 섹션'}
                              </h3>
                              <div className={styles['curriculumActionColumn']}>
                                <div className={styles['curriculumActionGrid']}>
                                  <Button
                                    className={styles['curriculumActionButton']}
                                    disabled={sectionIndex === 0}
                                    onClick={() => {
                                      moveSection(section.key, 'up');
                                    }}
                                    type='button'
                                    variant='secondary'
                                  >
                                    위로 이동
                                  </Button>
                                  <Button
                                    className={styles['curriculumActionButton']}
                                    disabled={sectionIndex === payload.sections.length - 1}
                                    onClick={() => {
                                      moveSection(section.key, 'down');
                                    }}
                                    type='button'
                                    variant='secondary'
                                  >
                                    아래로 이동
                                  </Button>
                                  <Button
                                    className={styles['curriculumActionButton']}
                                    onClick={() => {
                                      toggleSectionExpanded(section.key);
                                    }}
                                    type='button'
                                    variant='secondary'
                                  >
                                    {sectionExpanded ? '섹션 접기' : '섹션 펼치기'}
                                  </Button>
                                  <Button
                                    className={styles['curriculumActionButton']}
                                    onClick={() => {
                                      removeSection(section.key);
                                    }}
                                    type='button'
                                    variant='danger'
                                  >
                                    섹션 삭제
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <p className={styles['metaText']}>
                              {section.description?.trim() || '섹션 설명이 아직 없습니다.'}
                            </p>
                          </div>
                        </div>

                        {sectionExpanded ? (
                          <div className={styles['curriculumBody']}>
                            <div className={styles['curriculumWorkspace']}>
                              <TextField
                                data-draft-focus-key={`sectionTitle-${section.key}`}
                                label='섹션명'
                                name={`section-title-${section.key}`}
                                onChange={(event) => {
                                  updateSection(section.key, (current) => ({
                                    ...current,
                                    title: event.target.value,
                                  }));
                                }}
                                value={section.title ?? ''}
                              />
                              <TextAreaField
                                label='섹션 설명'
                                name={`section-description-${section.key}`}
                                onChange={(event) => {
                                  updateSection(section.key, (current) => ({
                                    ...current,
                                    description: event.target.value,
                                  }));
                                }}
                                value={section.description ?? ''}
                              />
                            </div>

                            <div className={styles['curriculumLectureList']}>
                              {section.lectures.map((lecture, lectureIndex) => {
                                const lectureExpanded = expandedLectureKeys.includes(lecture.key);
                                const supportsVideo = supportsLectureVideo(lecture);
                                const supportsResource = isResourceLecture(lecture);
                                const supportsProblem = isProblemLecture(lecture);
                                const supportsOffline = isOfflineLecture(lecture);
                                const lectureQuiz =
                                  payload?.problems.find(
                                    (item) => item.lectureKey === lecture.key,
                                  ) ?? null;
                                const lectureQuizPassScore = lectureQuiz?.passScore ?? 80;
                                const lectureQuizPassCorrectCount = calculatePassCorrectCount(
                                  lectureQuizPassScore,
                                  lectureQuiz?.questions.length ?? 0,
                                );
                                const pendingVideoSelection =
                                  pendingVideoSelections[lecture.key] ?? null;
                                const lectureVideoStatus = pendingVideoSelection
                                  ? `업로드 대기 · ${pendingVideoSelection.sizeLabel}`
                                  : isUploadInProgress(lecture.videoUploadStatus)
                                    ? formatProgressLabel(
                                        lecture.videoUploadStatus === 'PROCESSING'
                                          ? formatVideoProcessingStageLabel(
                                              lectureVideoProcessingStageByKey[lecture.key],
                                            )
                                          : formatUploadStatusLabel(
                                              lecture.videoUploadStatus,
                                              lecture.videoId
                                                ? `연결 완료 · videoId ${String(lecture.videoId)}`
                                                : '영상 미연결',
                                              lecture.videoUploadErrorMessage,
                                            ),
                                        lectureVideoProgressByKey[lecture.key],
                                        true,
                                      )
                                    : formatUploadStatusLabel(
                                        lecture.videoUploadStatus,
                                        lecture.videoId
                                          ? `연결 완료 · videoId ${String(lecture.videoId)}`
                                          : '영상 미연결',
                                        lecture.videoUploadErrorMessage,
                                      );
                                const isLectureVideoInProgress = isUploadInProgress(
                                  lecture.videoUploadStatus,
                                );
                                const videoFileSizeLabel =
                                  pendingVideoSelection?.sizeLabel ??
                                  lectureVideoSizeLabels[lecture.key] ??
                                  null;
                                const cancelPendingVideoSelection = () => {
                                  setPendingVideoSelections((current) => {
                                    const next = { ...current };
                                    delete next[lecture.key];
                                    return next;
                                  });
                                  setLectureVideoSizeLabels((current) => {
                                    const next = { ...current };
                                    delete next[lecture.key];
                                    return next;
                                  });
                                };
                                return (
                                  <article
                                    className={styles['curriculumLectureCard']}
                                    data-draft-focus-key={`lecture-${lecture.key}`}
                                    key={lecture.key}
                                  >
                                    <div className={styles['curriculumHeader']}>
                                      <div className={styles['curriculumSummary']}>
                                        <div className={styles['curriculumBadgeRow']}>
                                          <span
                                            className={styles['curriculumLevelBadge']}
                                            data-level='lecture'
                                          >
                                            {formatDraftLectureCardLabel(
                                              lectureIndex,
                                              lecture.lectureType,
                                            )}
                                          </span>
                                        </div>
                                        <div className={styles['curriculumTitleRow']}>
                                          <h4 className={styles['panelTitle']}>
                                            {lecture.title?.trim() || '미제목 강의'}
                                          </h4>
                                          <div className={styles['curriculumActionColumn']}>
                                            <div className={styles['curriculumActionGrid']}>
                                              <Button
                                                className={styles['curriculumActionButton']}
                                                disabled={lectureIndex === 0}
                                                onClick={() => {
                                                  moveLecture(section.key, lecture.key, 'up');
                                                }}
                                                type='button'
                                                variant='secondary'
                                              >
                                                위로 이동
                                              </Button>
                                              <Button
                                                className={styles['curriculumActionButton']}
                                                disabled={
                                                  lectureIndex === section.lectures.length - 1
                                                }
                                                onClick={() => {
                                                  moveLecture(section.key, lecture.key, 'down');
                                                }}
                                                type='button'
                                                variant='secondary'
                                              >
                                                아래로 이동
                                              </Button>
                                              <Button
                                                className={styles['curriculumActionButton']}
                                                onClick={() => {
                                                  toggleLectureExpanded(lecture.key);
                                                }}
                                                type='button'
                                                variant='secondary'
                                              >
                                                {lectureExpanded ? '강의 접기' : '강의 펼치기'}
                                              </Button>
                                              <Button
                                                className={styles['curriculumActionButton']}
                                                onClick={() => {
                                                  removeLecture(section.key, lecture.key);
                                                }}
                                                type='button'
                                                variant='danger'
                                              >
                                                강의 삭제
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                        <p className={styles['metaText']}>
                                          {lecture.description?.trim() ||
                                            '강의 설명이 아직 없습니다.'}
                                        </p>
                                      </div>
                                    </div>

                                    {lectureExpanded ? (
                                      <div className={styles['curriculumBody']}>
                                        <div className={styles['curriculumWorkspace']}>
                                          <div className={styles['lectureWorkspaceSection']}>
                                            {supportsProblem ? (
                                              <AdminDropdownField
                                                className={styles['problemRootAreaField']}
                                                label='문제영역 카테고리'
                                                onChange={(nextValue) => {
                                                  updateProblemRootArea(
                                                    lecture.key,
                                                    nextValue ? Number(nextValue) : null,
                                                  );
                                                }}
                                                options={buildRootProblemAreaOptions(
                                                  lectureQuiz?.problemAreaId ?? null,
                                                )}
                                                placeholder='문제영역 카테고리 선택'
                                                value={
                                                  lectureQuiz?.problemAreaId
                                                    ? String(lectureQuiz.problemAreaId)
                                                    : ''
                                                }
                                              />
                                            ) : null}
                                            <TextField
                                              data-draft-focus-key={`lectureTitle-${lecture.key}`}
                                              label='강의명'
                                              name={`lecture-title-${lecture.key}`}
                                              onChange={(event) => {
                                                updateLecture(
                                                  section.key,
                                                  lecture.key,
                                                  (current) => ({
                                                    ...current,
                                                    title: event.target.value,
                                                  }),
                                                );
                                              }}
                                              value={lecture.title ?? ''}
                                            />

                                            <TextAreaField
                                              label='강의 설명'
                                              name={`lecture-description-${lecture.key}`}
                                              onChange={(event) => {
                                                updateLecture(
                                                  section.key,
                                                  lecture.key,
                                                  (current) => ({
                                                    ...current,
                                                    description: event.target.value,
                                                  }),
                                                );
                                              }}
                                              value={lecture.description ?? ''}
                                            />

                                            {supportsProblem ? (
                                              <>
                                                <div
                                                  className={classNames(
                                                    styles['compactFieldRow'],
                                                    styles['problemSettingsRow'],
                                                  )}
                                                >
                                                  <div className={styles['compactTextField']}>
                                                    <TextField
                                                      label='제한시간(분)'
                                                      name={`problem-time-limit-${lecture.key}`}
                                                      onChange={(event) => {
                                                        upsertProblem(lecture.key, (current) => ({
                                                          ...current,
                                                          timeLimitSeconds:
                                                            parseDurationMinutesInput(
                                                              event.target.value,
                                                            ),
                                                        }));
                                                      }}
                                                      value={formatDurationMinutesInput(
                                                        lectureQuiz?.timeLimitSeconds ?? null,
                                                      )}
                                                    />
                                                  </div>
                                                  <div className={styles['compactTextField']}>
                                                    <TextField
                                                      data-draft-focus-key={`${lecture.key}:0:passScore`}
                                                      label='합격 점수'
                                                      max={100}
                                                      min={0}
                                                      name={`problem-pass-score-${lecture.key}`}
                                                      onChange={(event) => {
                                                        upsertProblem(lecture.key, (current) => ({
                                                          ...current,
                                                          passScore: event.target.value.trim()
                                                            ? Number(event.target.value)
                                                            : null,
                                                        }));
                                                      }}
                                                      type='number'
                                                      value={
                                                        lectureQuiz?.passScore === null ||
                                                        lectureQuiz?.passScore === undefined
                                                          ? ''
                                                          : String(lectureQuiz.passScore)
                                                      }
                                                    />
                                                    <p className={styles['metaText']}>
                                                      현재{' '}
                                                      {String(lectureQuiz?.questions.length ?? 0)}
                                                      문항 기준{' '}
                                                      {String(lectureQuizPassCorrectCount)}문항 이상
                                                      정답이면 합격입니다.
                                                    </p>
                                                  </div>
                                                </div>
                                                <label
                                                  className={`${styles['checkboxRow']} ${styles['noticeCheckboxRow']}`}
                                                >
                                                  <input
                                                    checked={Boolean(lectureQuiz?.retakeAllowed)}
                                                    onChange={(event) => {
                                                      upsertProblem(lecture.key, (current) => ({
                                                        ...current,
                                                        retakeAllowed: event.target.checked,
                                                      }));
                                                    }}
                                                    type='checkbox'
                                                  />
                                                  <span
                                                    className={styles['noticeCheckboxBox']}
                                                    aria-hidden='true'
                                                  >
                                                    {lectureQuiz?.retakeAllowed ? (
                                                      <img alt='' src={checkIconSrc} />
                                                    ) : null}
                                                  </span>
                                                  <span>재도전 허용</span>
                                                </label>
                                              </>
                                            ) : null}
                                          </div>

                                          {supportsVideo ? (
                                            <div className={styles['lectureWorkspaceSection']}>
                                              <h5 className={styles['panelTitle']}>영상</h5>
                                              <div className={styles['curriculumStatGrid']}>
                                                <div className={styles['curriculumStatCard']}>
                                                  <span className={styles['curriculumStatLabel']}>
                                                    현재 상태
                                                  </span>
                                                  <strong className={styles['curriculumStatValue']}>
                                                    {isLectureVideoInProgress ? (
                                                      <span className={styles['inlineStatus']}>
                                                        <span
                                                          aria-hidden='true'
                                                          className={styles['inlineStatusSpinner']}
                                                        />
                                                        <span>{lectureVideoStatus}</span>
                                                      </span>
                                                    ) : (
                                                      lectureVideoStatus
                                                    )}
                                                  </strong>
                                                </div>
                                                <div className={styles['curriculumStatCard']}>
                                                  <span className={styles['curriculumStatLabel']}>
                                                    영상 길이
                                                  </span>
                                                  <strong className={styles['curriculumStatValue']}>
                                                    {formatDraftDurationLabel(
                                                      lecture.durationSeconds,
                                                    )}
                                                  </strong>
                                                </div>
                                              </div>
                                              <AdminFileDropZone
                                                actions={
                                                  <>
                                                    {pendingVideoSelection ? (
                                                      <Button
                                                        onClick={(event) => {
                                                          void handleLectureVideoUpload(
                                                            section.key,
                                                            lecture.key,
                                                            event,
                                                          );
                                                        }}
                                                        type='button'
                                                        variant='secondary'
                                                      >
                                                        업로드 시작
                                                      </Button>
                                                    ) : null}
                                                    {pendingVideoSelection ? (
                                                      <Button
                                                        onClick={cancelPendingVideoSelection}
                                                        type='button'
                                                        variant='secondary'
                                                      >
                                                        선택 취소
                                                      </Button>
                                                    ) : null}
                                                    {lecture.videoId && !pendingVideoSelection ? (
                                                      <Button
                                                        onClick={() => {
                                                          updateLecture(
                                                            section.key,
                                                            lecture.key,
                                                            (current) => ({
                                                              ...current,
                                                              durationSeconds: null,
                                                              videoId: null,
                                                              videoUploadErrorMessage: null,
                                                              videoUploadFileName: null,
                                                              videoUploadStatus: null,
                                                            }),
                                                          );
                                                          setLectureVideoSizeLabels((current) => {
                                                            const next = { ...current };
                                                            delete next[lecture.key];
                                                            return next;
                                                          });
                                                        }}
                                                        type='button'
                                                        variant='secondary'
                                                      >
                                                        영상 연결 해제
                                                      </Button>
                                                    ) : null}
                                                  </>
                                                }
                                                accept='video/*'
                                                buttonLabel={
                                                  pendingVideoSelection ||
                                                  lecture.videoUploadFileName
                                                    ? '파일 변경'
                                                    : '파일 선택'
                                                }
                                                id={`lecture-video-upload-${lecture.key}`}
                                                label='강의 영상 파일'
                                                onFilesSelected={(files) => {
                                                  const file = files[0];
                                                  if (!file) {
                                                    return;
                                                  }
                                                  handleLectureVideoSelection(lecture.key, file);
                                                }}
                                                onClear={
                                                  pendingVideoSelection
                                                    ? cancelPendingVideoSelection
                                                    : undefined
                                                }
                                                selectedLabel={
                                                  pendingVideoSelection?.file.name ??
                                                  lecture.videoUploadFileName ??
                                                  undefined
                                                }
                                                selectedMeta={videoFileSizeLabel}
                                              />
                                            </div>
                                          ) : null}

                                          {supportsResource
                                            ? renderLectureResourceWorkspace(lecture.key)
                                            : null}

                                          {supportsProblem
                                            ? renderLectureProblemWorkspace(lecture.key)
                                            : null}

                                          {supportsOffline ? (
                                            <div className={styles['lectureWorkspaceSection']}>
                                              <h5 className={styles['panelTitle']}>
                                                오프라인 강의
                                              </h5>
                                              <p className={styles['helperText']}>
                                                프로그램 기간 안에서 날짜를 고르고, 시간은 1시간
                                                단위로만 선택합니다. 장소와 비고는 선택 입력입니다.
                                              </p>
                                              {!hasOfflineSchedulePeriod ? (
                                                <p className={styles['helperText']}>
                                                  먼저 기본정보에서 학습 시작일과 종료일을 입력해
                                                  주세요.
                                                </p>
                                              ) : null}
                                              {lecture.offlineSchedules.length === 0 ? (
                                                <p className={styles['helperText']}>
                                                  등록된 오프라인 일정이 없습니다.
                                                </p>
                                              ) : null}
                                              <OfflineSchedulePlanner
                                                disabled={!hasOfflineSchedulePeriod}
                                                maxDate={offlineScheduleMaxDate}
                                                minDate={offlineScheduleMinDate}
                                                onSchedulesChange={(schedules) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      offlineSchedules:
                                                        toDraftOfflineSchedules(schedules),
                                                    }),
                                                  );
                                                }}
                                                schedules={toOfflinePlannerSchedules(
                                                  lecture.offlineSchedules,
                                                )}
                                              />
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>

                            <div className={styles['curriculumSectionToolbar']}>
                              <div
                                className={styles['curriculumActionDropdown']}
                                ref={
                                  openLectureTypeMenuSectionKey === section.key
                                    ? lectureTypeMenuRef
                                    : undefined
                                }
                              >
                                <button
                                  aria-expanded={openLectureTypeMenuSectionKey === section.key}
                                  aria-haspopup='menu'
                                  className={styles['curriculumDropdownTrigger']}
                                  onClick={() => {
                                    setOpenLectureTypeMenuSectionKey((current) =>
                                      current === section.key ? null : section.key,
                                    );
                                  }}
                                  type='button'
                                >
                                  {addLectureTriggerLabel}
                                </button>
                                {openLectureTypeMenuSectionKey === section.key ? (
                                  <div
                                    aria-label='강의 유형 선택'
                                    className={styles['curriculumDropdownMenu']}
                                    role='menu'
                                  >
                                    {allowedLectureTypes.map((lectureType) => (
                                      <button
                                        className={styles['curriculumDropdownOption']}
                                        key={lectureType}
                                        onClick={() => {
                                          addLecture(section.key, lectureType);
                                        }}
                                        role='menuitem'
                                        type='button'
                                      >
                                        <span className={styles['curriculumDropdownOptionLabel']}>
                                          {LECTURE_TYPE_LABELS[lectureType]}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <div className={styles['curriculumBottomActionRow']}>
                  <Button onClick={addSection} type='button' variant='primary'>
                    섹션 추가
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </section>
  );
};

export default AdminProgramCreateWorkspace;
