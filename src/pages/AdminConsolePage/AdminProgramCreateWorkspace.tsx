/* eslint-disable @typescript-eslint/no-deprecated */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

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
  createAdminProgramDraft,
  discardAdminProgramDraft,
  finalizeAdminProgramDraft,
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
import { adminProgramsLiveQueryKey } from '@/query/useAdminProgramsLiveQuery';
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
import type {
  AdminProgramAccessPolicy,
  AdminProgramLevel,
  AdminProgramType,
} from '@/types/adminProgramsLive';
import { classNames } from '@/utils/classNames';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  toMonthValue,
} from '@/utils/practicumCalendar';

import styles from './AdminConsolePage.module.scss';
import {
  PROGRAM_THUMBNAIL_FILE_ACCEPT,
  validateProgramThumbnailFile,
} from './adminConsolePageShared';

const TARGET_PART_SIZE_BYTES = 8 * 1024 * 1024;
const VIDEO_ENCODING_POLL_INTERVAL_MS = 5000;
const RESOURCE_FILE_ACCEPT = '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

type SaveState = 'saved' | 'saving' | 'dirty' | 'error';
type AdminProgramCreateView = 'details' | 'curriculum' | 'problems' | 'resources';
type NumericBasicInfoField = 'maxStudents' | 'price';

interface AdminProgramCreateWorkspaceProps {
  mode?: 'create' | 'edit';
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

const EMPTY_DRAFT_OFFLINE_SCHEDULE: AdminProgramDraftLectureOfflineSchedule = {
  date: null,
  endTime: null,
  location: null,
  notes: null,
  startTime: null,
};

const HOURLY_TIME_VALUES = Array.from(
  { length: 24 },
  (_, index) => `${String(index).padStart(2, '0')}:00`,
);

const OFFLINE_START_TIME_OPTIONS = HOURLY_TIME_VALUES.slice(0, -1).map((value) => ({
  label: value,
  value,
}));

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
  slug: null,
  summaryItems: [],
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
  options: createFiveChoiceOptions(),
  problemAreaId: null,
  questionText: '',
  questionType: 'SINGLE',
  sortOrder: 0,
});

const createEmptyProblem = (lectureKey: string): AdminProgramDraftProblem => ({
  lectureKey,
  passCorrectCount: 1,
  questions: [createEmptyQuestion()],
  timeLimitSeconds: null,
  title: '',
});

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

