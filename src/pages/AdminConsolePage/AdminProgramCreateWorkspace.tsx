/* eslint-disable @typescript-eslint/no-deprecated */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Blocker } from 'react-router';
import { useBlocker } from 'react-router';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  createAdminProblemMediaUploadTarget,
  uploadAdminProblemMediaFile,
} from '@/api/adminProblemMedia';
import {
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
import AdminCategoryPicker from '@/components/admin/AdminCategoryPicker/AdminCategoryPicker';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import AdminFieldArray from '@/components/admin/AdminFieldArray/AdminFieldArray';
import { LoadingSpinner } from '@/components/feedback/Loading/LoadingSpinner';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { useAdminCategoriesTreeQuery } from '@/query/useAdminCategoriesQuery';
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

import styles from './AdminConsolePage.module.scss';
import {
  PROGRAM_THUMBNAIL_FILE_ACCEPT,
  validateProgramThumbnailFile,
} from './adminConsolePageShared';

const TARGET_PART_SIZE_BYTES = 8 * 1024 * 1024;
const RESOURCE_FILE_ACCEPT = '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

type SaveState = 'saved' | 'saving' | 'dirty' | 'error';
type AdminProgramCreateView = 'details' | 'curriculum' | 'problems' | 'resources';

interface AdminProgramCreateWorkspaceProps {
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

interface UploadProgressModalState {
  description: string;
  title: string;
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
  OFFLINE: '현장강의',
  PRACTICUM: '실습강의',
  PROBLEM: '문제강의',
  RESOURCE: '첨부자료',
  VIDEO: '영상강의',
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
const supportsLectureVideo = (lecture: AdminProgramDraftLecture) =>
  lecture.lectureType === 'VIDEO' || lecture.lectureType === 'OFFLINE';

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
  instructorBio: null,
  instructorName: null,
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
  mediaUrl: null,
  options: createFiveChoiceOptions(),
  questionText: '',
  questionType: 'SINGLE',
  sortOrder: 0,
});

const createEmptyProblem = (lectureKey: string): AdminProgramDraftProblem => ({
  description: null,
  lectureKey,
  passScore: 60,
  questions: [createEmptyQuestion()],
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
  published: false,
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
  sections: payload.sections.map((section) => ({
    ...section,
    lectures: section.lectures.map((lecture) => ({
      ...lecture,
      offlineSchedules: normalizeLegacyOfflineSchedules(lecture),
    })),
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
  OFFLINE: '현장',
  PRACTICUM: '실습',
  PROBLEM: '문제',
  RESOURCE: '첨부자료',
  VIDEO: '영상',
};

const getCurriculumGuideText = (programType: AdminProgramType | null): string => {
  switch (programType) {
    case 'OFFLINE':
      return '각 섹션 안에서 영상강의, 현장강의, 문제강의, 첨부자료를 구성합니다.';
    case 'HYBRID':
      return '각 섹션 안에서 영상강의, 실습강의, 문제강의, 첨부자료를 구성합니다.';
    case 'PROBLEM_SOLVING':
      return '각 섹션 안에서 문제강의와 첨부자료만 구성합니다.';
    case 'ONLINE':
    default:
      return '각 섹션 안에서 영상강의, 문제강의, 첨부자료를 구성합니다.';
  }
};

const formatDraftDurationLabel = (durationSeconds: number | null): string => {
  if (durationSeconds === null || durationSeconds <= 0) {
    return '자동 반영 대기';
  }

  const totalMinutes = Math.floor(durationSeconds / 60);
  if (totalMinutes <= 0) {
    return `${String(durationSeconds)}초`;
  }

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

const formatDraftLectureCardLabel = (
  lectureIndex: number,
  lectureType: AdminLectureType,
): string => {
  return `강의 ${String(lectureIndex + 1)}-${LECTURE_TYPE_SHORT_LABELS[lectureType]}`;
};

const getQuestionMediaAccept = (mediaType: AdminProblemMediaType | null) => {
  if (mediaType === 'IMAGE') {
    return 'image/*';
  }
  if (mediaType === 'VIDEO') {
    return 'video/*';
  }

  return undefined;
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
    return '처리 중';
  }
  if (status === 'READY') {
    return readyFallback;
  }
  if (status === 'FAILED') {
    return errorMessage?.trim() || '업로드 실패';
  }
  return '미설정';
};

const programTypeOptions = [
  { value: 'ONLINE', label: '온라인' },
  { value: 'OFFLINE', label: '오프라인' },
  { value: 'HYBRID', label: '하이브리드' },
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
  { value: 'FIXED_DURATION', label: '고정 기간' },
  { value: 'COHORT', label: '기수형' },
] as const;

const mediaTypeOptions = [
  { value: 'IMAGE', label: '이미지' },
  { value: 'VIDEO', label: '영상' },
] as const;

const PROGRAM_CREATE_WORKSPACE_PATH_PREFIX = routePaths.adminProgramCreate;

const toDateTimeLocal = (value: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${String(year)}-${month}-${day}T${hours}:${minutes}`;
};

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

const toIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '아직 저장되지 않음';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
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
      recommendedFor: nextPayload.basicInfo?.recommendedFor ?? [],
      summaryItems: nextPayload.basicInfo?.summaryItems ?? [],
    },
    problems:
      nextPayload.problems?.map((problem) => ({
        ...problem,
        questions: problem.questions.map((question) => ({
          ...question,
          options: normalizeQuestionOptions(question.options),
          questionType: resolveQuestionType(question.options),
        })),
      })) ?? [],
    sections: nextPayload.sections?.length
      ? nextPayload.sections.map((section) => ({
          ...section,
          lectures: section.lectures.map((lecture) => ({
            ...lecture,
            lectureType:
              lecture.lectureType ??
              getDefaultLectureType(nextPayload.basicInfo?.programType ?? 'ONLINE'),
            offlineSchedules: lecture.offlineSchedules ?? [],
            videoUploadErrorMessage: lecture.videoUploadErrorMessage ?? null,
            videoUploadFileName: lecture.videoUploadFileName ?? null,
            videoUploadStatus: lecture.videoUploadStatus ?? null,
          })),
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

const AdminProgramCreateWorkspace = ({ view = 'details' }: AdminProgramCreateWorkspaceProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const requestedDraftId = Number(searchParams.get('draftId') ?? '');
  const draftId =
    Number.isFinite(requestedDraftId) && requestedDraftId > 0 ? requestedDraftId : null;
  const detailQuery = useAdminProgramDraftDetailQuery(draftId, draftId !== null);
  const categoriesQuery = useAdminCategoriesTreeQuery(true);
  const [payload, setPayload] = useState<AdminProgramDraftPayload | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [questionUploadStatus, setQuestionUploadStatus] = useState<Record<string, string>>({});
  const [pendingQuestionMediaSelections, setPendingQuestionMediaSelections] = useState<
    Record<string, PendingLocalFile>
  >({});
  const [pendingVideoSelections, setPendingVideoSelections] = useState<
    Record<string, PendingLocalFile>
  >({});
  const [lectureVideoSizeLabels, setLectureVideoSizeLabels] = useState<Record<string, string>>({});
  const [pendingResourceSelections, setPendingResourceSelections] = useState<
    Record<string, PendingLocalFile>
  >({});
  const [expandedSectionKeys, setExpandedSectionKeys] = useState<string[]>([]);
  const [expandedLectureKeys, setExpandedLectureKeys] = useState<string[]>([]);
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

  const createDraftMutation = useMutation({
    mutationFn: () => createAdminProgramDraft(),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 초안을 생성하지 못했습니다.',
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
    }) => updateAdminProgramDraft(targetDraftId, nextPayload),
    onError: (error: unknown) => {
      setSaveState('error');
      showToast({
        message: error instanceof Error ? error.message : '프로그램 초안을 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (detail) => {
      const normalizedPayload = normalizePayloadFromDetail(detail);
      lastSavedPayloadRef.current = JSON.stringify(normalizedPayload);
      setLastSavedAt(detail.updatedAt);
      const latestPayload = currentPayloadRef.current;
      const latestSerializedPayload = latestPayload
        ? JSON.stringify(latestPayload)
        : lastSavedPayloadRef.current;
      saveCreateWorkspaceSnapshot(detail.id, {
        lastSavedAt: detail.updatedAt,
        lastSavedPayload: lastSavedPayloadRef.current,
        payload: latestPayload ?? normalizedPayload,
      });
      setSaveState(latestSerializedPayload === lastSavedPayloadRef.current ? 'saved' : 'dirty');
      void queryClient.invalidateQueries({ queryKey: adminProgramDraftsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: adminProgramDraftDetailQueryKey(detail.id) });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (targetDraftId: number) => {
      if (payload) {
        const serializedPayload = JSON.stringify(payload);
        if (serializedPayload !== lastSavedPayloadRef.current) {
          await saveMutation.mutateAsync({ draftId: targetDraftId, nextPayload: payload });
        }
      }
      return finalizeAdminProgramDraft(targetDraftId);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 등록을 완료하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (result, targetDraftId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
        queryClient.invalidateQueries({ queryKey: adminProgramDraftsQueryKey() }),
      ]);
      showToast({
        message: '프로그램 등록을 완료했습니다. 숨김 상태로 생성되었습니다.',
        variant: 'success',
      });
      clearCreateWorkspaceSnapshot(targetDraftId);
      navigateWithoutPrompt(routePaths.adminProgramEdit(String(result.programId)));
    },
  });

  const discardMutation = useMutation({
    mutationFn: (targetDraftId: number) => discardAdminProgramDraft(targetDraftId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 초안을 폐기하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, targetDraftId) => {
      await queryClient.invalidateQueries({ queryKey: adminProgramDraftsQueryKey() });
      showToast({
        message: '프로그램 초안을 폐기했습니다.',
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
          isProgramCreateWorkspacePath(currentLocation.pathname) &&
          isProgramCreateWorkspacePath(nextLocation.pathname)
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
  }, [createDraftMutation, draftId]);

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
      basicInfo: {
        ...current.basicInfo,
        [field]: value,
      },
    }));
  };

  const handleProgramThumbnailFileChange = async (file: File | null) => {
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

      showToast({
        message: '대표 이미지를 업로드했습니다.',
        variant: 'success',
      });
    } catch (error: unknown) {
      showToast({
        message: error instanceof Error ? error.message : '대표 이미지 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setIsUploadingThumbnail(false);
      setUploadProgressModal(null);
    }
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
      const existingProblem =
        current.problems.find((problem) => problem.lectureKey === lectureKey) ??
        createEmptyProblem(lectureKey);
      const nextProblem = updater(existingProblem);
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
      const next: Record<string, PendingLocalFile> = {};
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
      const next: Record<string, PendingLocalFile> = {};
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
              const questionMediaAccept = getQuestionMediaAccept(question.mediaType);
              const questionMediaInputId = `problem-question-media-upload-${lectureKey}-${String(questionIndex)}`;

              return (
                <article
                  className={styles['panel']}
                  key={`problem-question-${lectureKey}-${String(questionIndex)}`}
                >
                  <div className={styles['panelToolbar']}>
                    <div>
                      <h6 className={styles['panelTitle']}>문제 {String(questionIndex + 1)}</h6>
                      <p className={styles['metaText']}>
                        {questionUploadStatus[uploadKey] ??
                          (question.mediaAssetId ? '미디어 연결됨' : '미디어 없음')}
                      </p>
                    </div>
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

                  <TextAreaField
                    label='문제 내용'
                    name={`problem-question-text-${lectureKey}-${String(questionIndex)}`}
                    onChange={(event) => {
                      updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                        ...current,
                        questionText: event.target.value,
                      }));
                    }}
                    value={question.questionText}
                  />

                  <TextAreaField
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

                  <div className={styles['questionMediaRow']}>
                    <AdminDropdownField
                      compact
                      label='미디어 유형'
                      onChange={(nextValue) => {
                        updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                          ...current,
                          mediaAssetId: nextValue ? current.mediaAssetId : null,
                          mediaType: nextValue ? (nextValue as AdminProblemMediaType) : null,
                          mediaUrl: nextValue ? current.mediaUrl : null,
                        }));
                        if (!nextValue) {
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
                        }
                      }}
                      options={[{ value: '', label: '선택 안 함' }, ...mediaTypeOptions]}
                      value={question.mediaType ?? ''}
                    />

                    {question.mediaType ? (
                      <div className={styles['questionMediaActions']}>
                        <input
                          accept={questionMediaAccept}
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
                        <Button
                          onClick={() => {
                            document.getElementById(questionMediaInputId)?.click();
                          }}
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
                            }}
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
                                mediaUrl: null,
                              }));
                              setQuestionUploadStatus((current) => {
                                const next = { ...current };
                                delete next[uploadKey];
                                return next;
                              });
                            }}
                            type='button'
                            variant='secondary'
                          >
                            미디어 제거
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {pendingQuestionMediaSelection ? (
                    <div className={styles['curriculumStatGrid']}>
                      <div className={styles['curriculumStatCard']}>
                        <span className={styles['curriculumStatLabel']}>선택한 파일</span>
                        <strong className={styles['curriculumStatValue']}>
                          {pendingQuestionMediaSelection.file.name}
                        </strong>
                      </div>
                      <div className={styles['curriculumStatCard']}>
                        <span className={styles['curriculumStatLabel']}>파일 크기</span>
                        <strong className={styles['curriculumStatValue']}>
                          {pendingQuestionMediaSelection.sizeLabel}
                        </strong>
                      </div>
                    </div>
                  ) : null}

                  {question.mediaUrl ? (
                    <TextField
                      label='미디어 미리보기 URL'
                      name={`problem-question-media-${lectureKey}-${String(questionIndex)}`}
                      onChange={(event) => {
                        updateProblemQuestion(lectureKey, questionIndex, (current) => ({
                          ...current,
                          mediaUrl: event.target.value,
                        }));
                      }}
                      value={question.mediaUrl}
                    />
                  ) : null}

                  <div className={styles['stackListCompact']}>
                    <div className={styles['quizOptionHeader']}>
                      <span />
                      <span className={styles['quizOptionHeaderLabel']}>
                        정답 보기에 체크하세요. 복수정답이면 여러 개를 체크하면 됩니다.
                      </span>
                    </div>
                    {question.options.map((option, optionIndex) => (
                      <div
                        className={styles['quizOptionRow']}
                        key={`problem-option-${String(optionIndex)}`}
                      >
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
                        </label>
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
                      </div>
                    ))}
                  </div>
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
    if (draftId === null || payload === null) {
      return true;
    }

    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload === lastSavedPayloadRef.current) {
      return true;
    }

    setSaveState('saving');

    try {
      await saveMutation.mutateAsync({ draftId, nextPayload: payload });
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

    if (!window.confirm('작성 중인 초안을 폐기하면 되돌릴 수 없습니다. 계속하시겠습니까?')) {
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

  const pollVideoReady = async (videoId: number): Promise<number | null> => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const status = await fetchAdminVideoStatus(videoId);
      if (status.status === 'READY') {
        return status.durationSeconds;
      }
      if (status.status === 'FAILED') {
        throw new Error(status.errorMessage || '영상 인코딩에 실패했습니다.');
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }

    throw new Error('영상 인코딩 대기 시간이 초과되었습니다.');
  };

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

    setUploadProgressModal({
      description: '영상 업로드와 인코딩이 끝날 때까지 잠시 기다려 주세요.',
      title: '동영상 업로드 중',
    });

    try {
      if (draftId === null) {
        throw new Error('프로그램 초안을 먼저 저장해 주세요.');
      }

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
      const completedParts = await Promise.all(
        chunks.map(async (chunk) => ({
          eTag: await uploadPart(
            chunk.uploadUrl,
            chunk.blob,
            file.type || 'application/octet-stream',
          ),
          partNumber: chunk.partNumber,
        })),
      );

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
        videoId: null,
      });
      await completeAdminVideoUpload(session.videoId, {
        parts: completedParts,
        uploadId: session.uploadId,
      });
      await startAdminVideoEncoding(session.videoId);
      const durationSeconds = await pollVideoReady(session.videoId);

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
      showToast({
        message: '강의 영상을 초안에 연결했습니다.',
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
      showToast({
        message: error instanceof Error ? error.message : '강의 영상 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setUploadProgressModal(null);
    }
  };

  const handleQuestionMediaSelection = (lectureKey: string, questionIndex: number, file: File) => {
    const uploadKey = `${lectureKey}:${String(questionIndex)}`;

    setPendingQuestionMediaSelections((current) => ({
      ...current,
      [uploadKey]: {
        file,
        sizeLabel: `${formatFileSizeInMb(file.size)} MB`,
      },
    }));
    setQuestionUploadStatus((current) => ({
      ...current,
      [uploadKey]: `업로드 대기 · ${file.name}`,
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
        message: '문제 미디어를 초안에 연결했습니다.',
        variant: 'success',
      });
    } catch (error) {
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
        throw new Error('프로그램 초안을 먼저 저장해 주세요.');
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
        message: '강의 자료를 초안에 연결했습니다.',
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
        <h1 className={styles['stateTitle']}>통합 등록 워크스페이스를 준비하는 중입니다.</h1>
        <p className={styles['stateDescription']}>
          프로그램 초안과 기본 데이터를 불러오고 있습니다.
        </p>
      </section>
    );
  }

  if (createDraftMutation.isError || detailQuery.isError || categoriesQuery.isError) {
    const error = createDraftMutation.error || detailQuery.error || categoriesQuery.error;

    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>통합 등록 화면을 불러오지 못했습니다.</h1>
        <p className={styles['stateDescription']}>
          {error instanceof Error ? error.message : '프로그램 초안 준비에 실패했습니다.'}
        </p>
      </section>
    );
  }

  if (payload === null) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>통합 등록 워크스페이스를 준비하는 중입니다.</h1>
        <p className={styles['stateDescription']}>프로그램 초안 데이터를 마무리하고 있습니다.</p>
      </section>
    );
  }

  const createDraftSearch = draftId === null ? '' : `?draftId=${String(draftId)}`;
  const blockingUploadMessages = payload.sections.flatMap((section) =>
    section.lectures.flatMap((lecture) => {
      const messages: string[] = [];
      const lectureLabel = lecture.title?.trim() || '미제목 강의';
      if (pendingVideoSelections[lecture.key]) {
        messages.push(`${lectureLabel}: 선택한 영상 파일 업로드 시작이 필요합니다.`);
      }
      if (lecture.videoUploadStatus === 'UPLOADING' || lecture.videoUploadStatus === 'PROCESSING') {
        messages.push(`${lectureLabel}: 영상 업로드 또는 인코딩이 아직 진행 중입니다.`);
      }
      if (lecture.videoUploadStatus === 'FAILED') {
        messages.push(`${lectureLabel}: 영상 업로드가 실패했습니다.`);
      }

      const lectureResources = payload.resources.filter(
        (resource) => resource.lectureKey === lecture.key,
      );
      for (const resource of lectureResources) {
        const resourceLabel = resource.title?.trim() || '미제목 자료';
        if (pendingResourceSelections[resource.key]) {
          messages.push(
            `${lectureLabel} / ${resourceLabel}: 선택한 자료 파일 업로드 시작이 필요합니다.`,
          );
          continue;
        }
        if (resource.uploadStatus === 'UPLOADING' || resource.uploadStatus === 'PROCESSING') {
          messages.push(`${lectureLabel} / ${resourceLabel}: 자료 업로드가 아직 진행 중입니다.`);
          continue;
        }
        if (resource.uploadStatus === 'FAILED') {
          messages.push(`${lectureLabel} / ${resourceLabel}: 자료 업로드가 실패했습니다.`);
          continue;
        }
        if (!resource.fileUrl || !resource.fileName || !resource.fileSize) {
          messages.push(`${lectureLabel} / ${resourceLabel}: 자료 파일을 업로드해야 합니다.`);
        }
      }

      return messages;
    }),
  );
  const activeView: Exclude<AdminProgramCreateView, 'problems' | 'resources'> =
    view === 'problems' || view === 'resources' ? 'curriculum' : view;
  const createTabs: ReadonlyArray<{
    key: Exclude<AdminProgramCreateView, 'problems' | 'resources'>;
    label: string;
    path: string;
  }> = [
    {
      key: 'details',
      label: '기본정보',
      path: `${routePaths.adminProgramCreate}${createDraftSearch}`,
    },
    {
      key: 'curriculum',
      label: '커리큘럼',
      path: `${routePaths.adminProgramCreateCurriculum}${createDraftSearch}`,
    },
  ];

  return (
    <section className={styles['workspace']}>
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
              onClick={() => {
                void handleManualSave();
              }}
              type='button'
              variant='secondary'
            >
              {saveMutation.isPending ? '저장 중...' : '임시저장'}
            </Button>
            <Button
              disabled={
                finalizeMutation.isPending ||
                discardMutation.isPending ||
                blockingUploadMessages.length > 0
              }
              onClick={() => {
                if (draftId !== null) {
                  finalizeMutation.mutate(draftId);
                }
              }}
              type='button'
            >
              {finalizeMutation.isPending ? '등록 중...' : '등록 완료'}
            </Button>
            <Button
              disabled={discardMutation.isPending || finalizeMutation.isPending}
              onClick={handleDiscard}
              type='button'
              variant='danger'
            >
              초안 폐기
            </Button>
          </div>
        </div>

        <div className={styles['editorHeaderCompact']}>
          <div className={styles['pageHeader']}>
            <h1 className={styles['pageTitle']}>새 프로그램 통합 등록</h1>
          </div>
          <div className={styles['editorMetaRow']}>
            <span className={styles['badge']}>초안 #{String(draftId)}</span>
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
              <span className={styles['badge']}>업로드 완료 후 등록 가능</span>
            ) : null}
          </div>
        </div>

        {blockingUploadMessages.length ? (
          <div className={styles['uploadBlockingSummary']}>
            <strong className={styles['panelTitle']}>등록 전에 확인할 업로드 항목</strong>
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
              임시저장 버튼을 누르지 않은 내용은 다른 페이지로 이동하면 복구되지 않습니다.
            </p>
            <div className={styles['actionRow']}>
              <Button onClick={handleStayOnPage} type='button' variant='secondary'>
                계속 작성
              </Button>
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
              <Button
                disabled={navigationDecisionState === 'saving'}
                onClick={handleLeaveWithoutSaving}
                type='button'
                variant='danger'
              >
                저장하지 않고 이동
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
        <nav aria-label='새 프로그램 등록 섹션' className={styles['workspaceTabs']}>
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
                        updateBasicInfo('title', event.target.value);
                      }}
                      value={payload.basicInfo.title ?? ''}
                    />
                    <TextField
                      label='슬러그'
                      name='draft-slug'
                      onChange={(event) => {
                        updateBasicInfo('slug', event.target.value);
                      }}
                      value={payload.basicInfo.slug ?? ''}
                    />
                  </div>

                  <div className={styles['compactFieldRow']}>
                    <AdminDropdownField
                      compact
                      label='프로그램 형태'
                      onChange={(nextValue) => {
                        updateBasicInfo('programType', nextValue as AdminProgramType);
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
                      disabled={payload.basicInfo.programType === 'OFFLINE'}
                      label='수강 정책'
                      onChange={(nextValue) => {
                        updateBasicInfo('accessPolicy', nextValue as AdminProgramAccessPolicy);
                      }}
                      options={accessPolicyOptions}
                      value={
                        payload.basicInfo.programType === 'OFFLINE'
                          ? 'COHORT'
                          : (payload.basicInfo.accessPolicy ?? 'UNLIMITED')
                      }
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
                          프로그램 카드와 상세 상단에 노출될 이미지를 업로드합니다.
                        </p>
                      </div>
                    </div>
                    <input
                      accept={PROGRAM_THUMBNAIL_FILE_ACCEPT}
                      className={styles['thumbnailFileInput']}
                      name='draft-thumbnail-file'
                      onChange={(event) => {
                        void handleProgramThumbnailFileChange(event.target.files?.[0] ?? null);
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
                      label='강사명'
                      name='draft-instructor-name'
                      onChange={(event) => {
                        updateBasicInfo('instructorName', event.target.value);
                      }}
                      value={payload.basicInfo.instructorName ?? ''}
                    />
                    <TextField
                      label='강사 소개'
                      name='draft-instructor-bio'
                      onChange={(event) => {
                        updateBasicInfo('instructorBio', event.target.value);
                      }}
                      value={payload.basicInfo.instructorBio ?? ''}
                    />
                  </div>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='정가'
                      name='draft-price'
                      onChange={(event) => {
                        updateBasicInfo(
                          'price',
                          event.target.value.trim() ? Number(event.target.value) : null,
                        );
                      }}
                      value={
                        payload.basicInfo.price === null ? '' : String(payload.basicInfo.price)
                      }
                    />
                    <TextField
                      label='할인율(%)'
                      name='draft-discount-percent'
                      onChange={(event) => {
                        updateBasicInfo(
                          'salePrice',
                          calculateSalePriceFromPercent(
                            payload.basicInfo.price,
                            event.target.value,
                          ),
                        );
                      }}
                      value={formatDiscountPercent(
                        payload.basicInfo.price,
                        payload.basicInfo.salePrice,
                      )}
                    />
                  </div>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='정원'
                      name='draft-max-students'
                      onChange={(event) => {
                        updateBasicInfo(
                          'maxStudents',
                          event.target.value.trim() ? Number(event.target.value) : null,
                        );
                      }}
                      value={
                        payload.basicInfo.maxStudents === null
                          ? ''
                          : String(payload.basicInfo.maxStudents)
                      }
                    />
                    <TextField
                      label='수강일수'
                      name='draft-access-days'
                      onChange={(event) => {
                        updateBasicInfo(
                          'accessDays',
                          event.target.value.trim() ? Number(event.target.value) : null,
                        );
                      }}
                      value={
                        payload.basicInfo.accessDays === null
                          ? ''
                          : String(payload.basicInfo.accessDays)
                      }
                    />
                  </div>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='판매 시작일'
                      name='draft-sale-start-at'
                      onChange={(event) => {
                        updateBasicInfo('saleStartAt', toIsoStringOrNull(event.target.value));
                      }}
                      type='datetime-local'
                      value={toDateTimeLocal(payload.basicInfo.saleStartAt)}
                    />
                    <TextField
                      label='판매 종료일'
                      name='draft-sale-end-at'
                      onChange={(event) => {
                        updateBasicInfo('saleEndAt', toIsoStringOrNull(event.target.value));
                      }}
                      type='datetime-local'
                      value={toDateTimeLocal(payload.basicInfo.saleEndAt)}
                    />
                  </div>

                  <p className={styles['policyHint']}>
                    {payload.basicInfo.programType === 'OFFLINE'
                      ? '오프라인 프로그램은 개강일이 지나면 관리자 화면에서 개강됨 상태로 표시됩니다.'
                      : '온라인·하이브리드 프로그램은 판매 종료일을 비워 두면 상시 판매로 운영할 수 있습니다.'}
                  </p>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='수강 시작일'
                      name='draft-learning-start-at'
                      onChange={(event) => {
                        updateBasicInfo('learningStartAt', toIsoStringOrNull(event.target.value));
                      }}
                      type='datetime-local'
                      value={toDateTimeLocal(payload.basicInfo.learningStartAt)}
                    />
                    <TextField
                      label='수강 종료일'
                      name='draft-learning-end-at'
                      onChange={(event) => {
                        updateBasicInfo('learningEndAt', toIsoStringOrNull(event.target.value));
                      }}
                      type='datetime-local'
                      value={toDateTimeLocal(payload.basicInfo.learningEndAt)}
                    />
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
                      <div className={styles['inlineFieldGrid']}>
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
                        <TextField
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
                      <div className={styles['inlineFieldGrid']}>
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
                        <TextField
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
                    <h2 className={styles['panelTitle']}>커리큘럼</h2>
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
                                커리큘럼 최상위 단위
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
                                  : formatUploadStatusLabel(
                                      lecture.videoUploadStatus,
                                      lecture.videoId
                                        ? `연결 완료 · videoId ${String(lecture.videoId)}`
                                        : '영상 미연결',
                                      lecture.videoUploadErrorMessage,
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
                                                    label='제한시간(초)'
                                                    name={`lecture-duration-${lecture.key}`}
                                                    onChange={(event) => {
                                                      updateLecture(
                                                        section.key,
                                                        lecture.key,
                                                        (current) => ({
                                                          ...current,
                                                          durationSeconds: event.target.value.trim()
                                                            ? Number(event.target.value)
                                                            : null,
                                                        }),
                                                      );
                                                    }}
                                                    value={
                                                      lecture.durationSeconds === null
                                                        ? ''
                                                        : String(lecture.durationSeconds)
                                                    }
                                                  />
                                                </div>
                                                {supportsProblem ? (
                                                  <div className={styles['compactTextField']}>
                                                    <TextField
                                                      label='기준 점수'
                                                      name={`problem-pass-score-${lecture.key}`}
                                                      onChange={(event) => {
                                                        upsertProblem(lecture.key, (current) => ({
                                                          ...current,
                                                          passScore: event.target.value.trim()
                                                            ? Number(event.target.value)
                                                            : null,
                                                        }));
                                                      }}
                                                      value={
                                                        lectureQuiz?.passScore === null ||
                                                        lectureQuiz?.passScore === undefined
                                                          ? ''
                                                          : String(lectureQuiz.passScore)
                                                      }
                                                    />
                                                  </div>
                                                ) : null}
                                              </div>
                                            ) : null}
                                          </div>

                                          {supportsVideo ? (
                                            <div className={styles['lectureWorkspaceSection']}>
                                              <h5 className={styles['panelTitle']}>
                                                {supportsOffline ? '선행 영상' : '영상'}
                                              </h5>
                                              {supportsOffline ? (
                                                <p className={styles['helperText']}>
                                                  현장강의 시간은 일정 시작/종료 시각으로
                                                  관리합니다. 선행 영상 길이는 출석 전 영상 확인
                                                  여부 검증에만 사용됩니다.
                                                </p>
                                              ) : null}
                                              <div className={styles['curriculumStatGrid']}>
                                                <div className={styles['curriculumStatCard']}>
                                                  <span className={styles['curriculumStatLabel']}>
                                                    현재 상태
                                                  </span>
                                                  <strong className={styles['curriculumStatValue']}>
                                                    {lectureVideoStatus}
                                                  </strong>
                                                </div>
                                                <div className={styles['curriculumStatCard']}>
                                                  <span className={styles['curriculumStatLabel']}>
                                                    {supportsOffline
                                                      ? '선행 영상 파일'
                                                      : '영상 파일'}
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
                                                    {supportsOffline
                                                      ? '선행 영상 길이'
                                                      : '영상 길이'}
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
                                              <h5 className={styles['panelTitle']}>현장강의</h5>
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
                                                  등록된 현장 일정이 없습니다.
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
                                                      <div className={styles['inlineFieldGrid']}>
                                                        <TextField
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
                                                      </div>
                                                      <div className={styles['inlineFieldGrid']}>
                                                        <AdminDropdownField
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
                                                        <TextField
                                                          label='장소'
                                                          name={`lecture-offline-location-${lecture.key}-${String(scheduleIndex)}`}
                                                          onChange={(event) => {
                                                            updateLectureOfflineSchedule(
                                                              section.key,
                                                              lecture.key,
                                                              scheduleIndex,
                                                              (current) => ({
                                                                ...current,
                                                                location:
                                                                  event.target.value || null,
                                                              }),
                                                            );
                                                          }}
                                                          value={schedule.location ?? ''}
                                                        />
                                                      </div>
                                                      <TextAreaField
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