const getTodayDateInputValue = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${String(year)}-${month}-${day}`;
};

const isBeforeToday = (value: string | null): boolean => {
  if (!value) {
    return false;
  }

  const datePart = value.split('T')[0] ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) && datePart < getTodayDateInputValue();
};

const normalizeDraftBasicInfo = (
  basicInfo: AdminProgramDraftPayload['basicInfo'],
): AdminProgramDraftPayload['basicInfo'] => ({
  ...basicInfo,
  accessDays:
    basicInfo.accessPolicy === 'FIXED_DURATION'
      ? calculateAccessDaysFromLearningRange(basicInfo.learningStartAt, basicInfo.learningEndAt)
      : null,
});

const withServerManagedSlug = (
  draftPayload: AdminProgramDraftPayload,
): AdminProgramDraftPayload => ({
  ...draftPayload,
  basicInfo: {
    ...normalizeDraftBasicInfo(draftPayload.basicInfo),
    slug: null,
  },
});

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
  const currentSchedules = Array.isArray(lecture.offlineSchedules) ? lecture.offlineSchedules : [];
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
  payload: AdminProgramDraftPayload,
): AdminProgramDraftPayload => ({
  ...payload,
  basicInfo: normalizeDraftBasicInfo(payload.basicInfo),
  problems: payload.problems.map((problem) => {
    const matchedLecture = payload.sections
      .flatMap((section) => section.lectures)
      .find((lecture) => lecture.key === problem.lectureKey);
    const lectureTitle = matchedLecture?.title?.trim();

    return {
      ...problem,
      passCorrectCount: problem.passCorrectCount ?? 1,
      timeLimitSeconds: problem.timeLimitSeconds ?? matchedLecture?.durationSeconds ?? null,
      title: problem.title?.trim() || lectureTitle || '문제',
      questions: problem.questions.map((question) => ({
        ...question,
        problemAreaId: question.problemAreaId ?? null,
        mediaUploadErrorMessage: question.mediaUploadErrorMessage ?? null,
        mediaUploadFileName: question.mediaUploadFileName ?? null,
        mediaUploadStatus: normalizeQuestionMediaUploadStatus(question),
      })),
    };
  }),
  sections: payload.sections.map((section) => ({
    ...section,
    lectures: section.lectures.map((lecture) =>
      normalizeLectureByType({
        ...lecture,
        offlineSchedules: normalizeLegacyOfflineSchedules(lecture),
      }),
    ),
  })),
});

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
    return '처리중';
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

const normalizeQuestionMediaUploadStatus = (
  question: Pick<AdminProgramDraftProblemQuestion, 'mediaAssetId' | 'mediaUploadStatus'>,
): AdminDraftUploadStatus | null => {
  if (question.mediaUploadStatus) {
    return question.mediaUploadStatus;
  }
  return question.mediaAssetId ? 'READY' : null;
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
  { value: 'COHORT', label: '기수형' },
  { value: 'FIXED_DURATION', label: '고정 기간' },
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

const createEmptyOfflineSchedule = (): AdminProgramDraftLectureOfflineSchedule => ({
  ...EMPTY_DRAFT_OFFLINE_SCHEDULE,
});

const buildOfflineEndTimeOptions = (startTime: string | null) => {
  return HOURLY_TIME_VALUES.slice(1).map((value) => ({
    disabled: startTime !== null && value <= startTime,
    label: value,
    value,
  }));
};

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
  const trimmed = value.trim();
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
  const detailQuery = useAdminProgramDraftDetailQuery(draftId, draftId !== null);
  const categoriesQuery = useAdminCategoriesTreeQuery(true);
  const problemAreasQuery = useAdminProblemAreasQuery(true);
  const problemAreaOptions = useMemo(
    () =>
      (problemAreasQuery.data ?? []).map((area) => ({
        label: area.name,
        value: String(area.id),
      })),
    [problemAreasQuery.data],
  );
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
  const hasRequestedDraftRef = useRef(false);
  const initializedDraftIdRef = useRef<number | null>(null);
  const lastSavedPayloadRef = useRef<string>('');
  const currentPayloadRef = useRef<AdminProgramDraftPayload | null>(null);
  const bypassNavigationBlockRef = useRef(false);
  const lectureTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const numericInputsInitializedForDraftRef = useRef<number | null>(null);
  const resumingVideoIdsRef = useRef<Set<number>>(new Set());
  const draftFocusHintTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (draftFocusHintTimerRef.current !== null) {
        window.clearTimeout(draftFocusHintTimerRef.current);
      }
    },
    [],
  );

  const createDraftMutation = useMutation({
    mutationFn: () => {
      if (mode === 'edit') {
        if (editProgramId === null) {
          throw new Error('수정할 프로그램을 찾지 못했습니다.');
        }
        return createAdminProgramEditDraft(editProgramId);
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
              : '프로그램 초안을 생성하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (detail) => {
      const normalizedPayload = normalizePayloadFromDetail(detail);
      const snapshot = loadCreateWorkspaceSnapshot(detail.id);
      const nextPayload = snapshot
        ? normalizeDraftPayloadShape(snapshot.payload)
        : normalizedPayload;
      setPayload(nextPayload);
      currentPayloadRef.current = nextPayload;
      initializedDraftIdRef.current = detail.id;
      lastSavedPayloadRef.current = snapshot?.lastSavedPayload ?? JSON.stringify(normalizedPayload);
      setLastSavedAt(snapshot?.lastSavedAt ?? detail.updatedAt);
      setSaveState(JSON.stringify(nextPayload) === lastSavedPayloadRef.current ? 'saved' : 'dirty');
      setSearchParams({ draftId: String(detail.id) });
    },
  });

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
      const savedPayload = normalizeDraftPayloadShape(variables.nextPayload);
      const savedSerializedPayload = JSON.stringify(savedPayload);
      lastSavedPayloadRef.current = savedSerializedPayload;
      setLastSavedAt(detail.updatedAt);
      const latestPayload = currentPayloadRef.current;
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

  const finalizeMutation = useMutation({
    mutationFn: async (targetDraftId: number) => {
      const saved = await flushPendingDraftSave();
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
    onSuccess: async (result, targetDraftId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
        queryClient.invalidateQueries({ queryKey: adminProgramDraftsQueryKey() }),
      ]);
      showToast({
        message:
          mode === 'edit'
            ? '프로그램 수정을 완료했습니다.'
            : '프로그램 등록을 완료했습니다. 숨김 상태로 생성되었습니다.',
        variant: 'success',
      });
      clearCreateWorkspaceSnapshot(targetDraftId);
      navigateWithoutPrompt(routePaths.adminProgramEdit(String(result.programId)));
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
  }, [createDraftMutation, draftId, editProgramId, mode]);

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
    if (!detail || initializedDraftIdRef.current === detail.id) {
      return;
    }

    const normalizedPayload = normalizePayloadFromDetail(detail);
    const snapshot = loadCreateWorkspaceSnapshot(detail.id);
    const nextPayload = snapshot ? normalizeDraftPayloadShape(snapshot.payload) : normalizedPayload;
    setPayload(nextPayload);
    currentPayloadRef.current = nextPayload;
    initializedDraftIdRef.current = detail.id;
    lastSavedPayloadRef.current = snapshot?.lastSavedPayload ?? JSON.stringify(normalizedPayload);
    setLastSavedAt(snapshot?.lastSavedAt ?? detail.updatedAt);
    setSaveState(JSON.stringify(nextPayload) === lastSavedPayloadRef.current ? 'saved' : 'dirty');
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
      price: payload.basicInfo.price === null ? '' : String(payload.basicInfo.price),
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

  const updatePayload = (
    updater: (current: AdminProgramDraftPayload) => AdminProgramDraftPayload,
  ) => {
    const current = currentPayloadRef.current;
    if (!current) {
      return null;
    }

    const next = updater(current);
    currentPayloadRef.current = next;
    setPayload(next);
    return next;
  };

  const persistLectureVideoUploadState = async (
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
  };

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

      updatePayload((current) => ({
        ...current,
        basicInfo: {
          ...current.basicInfo,
          thumbnailPreviewUrl: uploadTarget.previewUrl,
          thumbnailUrl: uploadTarget.storageUrl,
        },
      }));
      setPendingThumbnailSelection(null);
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

    if (numericInputValues.price.trim() && !/^\d+$/.test(numericInputValues.price.trim())) {
      nextErrors['price'] = '정가는 숫자만 입력해 주세요.';
    }
    if (
      numericInputValues.maxStudents.trim() &&
      !/^\d+$/.test(numericInputValues.maxStudents.trim())
    ) {
      nextErrors['maxStudents'] = '정원은 숫자만 입력해 주세요.';
    }
    const basicInfo = currentPayloadRef.current?.basicInfo ?? null;
    if (isBeforeToday(basicInfo?.learningStartAt ?? null)) {
      nextErrors['learningRange'] = '수강 시작일은 오늘 이후 날짜만 선택할 수 있습니다.';
    }
    if (
      (basicInfo?.accessPolicy === 'FIXED_DURATION' || basicInfo?.accessPolicy === 'COHORT') &&
      calculateAccessDaysFromLearningRange(basicInfo.learningStartAt, basicInfo.learningEndAt) ===
        null
    ) {
      nextErrors['learningRange'] =
        basicInfo.accessPolicy === 'COHORT'
          ? '기수형 수강은 수강 시작일과 종료일을 올바르게 입력해 주세요.'
          : '고정 기간 수강은 수강 시작일과 종료일을 올바르게 입력해 주세요.';
    }
    if (
      discountPercentInput.trim() &&
      (!/^\d+(?:\.\d+)?$/.test(discountPercentInput.trim()) ||
        Number(discountPercentInput.trim()) > 100)
    ) {
      nextErrors['discountPercent'] = '할인율은 0부터 100까지 숫자로 입력해 주세요.';
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
        thumbnailPreviewUrl: previewObjectUrl,
        thumbnailUrl: null,
      },
    }));
  };

  const handleNumericBasicInfoChange = (
    field: NumericBasicInfoField,
    label: string,
    value: string,
  ) => {
    setNumericInputValues((current) => ({ ...current, [field]: value }));
    const parsed = parseNonNegativeIntegerInput(value, label);
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
    updatePayload((current) => ({
      ...current,
      basicInfo: normalizeDraftBasicInfo({
        ...current.basicInfo,
        accessDays: null,
        accessPolicy: 'COHORT',
        learningEndAt: endDate ? toEndOfDayMinuteIsoStringOrNull(endDate) : null,
        learningStartAt: toStartOfDayIsoStringOrNull(startDate),
      }),
    }));
  };

  const resetRecruitmentRange = () => {
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

  const updateLectureOfflineSchedule = (
    sectionKey: string,
    lectureKey: string,
    scheduleIndex: number,
    updater: (
      schedule: AdminProgramDraftLectureOfflineSchedule,
    ) => AdminProgramDraftLectureOfflineSchedule,
  ) => {
    updateLecture(sectionKey, lectureKey, (lecture) => ({
      ...lecture,
      offlineSchedules: lecture.offlineSchedules.map((schedule, index) =>
        index === scheduleIndex ? updater(schedule) : schedule,
      ),
    }));
  };

  const addLectureOfflineSchedule = (sectionKey: string, lectureKey: string) => {
    updateLecture(sectionKey, lectureKey, (lecture) => ({
      ...lecture,
      offlineSchedules:
        lecture.offlineSchedules.length > 0
          ? [lecture.offlineSchedules[0]]
          : [createEmptyOfflineSchedule()],
    }));
  };

  const removeLectureOfflineSchedule = (
    sectionKey: string,
    lectureKey: string,
    scheduleIndex: number,
  ) => {
    updateLecture(sectionKey, lectureKey, (lecture) => ({
      ...lecture,
      offlineSchedules: lecture.offlineSchedules.filter((_, index) => index !== scheduleIndex),
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
  };

  const upsertProblem = (
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
  };

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

  const updateProblemQuestion = (
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
  };

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

    return (
      <div className={styles['lectureWorkspaceSection']}>
        {problem ? (
          <div className={styles['stackListCompact']}>
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
                  question.mediaAssetId ? '업로드 완료' : '파일 미선택',
                  question.mediaUploadErrorMessage,
                );
              const questionMediaFileLabel =
                pendingQuestionMediaSelection?.file.name ??
                question.mediaUploadFileName ??
                (question.mediaAssetId ? '업로드된 미디어' : '아직 선택한 파일이 없습니다.');
              const questionCollapsed = collapsedProblemQuestionKeys.includes(uploadKey);

              return (
                <article
                  className={classNames(styles['panel'], styles['problemQuestionCard'])}
                  key={`problem-question-${lectureKey}-${String(questionIndex)}`}
                >
                  <div className={styles['panelToolbar']}>
                    <div>
                      <h6 className={styles['panelTitle']}>문제 {String(questionIndex + 1)}</h6>
                      <p className={styles['metaText']}>
                        {question.mediaType ? questionMediaStatusLabel : '미디어 없음'}
                      </p>
                    </div>
                    <div className={styles['problemQuestionToolbarActions']}>
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
                  </div>

                  {!questionCollapsed ? (
                    <div className={styles['problemQuestionBody']}>
                      <div className={styles['problemQuestionSectionBlock']}>
                        <div className={styles['problemQuestionSectionHeader']}>
                          <strong>문제 영역</strong>
                          <span>문제가 속한 영역을 선택합니다.</span>
                        </div>
                        <div
                          data-draft-focus-key={`${lectureKey}:${String(questionIndex)}:problemArea`}
                        >
                          <AdminDropdownField
                            className={styles['problemQuestionFieldWithoutLabel']}
                            compact
                            label='문제 영역'
                            onChange={(nextValue) => {
                              updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                                ...current,
                                problemAreaId: nextValue ? Number(nextValue) : null,
                              }));
                            }}
                            options={[{ label: '영역 선택', value: '' }, ...problemAreaOptions]}
                            value={
                              question.problemAreaId === null ? '' : String(question.problemAreaId)
                            }
                          />
                        </div>
                      </div>

                      <div
                        className={classNames(
                          styles['problemQuestionSectionBlock'],
                          styles['problemQuestionMediaBlock'],
                        )}
                      >
                        <div className={styles['problemQuestionSectionHeader']}>
                          <strong>이미지 / 영상</strong>
                          <span>문제 이해에 필요한 자료가 있을 때만 연결합니다.</span>
                        </div>
                        <div className={styles['questionMediaRow']}>
                          <input
                            accept='image/*,video/*'
                            hidden
                            id={questionMediaInputId}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                return;
                              }
                              handleQuestionMediaSelection(lectureKey, questionIndex, file);
                              event.currentTarget.value = '';
                            }}
                            type='file'
                          />
                          <div className={styles['questionMediaActions']}>
                            <Button
                              onClick={() => {
                                document.getElementById(questionMediaInputId)?.click();
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              {pendingQuestionMediaSelection || question.mediaAssetId
                                ? '파일 변경'
                                : '파일 선택'}
                            </Button>
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
                                onClick={() => {
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
                                    mediaAssetId:
                                      pendingQuestionMediaSelection.previousMediaAssetId,
                                    mediaType: pendingQuestionMediaSelection.previousMediaType,
                                    mediaUploadErrorMessage:
                                      pendingQuestionMediaSelection.previousMediaUploadErrorMessage,
                                    mediaUploadFileName:
                                      pendingQuestionMediaSelection.previousMediaUploadFileName,
                                    mediaUploadStatus:
                                      pendingQuestionMediaSelection.previousMediaUploadStatus,
                                    mediaUrl: pendingQuestionMediaSelection.previousMediaUrl,
                                  }));
                                }}
                                size='sm'
                                type='button'
                                variant='secondary'
                              >
                                선택 취소
                              </Button>
                            ) : null}
                            {question.mediaAssetId && !pendingQuestionMediaSelection ? (
                              <Button
                                onClick={() => {
                                  updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                                    ...current,
                                    mediaAssetId: null,
                                    mediaType: null,
                                    mediaUploadErrorMessage: null,
                                    mediaUploadFileName: null,
                                    mediaUploadStatus: null,
                                    mediaUrl: null,
                                  }));
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
                          </div>
                        </div>

                        {question.mediaType ? (
                          <div className={styles['curriculumStatGrid']}>
                            <div className={styles['curriculumStatCard']}>
                              <span className={styles['curriculumStatLabel']}>현재 상태</span>
                              <strong className={styles['curriculumStatValue']}>
                                {questionMediaStatusLabel}
                              </strong>
                            </div>
                            <div className={styles['curriculumStatCard']}>
                              <span className={styles['curriculumStatLabel']}>선택 파일</span>
                              <strong className={styles['curriculumStatValue']}>
                                {questionMediaFileLabel}
                              </strong>
                            </div>
                            <div className={styles['curriculumStatCard']}>
                              <span className={styles['curriculumStatLabel']}>파일 크기</span>
                              <strong className={styles['curriculumStatValue']}>
                                {pendingQuestionMediaSelection?.sizeLabel ?? '미확인'}
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
                              <TextField
                                label={`보기 ${String(optionIndex + 1)}`}
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
                                  aria-label={`${String(optionIndex + 1)}번 보기 정답 선택`}
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
            lectureResources.map(({ resource, resourceIndex }) => {
              const pendingSelection = pendingResourceSelections[resource.key] ?? null;
              const fileInputId = `draft-resource-upload-${lectureKey}-${String(resourceIndex)}`;
              const uploadStatusLabel = pendingSelection
                ? `업로드 대기 · ${pendingSelection.sizeLabel}`
                : formatUploadStatusLabel(
                    resource.uploadStatus,
                    resource.fileName?.trim() ? '업로드 완료' : '파일 미선택',
                    resource.uploadErrorMessage,
                  );

              return (
                <article
                  className={styles['panel']}
                  key={`draft-resource-${lectureKey}-${String(resourceIndex)}`}
                >
                  <div className={styles['panelToolbar']}>
                    <div>
                      <h6 className={styles['panelTitle']}>
                        {resource.title?.trim() ||
                          resource.fileName?.trim() ||
                          `첨부자료 ${String(resource.sortOrder + 1)}`}
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

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='노출 제목'
                      name={`draft-resource-title-${lectureKey}-${String(resourceIndex)}`}
                      onChange={(event) => {
                        updateResource(resourceIndex, (current) => ({
                          ...current,
                          title: event.target.value,
                        }));
                      }}
                      value={resource.title ?? ''}
                    />
                  </div>

                  <input
                    accept={RESOURCE_FILE_ACCEPT}
                    id={fileInputId}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (!file) {
                        return;
                      }
                      handleLectureResourceSelection(resource.key, file);
                      event.currentTarget.value = '';
                    }}
                    style={{ display: 'none' }}
                    type='file'
                  />

                  <div className={styles['actionRow']}>
                    <Button
                      onClick={() => {
                        document.getElementById(fileInputId)?.click();
                      }}
                      type='button'
                      variant='secondary'
                    >
                      {pendingSelection || resource.fileName ? '파일 변경' : '파일 선택'}
                    </Button>
                    {pendingSelection ? (
                      <>
                        <Button
                          onClick={() => {
                            void handleLectureResourceUpload(resourceIndex);
                          }}
                          type='button'
                          variant='secondary'
                        >
                          업로드 시작
                        </Button>
                        <Button
                          onClick={() => {
                            setPendingResourceSelections((current) => {
                              const next = { ...current };
                              delete next[resource.key];
                              return next;
                            });
                          }}
                          type='button'
                          variant='secondary'
                        >
                          선택 취소
                        </Button>
                      </>
                    ) : null}
                  </div>

                  <div className={styles['curriculumStatGrid']}>
                    <div className={styles['curriculumStatCard']}>
                      <span className={styles['curriculumStatLabel']}>업로드 파일</span>
                      <strong className={styles['curriculumStatValue']}>
                        {pendingSelection?.file.name ||
                          resource.fileName?.trim() ||
                          '선택된 파일 없음'}
                      </strong>
                    </div>
                    <div className={styles['curriculumStatCard']}>
                      <span className={styles['curriculumStatLabel']}>파일 크기</span>
                      <strong className={styles['curriculumStatValue']}>
                        {pendingSelection?.sizeLabel ||
                          (resource.fileSize
                            ? `${formatFileSizeInMb(resource.fileSize)} MB`
                            : '미확인')}
                      </strong>
                    </div>
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

  const flushPendingDraftSave = async (): Promise<boolean> => {
    if (draftId === null || currentPayloadRef.current === null) {
      return true;
    }

    if (!validateBasicInfoInputs()) {
      showToast({
        message: '숫자 입력값을 확인해 주세요.',
        variant: 'error',
      });
      return false;
    }

    if (pendingThumbnailSelection) {
      const uploaded = await uploadPendingProgramThumbnail();
      if (!uploaded) {
        return false;
      }
    }

    const nextPayload = normalizeDraftPayloadShape(
      mode === 'create'
        ? withServerManagedSlug(currentPayloadRef.current)
        : currentPayloadRef.current,
    );
    if (nextPayload === null) {
      return false;
    }

    if (nextPayload !== currentPayloadRef.current) {
      currentPayloadRef.current = nextPayload;
      setPayload(nextPayload);
    }

    const serializedPayload = JSON.stringify(nextPayload);
    if (serializedPayload === lastSavedPayloadRef.current) {
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

  const handleManualSave = async () => {
    await flushPendingDraftSave();
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

  const pollVideoReady = async (videoId: number, lectureKey: string): Promise<number | null> => {
    for (;;) {
      const status = await fetchAdminVideoStatus(videoId);
      if (status.status === 'READY') {
        setLectureVideoProgressByKey((current) => ({
          ...current,
          [lectureKey]: 100,
        }));
        return status.durationSeconds;
      }
      if (status.status === 'FAILED') {
        throw new Error(status.errorMessage || '영상 인코딩에 실패했습니다.');
      }
      await new Promise((resolve) => window.setTimeout(resolve, VIDEO_ENCODING_POLL_INTERVAL_MS));
    }
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
  }, [draftId, payload]);

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

  const handleLectureVideoUpload = async (sectionKey: string, lectureKey: string) => {
    const pendingSelection = pendingVideoSelections[lectureKey];
    if (!pendingSelection) {
      showToast({
        message: '먼저 업로드할 영상을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    const file = pendingSelection.file;
    const lecture = payload?.sections
      .find((section) => section.key === sectionKey)
      ?.lectures.find((currentLecture) => currentLecture.key === lectureKey);

    if (!lecture?.title?.trim()) {
      showToast({
        message: '영상 업로드 전에 강의명을 먼저 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    if (!(await flushPendingDraftSave())) {
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
      setPendingVideoSelections((current) => {
        const next = { ...current };
        delete next[lectureKey];
        return next;
      });

      const session = await createAdminVideoUploadSession({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
        partCount: calculatePartCount(file.size),
      });

      const chunks = buildVideoChunks(file, session.parts);
      let completedUploadPartCount = 0;
      const completedParts = await Promise.all(
        chunks.map(async (chunk) => {
          const eTag = await uploadPart(
            chunk.uploadUrl,
            chunk.blob,
            file.type || 'application/octet-stream',
          );
          completedUploadPartCount += 1;
          setLectureVideoProgressByKey((current) => ({
            ...current,
            [lectureKey]: Math.round((completedUploadPartCount / chunks.length) * 100),
          }));
          return {
            eTag,
            partNumber: chunk.partNumber,
          };
        }),
      );

      setLectureVideoProgressByKey((current) => ({
        ...current,
        [lectureKey]: 0,
      }));
      updatePayload((current) => ({
        ...current,
        sections: current.sections.map((section) => ({
          ...section,
          lectures: section.lectures.map((currentLecture) =>
            currentLecture.key === lectureKey
              ? {
                  ...currentLecture,
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
        videoId: session.videoId,
      });
      await completeAdminVideoUpload(session.videoId, {
        parts: completedParts,
        uploadId: session.uploadId,
      });
      await startAdminVideoEncoding(session.videoId);
      const durationSeconds = await pollVideoReady(session.videoId, lectureKey);

      updateLecture(sectionKey, lectureKey, (lecture) => ({
        ...lecture,
        durationSeconds: durationSeconds ?? lecture.durationSeconds,
        videoId: session.videoId,
        videoUploadErrorMessage: null,
        videoUploadFileName: file.name,
        videoUploadStatus: 'READY',
      }));
      await persistLectureVideoUploadState(draftId, lectureKey, {
        durationSeconds,
        errorMessage: null,
        fileName: file.name,
        status: 'READY',
        videoId: session.videoId,
      });
      setLectureVideoProgressByKey((current) => {
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
          previousQuestion ?? { mediaAssetId: null, mediaUploadStatus: null },
        ),
        previousMediaUrl: previousQuestion?.mediaUrl ?? null,
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
      setQuestionUploadStatus((current) => ({
        ...current,
        [uploadKey]: '문제 미디어 업로드 중',
      }));

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
      }));

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
      updateProblemQuestion(lectureKey, questionIndex, (question) => ({
        ...question,
        mediaUploadErrorMessage:
          error instanceof Error ? error.message : '문제 미디어 업로드에 실패했습니다.',
        mediaUploadStatus: 'FAILED',
      }));
      setQuestionUploadStatus((current) => ({
        ...current,
        [uploadKey]: '업로드 실패',
      }));
      showToast({
        message: error instanceof Error ? error.message : '문제 미디어 업로드에 실패했습니다.',
        variant: 'error',
      });
    }
  };

  const handleLectureResourceSelection = (resourceKey: string, file: File) => {
    setPendingResourceSelections((current) => ({
      ...current,
      [resourceKey]: {
        file,
        sizeLabel: `${formatFileSizeInMb(file.size)} MB`,
      },
    }));
  };

  const handleLectureResourceUpload = async (resourceIndex: number) => {
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
      if (!(await flushPendingDraftSave())) {
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
  const blockingFinalizeIssues = payload.sections.flatMap((section) =>
    section.lectures.flatMap((lecture) => {
      const issues: Array<{ focusKey?: string; message: string }> = [];
      const lectureLabel = lecture.title?.trim() || '미제목 강의';
      if (pendingVideoSelections[lecture.key]) {
        issues.push({ message: `${lectureLabel}: 선택한 영상 파일 업로드 시작이 필요합니다.` });
      }
      if (lecture.videoUploadStatus === 'UPLOADING' || lecture.videoUploadStatus === 'PROCESSING') {
        issues.push({ message: `${lectureLabel}: 영상 업로드 또는 인코딩이 아직 진행 중입니다.` });
      }
      if (lecture.videoUploadStatus === 'FAILED') {
        issues.push({ message: `${lectureLabel}: 영상 업로드가 실패했습니다.` });
      }

      const lectureResources = payload.resources.filter(
        (resource) => resource.lectureKey === lecture.key,
      );
      for (const resource of lectureResources) {
        const resourceLabel = resource.title?.trim() || '미제목 자료';
        if (pendingResourceSelections[resource.key]) {
          issues.push({
            message: `${lectureLabel} / ${resourceLabel}: 선택한 자료 파일 업로드 시작이 필요합니다.`,
          });
          continue;
        }
        if (resource.uploadStatus === 'UPLOADING' || resource.uploadStatus === 'PROCESSING') {
          issues.push({
            message: `${lectureLabel} / ${resourceLabel}: 자료 업로드가 아직 진행 중입니다.`,
          });
          continue;
        }
        if (resource.uploadStatus === 'FAILED') {
          issues.push({
            message: `${lectureLabel} / ${resourceLabel}: 자료 업로드가 실패했습니다.`,
          });
          continue;
        }
        if (!resource.fileUrl || !resource.fileName || !resource.fileSize) {
          issues.push({
            message: `${lectureLabel} / ${resourceLabel}: 자료 파일을 업로드해야 합니다.`,
          });
        }
      }

      const lectureProblem = payload.problems.find((problem) => problem.lectureKey === lecture.key);
      lectureProblem?.questions.forEach((question, questionIndex) => {
        const questionUploadKey = `${lecture.key}:${String(questionIndex)}`;
        const questionLabel = question.questionText.trim() || `문제 ${String(questionIndex + 1)}`;
        if (question.problemAreaId === null) {
          issues.push({
            focusKey: `${lecture.key}:${String(questionIndex)}:problemArea`,
            message: `${lectureLabel} / ${questionLabel}: 문제 영역을 선택해 주세요.`,
          });
        }
        if (!question.questionText.trim()) {
          issues.push({
            focusKey: `${lecture.key}:${String(questionIndex)}:questionText`,
            message: `${lectureLabel} / ${questionLabel}: 문제 내용을 입력해 주세요.`,
          });
        }
        if (pendingQuestionMediaSelections[questionUploadKey]) {
          issues.push({
            message: `${lectureLabel} / ${questionLabel}: 선택한 문제 미디어 업로드 시작이 필요합니다.`,
          });
          return;
        }
        if (isUploadInProgress(question.mediaUploadStatus)) {
          issues.push({
            message: `${lectureLabel} / ${questionLabel}: 문제 미디어 업로드가 아직 진행 중입니다.`,
          });
          return;
        }
        if (question.mediaUploadStatus === 'FAILED') {
          issues.push({
            message: `${lectureLabel} / ${questionLabel}: 문제 미디어 업로드가 실패했습니다.`,
          });
          return;
        }
        if (
          question.mediaUploadStatus === 'READY' &&
          question.mediaAssetId === null &&
          !question.mediaUrl
        ) {
          issues.push({
            message: `${lectureLabel} / ${questionLabel}: 문제 미디어 연결 정보가 누락되었습니다.`,
          });
        }
      });

      return issues;
    }),
  );
  const focusableFinalizeIssue = blockingFinalizeIssues.find((issue) => issue.focusKey);
  const blockingUploadMessages = blockingFinalizeIssues
    .filter((issue) => !issue.focusKey)
    .map((issue) => issue.message);
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
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      focusTarget?.focus();
    }, 160);
    return true;
  };
  const focusDraftField = (focusKey: string): boolean => {
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
            {mode === 'create' ? (
              <Button
                disabled={saveMutation.isPending || finalizeMutation.isPending}
                onClick={() => {
                  void handleManualSave();
                }}
                type='button'
                variant='secondary'
              >
                {saveMutation.isPending ? '저장 중...' : '임시저장'}
              </Button>
            ) : null}
            <Button
              disabled={
                finalizeMutation.isPending ||
                discardMutation.isPending ||
                (blockingUploadMessages.length > 0 && !focusableFinalizeIssue)
              }
              onClick={(event) => {
                if (focusableFinalizeIssue?.focusKey) {
                  focusDraftField(focusableFinalizeIssue.focusKey);
                  showDraftFocusHint(focusableFinalizeIssue.message, event);
                  showToast({
                    message: focusableFinalizeIssue.message,
                    variant: 'error',
                  });
                  return;
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
                  <AdminCategoryPicker
                    helperText='가장 하위 카테고리를 선택해 주세요.'
                    label='카테고리'
                    onChange={(nextValue) => {
                      updateBasicInfo('categoryId', Number(nextValue));
                    }}
                    tree={categoriesQuery.data ?? []}
                    value={
                      payload.basicInfo.categoryId === null
                        ? ''
                        : String(payload.basicInfo.categoryId)
                    }
                  />

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='프로그램명'
                      name='draft-title'
                      onChange={(event) => {
                        const nextTitle = event.target.value;
                        updatePayload((current) => ({
                          ...current,
                          basicInfo: {
                            ...current.basicInfo,
                            slug: mode === 'create' ? null : current.basicInfo.slug,
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
                    <AdminDropdownField
                      compact
                      label='수강 정책'
                      onChange={(nextValue) => {
                        updatePayload((current) => ({
                          ...current,
                          basicInfo: {
                            ...current.basicInfo,
                            accessDays:
                              nextValue === 'FIXED_DURATION'
                                ? calculateAccessDaysFromLearningRange(
                                    current.basicInfo.learningStartAt,
                                    current.basicInfo.learningEndAt,
                                  )
                                : null,
                            accessPolicy: nextValue as AdminProgramAccessPolicy,
                            learningEndAt:
                              nextValue === 'UNLIMITED' ? null : current.basicInfo.learningEndAt,
                            learningStartAt:
                              nextValue === 'UNLIMITED' ? null : current.basicInfo.learningStartAt,
                          },
                        }));
                      }}
                      options={accessPolicyOptions}
                      value={payload.basicInfo.accessPolicy ?? 'UNLIMITED'}
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
                          프로그램 카드와 상세 상단에 노출될 이미지를 선택합니다. 실제 업로드는
                          {mode === 'edit'
                            ? ' 수정 완료 시 진행됩니다.'
                            : ' 임시저장 또는 등록 완료 시 진행됩니다.'}
                        </p>
                      </div>
                    </div>
                    <input
                      accept={PROGRAM_THUMBNAIL_FILE_ACCEPT}
                      className={styles['thumbnailFileInput']}
                      name='draft-thumbnail-file'
                      onChange={(event) => {
                        handleProgramThumbnailFileChange(event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                      ref={thumbnailInputRef}
                      type='file'
                    />

                    <div className={styles['thumbnailUploadPanel']}>
                      <div className={styles['thumbnailPreviewPanel']}>
                        {payload.basicInfo.thumbnailPreviewUrl ? (
                          <div className={styles['thumbnailPreview']}>
                            <img
                              alt={
                                payload.basicInfo.title
                                  ? `${payload.basicInfo.title} 대표 이미지`
                                  : '프로그램 대표 이미지'
                              }
                              className={styles['thumbnailPreviewImage']}
                              src={payload.basicInfo.thumbnailPreviewUrl}
                            />
                          </div>
                        ) : (
                          <div className={styles['thumbnailEmptyState']}>
                            등록된 대표 이미지가 없습니다.
                          </div>
                        )}
                      </div>

                      <div className={styles['thumbnailPreviewMeta']}>
                        <p className={styles['thumbnailPreviewTitle']}>대표 이미지 미리보기</p>
                        {pendingThumbnailSelection ? (
                          <p className={styles['thumbnailFileCaption']}>
                            업로드 대기 중 · {pendingThumbnailSelection.file.name} ·{' '}
                            {pendingThumbnailSelection.sizeLabel}
                          </p>
                        ) : null}
                        <div className={styles['thumbnailActionRow']}>
                          <Button
                            disabled={isUploadingThumbnail}
                            onClick={() => {
                              thumbnailInputRef.current?.click();
                            }}
                            size='sm'
                            type='button'
                            variant='primary'
                          >
                            {isUploadingThumbnail ? '업로드 중...' : '파일 선택'}
                          </Button>
                          {payload.basicInfo.thumbnailPreviewUrl ? (
                            <Button
                              disabled={isUploadingThumbnail}
                              onClick={() => {
                                updatePayload((current) => ({
                                  ...current,
                                  basicInfo: {
                                    ...current.basicInfo,
                                    thumbnailPreviewUrl: null,
                                    thumbnailUrl: null,
                                  },
                                }));
                                setPendingThumbnailSelection(null);
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              이미지 제거
                            </Button>
                          ) : null}
                        </div>
                        <p className={styles['thumbnailFileCaption']}>
                          허용 형식 · {PROGRAM_THUMBNAIL_FILE_ACCEPT.replaceAll(',', ', ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
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

                  <DateRangePickerField
                    endDate={recruitmentEndDate}
                    label='모집 기간'
                    onChange={handleRecruitmentRangeChange}
                    onReset={resetRecruitmentRange}
                    resetLabel='상시 모집'
                    startDate={recruitmentStartDate}
                    valueText={visibleRecruitmentRangeText}
                  />

                  <p className={styles['policyHint']}>
                    {payload.basicInfo.programType === 'OFFLINE'
                      ? '오프라인 프로그램은 개강일이 지나면 관리자 화면에서 개강됨 상태로 표시됩니다.'
                      : '모집 종료일을 비워 두면 상시 모집으로 운영할 수 있습니다.'}
                  </p>

                  <DateRangePickerField
                    endDate={learningEndDate}
                    label='수강 기간'
                    minDate={getTodayDateInputValue()}
                    onChange={handleLearningRangeChange}
                    onReset={resetLearningRange}
                    resetLabel='기간 초기화'
                    startDate={learningStartDate}
                    valueText={visibleLearningRangeText}
                  />

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
                  <Button onClick={addSection} type='button' variant='primary'>
                    섹션 추가
                  </Button>
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
                                  새 강의 추가
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
                                const pendingVideoSelection =
                                  pendingVideoSelections[lecture.key] ?? null;
                                const lectureVideoStatus = pendingVideoSelection
                                  ? `업로드 대기 · ${pendingVideoSelection.sizeLabel}`
                                  : isUploadInProgress(lecture.videoUploadStatus)
                                    ? formatProgressLabel(
                                        formatUploadStatusLabel(
                                          lecture.videoUploadStatus,
                                          lecture.videoId
                                            ? `연결 완료 · videoId ${String(lecture.videoId)}`
                                            : '영상 미연결',
                                          lecture.videoUploadErrorMessage,
                                        ),
                                        lectureVideoProgressByKey[lecture.key],
                                        lecture.videoUploadStatus === 'UPLOADING',
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
                                const uploadedVideoName =
                                  pendingVideoSelection?.file.name ??
                                  lecture.videoUploadFileName ??
                                  null;
                                const videoFileSizeLabel =
                                  pendingVideoSelection?.sizeLabel ??
                                  lectureVideoSizeLabels[lecture.key] ??
                                  null;

                                return (
                                  <article
                                    className={styles['curriculumLectureCard']}
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
                                            <TextField
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
                                              <div className={styles['compactFieldRow']}>
                                                <div className={styles['compactTextField']}>
                                                  <TextField
                                                    label='제한시간(분)'
                                                    name={`problem-time-limit-${lecture.key}`}
                                                    onChange={(event) => {
                                                      upsertProblem(lecture.key, (current) => ({
                                                        ...current,
                                                        timeLimitSeconds: parseDurationMinutesInput(
                                                          event.target.value,
                                                        ),
                                                      }));
                                                    }}
                                                    value={formatDurationMinutesInput(
                                                      lectureQuiz?.timeLimitSeconds ?? null,
                                                    )}
                                                  />
                                                </div>
                                                {supportsProblem ? (
                                                  <div className={styles['compactTextField']}>
                                                    <TextField
                                                      label='합격 기준 문항 수'
                                                      name={`problem-pass-correct-count-${lecture.key}`}
                                                      onChange={(event) => {
                                                        upsertProblem(lecture.key, (current) => ({
                                                          ...current,
                                                          passCorrectCount:
                                                            event.target.value.trim()
                                                              ? Number(event.target.value)
                                                              : null,
                                                        }));
                                                      }}
                                                      value={
                                                        lectureQuiz?.passCorrectCount === null ||
                                                        lectureQuiz?.passCorrectCount === undefined
                                                          ? ''
                                                          : String(lectureQuiz.passCorrectCount)
                                                      }
                                                    />
                                                  </div>
                                                ) : null}
                                              </div>
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
                                                    영상 파일
                                                  </span>
                                                  <strong className={styles['curriculumStatValue']}>
                                                    {uploadedVideoName ??
                                                      '아직 업로드한 파일이 없습니다.'}
                                                  </strong>
                                                </div>
                                                <div className={styles['curriculumStatCard']}>
                                                  <span className={styles['curriculumStatLabel']}>
                                                    파일 크기
                                                  </span>
                                                  <strong className={styles['curriculumStatValue']}>
                                                    {videoFileSizeLabel ?? '미확인'}
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
                                              <input
                                                hidden
                                                id={`lecture-video-upload-${lecture.key}`}
                                                onChange={(event) => {
                                                  const file = event.target.files?.[0];
                                                  if (!file) {
                                                    return;
                                                  }
                                                  handleLectureVideoSelection(lecture.key, file);
                                                  event.currentTarget.value = '';
                                                }}
                                                type='file'
                                              />
                                              <div className={styles['actionRow']}>
                                                <Button
                                                  onClick={() => {
                                                    document
                                                      .getElementById(
                                                        `lecture-video-upload-${lecture.key}`,
                                                      )
                                                      ?.click();
                                                  }}
                                                  type='button'
                                                  variant='primary'
                                                >
                                                  {pendingVideoSelection ||
                                                  lecture.videoUploadFileName
                                                    ? '파일 변경'
                                                    : '파일 선택'}
                                                </Button>
                                                {pendingVideoSelection ? (
                                                  <Button
                                                    onClick={() => {
                                                      void handleLectureVideoUpload(
                                                        section.key,
                                                        lecture.key,
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
                                                    onClick={() => {
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
                                                    }}
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
                                              </div>
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
                                              <div className={styles['offlineScheduleDraftList']}>
                                                {lecture.offlineSchedules
                                                  .slice(0, 1)
                                                  .map((schedule, scheduleIndex) => (
                                                    <div
                                                      className={styles['offlineScheduleDraftCard']}
                                                      key={`${lecture.key}-offline-schedule-${String(scheduleIndex)}`}
                                                    >
                                                      <div className={styles['actionRow']}>
                                                        <strong>
                                                          일정 {String(scheduleIndex + 1)}
                                                        </strong>
                                                        <Button
                                                          onClick={() => {
                                                            removeLectureOfflineSchedule(
                                                              section.key,
                                                              lecture.key,
                                                              scheduleIndex,
                                                            );
                                                          }}
                                                          size='sm'
                                                          type='button'
                                                          variant='secondary'
                                                        >
                                                          일정 제거
                                                        </Button>
                                                      </div>
                                                      <div
                                                        className={
                                                          styles['offlineScheduleTimeGrid']
                                                        }
                                                      >
                                                        <TextField
                                                          errorClassName={
                                                            styles['offlineScheduleFieldError']
                                                          }
                                                          label='날짜'
                                                          max={offlineScheduleMaxDate}
                                                          min={offlineScheduleMinDate}
                                                          name={`lecture-offline-date-${lecture.key}-${String(scheduleIndex)}`}
                                                          onChange={(event) => {
                                                            updateLectureOfflineSchedule(
                                                              section.key,
                                                              lecture.key,
                                                              scheduleIndex,
                                                              (current) => ({
                                                                ...current,
                                                                date: event.target.value || null,
                                                              }),
                                                            );
                                                          }}
                                                          type='date'
                                                          value={schedule.date ?? ''}
                                                        />
                                                        <AdminDropdownField
                                                          className={
                                                            styles['offlineScheduleTimeSelect']
                                                          }
                                                          compact
                                                          label='시작 시간'
                                                          onChange={(value) => {
                                                            updateLectureOfflineSchedule(
                                                              section.key,
                                                              lecture.key,
                                                              scheduleIndex,
                                                              (current) => ({
                                                                ...current,
                                                                startTime: value,
                                                              }),
                                                            );
                                                          }}
                                                          options={OFFLINE_START_TIME_OPTIONS}
                                                          value={schedule.startTime ?? ''}
                                                        />
                                                        <AdminDropdownField
                                                          className={
                                                            styles['offlineScheduleTimeSelect']
                                                          }
                                                          compact
                                                          label='종료 시간'
                                                          onChange={(value) => {
                                                            updateLectureOfflineSchedule(
                                                              section.key,
                                                              lecture.key,
                                                              scheduleIndex,
                                                              (current) => ({
                                                                ...current,
                                                                endTime: value,
                                                              }),
                                                            );
                                                          }}
                                                          options={buildOfflineEndTimeOptions(
                                                            schedule.startTime,
                                                          )}
                                                          value={schedule.endTime ?? ''}
                                                        />
                                                      </div>
                                                      <TextField
                                                        errorClassName={
                                                          styles['offlineScheduleFieldError']
                                                        }
                                                        label='장소'
                                                        name={`lecture-offline-location-${lecture.key}-${String(scheduleIndex)}`}
                                                        onChange={(event) => {
                                                          updateLectureOfflineSchedule(
                                                            section.key,
                                                            lecture.key,
                                                            scheduleIndex,
                                                            (current) => ({
                                                              ...current,
                                                              location: event.target.value || null,
                                                            }),
                                                          );
                                                        }}
                                                        value={schedule.location ?? ''}
                                                      />
                                                      <TextAreaField
                                                        errorClassName={
                                                          styles['offlineScheduleFieldError']
                                                        }
                                                        label='비고'
                                                        name={`lecture-offline-notes-${lecture.key}-${String(scheduleIndex)}`}
                                                        onChange={(event) => {
                                                          updateLectureOfflineSchedule(
                                                            section.key,
                                                            lecture.key,
                                                            scheduleIndex,
                                                            (current) => ({
                                                              ...current,
                                                              notes: event.target.value || null,
                                                            }),
                                                          );
                                                        }}
                                                        rows={3}
                                                        value={schedule.notes ?? ''}
                                                      />
                                                    </div>
                                                  ))}
                                              </div>
                                              <div className={styles['actionRow']}>
                                                {lecture.offlineSchedules.length === 0 ? (
                                                  <Button
                                                    disabled={!hasOfflineSchedulePeriod}
                                                    onClick={() => {
                                                      addLectureOfflineSchedule(
                                                        section.key,
                                                        lecture.key,
                                                      );
                                                    }}
                                                    type='button'
                                                    variant='secondary'
                                                  >
                                                    일정 입력
                                                  </Button>
                                                ) : null}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
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
