/* eslint-disable @typescript-eslint/no-deprecated */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from 'react-router';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  createAdminProgramDraft,
  discardAdminProgramDraft,
  finalizeAdminProgramDraft,
  updateDraftLectureVideoUploadState,
  updateDraftResourceUploadState,
  updateAdminProgramDraft,
} from '@/api/adminProgramDrafts';
import { createAdminQuizMediaUploadTarget, uploadAdminQuizMediaFile } from '@/api/adminQuizMedia';
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
import type {
  AdminDraftUploadStatus,
  AdminProgramDraftDetail,
  AdminProgramDraftLecture,
  AdminProgramDraftPayload,
  AdminProgramDraftQuiz,
  AdminProgramDraftQuizOption,
  AdminProgramDraftQuizQuestion,
  AdminProgramDraftResource,
  AdminProgramDraftSection,
} from '@/types/adminProgramDrafts';
import type {
  AdminProgramAccessPolicy,
  AdminProgramLevel,
  AdminProgramType,
} from '@/types/adminProgramsLive';
import type { AdminQuizMediaType } from '@/types/adminQuizzes';

import styles from './AdminConsolePage.module.scss';

const TARGET_PART_SIZE_BYTES = 8 * 1024 * 1024;
const RESOURCE_FILE_ACCEPT = '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

type SaveState = 'saved' | 'saving' | 'dirty' | 'error';
type AdminProgramCreateView = 'details' | 'curriculum' | 'quizzes' | 'resources';
type DraftLectureWorkspacePanel = 'basic' | 'video' | 'quiz' | 'resource' | 'practicum' | 'offline';

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

const EMPTY_DRAFT_OFFLINE_SESSION = {
  endDate: null,
  endTime: null,
  location: null,
  notes: null,
  startDate: null,
  startTime: null,
  weekdays: [] as string[],
};

const LECTURE_TYPE_LABELS: Record<AdminLectureType, string> = {
  OFFLINE: '현장강의',
  PRACTICUM: '실습강의',
  PROBLEM: '문제강의',
  RESOURCE: '자료강의',
  VIDEO: '영상강의',
};

const LECTURE_TYPE_DESCRIPTIONS: Record<AdminLectureType, string> = {
  OFFLINE: '기간, 요일, 시간, 장소가 정해진 현장 진행 강의입니다.',
  PRACTICUM: '예약 가능한 실습 중심 강의입니다.',
  PROBLEM: '문제로만 구성되는 문제풀이 강의입니다.',
  RESOURCE: 'PDF, PPT, HWP 같은 자료 중심 강의입니다.',
  VIDEO: '수강생이 영상을 시청하는 일반 온라인 강의입니다.',
};

const getAllowedLectureTypes = (programType: AdminProgramType | null): AdminLectureType[] => {
  switch (programType) {
    case 'OFFLINE':
      return ['OFFLINE', 'VIDEO', 'RESOURCE', 'PROBLEM'];
    case 'HYBRID':
      return ['VIDEO', 'PRACTICUM', 'RESOURCE', 'PROBLEM'];
    case 'PROBLEM_SOLVING':
      return ['PROBLEM'];
    case 'ONLINE':
    default:
      return ['VIDEO', 'RESOURCE', 'PROBLEM'];
  }
};

const getDefaultLectureType = (programType: AdminProgramType | null): AdminLectureType => {
  return getAllowedLectureTypes(programType)[0] ?? 'VIDEO';
};

const getDefaultWorkspacePanelForLectureType = (
  lectureType: AdminLectureType,
): DraftLectureWorkspacePanel => {
  switch (lectureType) {
    case 'VIDEO':
      return 'video';
    case 'RESOURCE':
      return 'resource';
    case 'PROBLEM':
      return 'quiz';
    case 'PRACTICUM':
      return 'practicum';
    case 'OFFLINE':
      return 'offline';
  }
};

const isProblemLecture = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'PROBLEM';
const isVideoLecture = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'VIDEO';
const isOfflineLecture = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'OFFLINE';
const isPracticumLecture = (lecture: AdminProgramDraftLecture) =>
  lecture.lectureType === 'PRACTICUM';
const isResourceLecture = (lecture: AdminProgramDraftLecture) => lecture.lectureType === 'RESOURCE';

const createClientKey = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  thumbnailUrl: null,
  title: null,
});

const createEmptyQuestionOption = (
  sortOrder: number,
  correct = false,
): AdminProgramDraftQuizOption => ({
  correct,
  mediaType: null,
  mediaUrl: null,
  optionText: '',
  sortOrder,
});

const createFiveChoiceOptions = (): AdminProgramDraftQuizOption[] => {
  return Array.from({ length: 5 }, (_, index) => createEmptyQuestionOption(index, false));
};

const normalizeQuestionOptions = (
  options: readonly AdminProgramDraftQuizOption[],
): AdminProgramDraftQuizOption[] => {
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

const resolveQuestionType = (options: readonly AdminProgramDraftQuizOption[]) => {
  const correctCount = options.filter((option) => option.correct).length;
  return correctCount > 1 ? 'MULTIPLE' : 'SINGLE';
};

const createEmptyQuestion = (): AdminProgramDraftQuizQuestion => ({
  explanation: null,
  mediaAssetId: null,
  mediaType: null,
  mediaUrl: null,
  options: createFiveChoiceOptions(),
  questionText: '',
  questionType: 'SINGLE',
  sortOrder: 0,
});

const createEmptyQuiz = (lectureKey: string): AdminProgramDraftQuiz => ({
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
  offlineScheduleRule: null,
  practicumDescription: null,
  practicumTitle: null,
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
  quizzes: [],
  resources: [],
  sections: [createEmptySection(0)],
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

const formatDraftLectureDelivery = (lecture: AdminProgramDraftSection['lectures'][number]) => {
  return LECTURE_TYPE_LABELS[lecture.lectureType];
};

const getQuestionMediaAccept = (mediaType: AdminQuizMediaType | null) => {
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
  const nextPayload = detail.payload ?? createEmptyPayload();
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
    quizzes:
      nextPayload.quizzes?.map((quiz) => ({
        ...quiz,
        questions: quiz.questions.map((question) => ({
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
            offlineScheduleRule: lecture.offlineScheduleRule ?? null,
            practicumDescription: lecture.practicumDescription ?? null,
            practicumTitle: lecture.practicumTitle ?? null,
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
  const [pendingResourceSelections, setPendingResourceSelections] = useState<
    Record<string, PendingLocalFile>
  >({});
  const [expandedSectionKeys, setExpandedSectionKeys] = useState<string[]>([]);
  const [expandedLectureKeys, setExpandedLectureKeys] = useState<string[]>([]);
  const [lectureWorkspaceByKey, setLectureWorkspaceByKey] = useState<
    Record<string, DraftLectureWorkspacePanel | null>
  >({});
  const [lectureTypePickerSectionKey, setLectureTypePickerSectionKey] = useState<string | null>(
    null,
  );
  const [navigationDecisionState, setNavigationDecisionState] = useState<'idle' | 'saving'>('idle');
  const hasRequestedDraftRef = useRef(false);
  const initializedDraftIdRef = useRef<number | null>(null);
  const lastSavedPayloadRef = useRef<string>('');
  const currentPayloadRef = useRef<AdminProgramDraftPayload | null>(null);
  const bypassNavigationBlockRef = useRef(false);

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
      const nextPayload = snapshot?.payload ?? normalizedPayload;
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
  const lectureTypePickerSection =
    lectureTypePickerSectionKey && payload
      ? (payload.sections.find((section) => section.key === lectureTypePickerSectionKey) ?? null)
      : null;
  const navigationBlocker = useBlocker(
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

  useEffect(() => {
    if (draftId !== null || hasRequestedDraftRef.current) {
      return;
    }

    hasRequestedDraftRef.current = true;
    createDraftMutation.mutate();
  }, [createDraftMutation, draftId]);

  useEffect(() => {
    const detail = detailQuery.data ?? createDraftMutation.data;
    if (!detail || initializedDraftIdRef.current === detail.id) {
      return;
    }

    const normalizedPayload = normalizePayloadFromDetail(detail);
    const snapshot = loadCreateWorkspaceSnapshot(detail.id);
    const nextPayload = snapshot?.payload ?? normalizedPayload;
    setPayload(nextPayload);
    currentPayloadRef.current = nextPayload;
    initializedDraftIdRef.current = detail.id;
    lastSavedPayloadRef.current = snapshot?.lastSavedPayload ?? JSON.stringify(normalizedPayload);
    setLastSavedAt(snapshot?.lastSavedAt ?? detail.updatedAt);
    setSaveState(JSON.stringify(nextPayload) === lastSavedPayloadRef.current ? 'saved' : 'dirty');
  }, [detailQuery.data]);

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

  const openLectureWorkspace = (lectureKey: string, panel: DraftLectureWorkspacePanel) => {
    setExpandedLectureKeys((current) =>
      current.includes(lectureKey) ? current : [...current, lectureKey],
    );
    setLectureWorkspaceByKey((current) => ({
      ...current,
      [lectureKey]: current[lectureKey] === panel ? 'basic' : panel,
    }));
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
      quizzes: current.quizzes.filter(
        (quiz) =>
          !current.sections
            .find((section) => section.key === sectionKey)
            ?.lectures.some((lecture) => lecture.key === quiz.lectureKey),
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
    setLectureWorkspaceByKey((current) => ({
      ...current,
      [nextLecture.key]: getDefaultWorkspacePanelForLectureType(lectureType),
    }));
  };

  const openLectureTypePicker = (sectionKey: string) => {
    setLectureTypePickerSectionKey(sectionKey);
  };

  const closeLectureTypePicker = () => {
    setLectureTypePickerSectionKey(null);
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
      quizzes: current.quizzes.filter((quiz) => quiz.lectureKey !== lectureKey),
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
    setLectureWorkspaceByKey((current) => {
      const next = { ...current };
      delete next[lectureKey];
      return next;
    });
    setPendingVideoSelections((current) => {
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

  const upsertQuiz = (
    lectureKey: string,
    updater: (quiz: AdminProgramDraftQuiz) => AdminProgramDraftQuiz,
  ) => {
    updatePayload((current) => {
      const existingQuiz =
        current.quizzes.find((quiz) => quiz.lectureKey === lectureKey) ??
        createEmptyQuiz(lectureKey);
      const nextQuiz = updater(existingQuiz);
      const hasQuiz = current.quizzes.some((quiz) => quiz.lectureKey === lectureKey);

      return {
        ...current,
        quizzes: hasQuiz
          ? current.quizzes.map((quiz) => (quiz.lectureKey === lectureKey ? nextQuiz : quiz))
          : [...current.quizzes, nextQuiz],
      };
    });
  };

  const removeQuiz = (lectureKey: string) => {
    updatePayload((current) => ({
      ...current,
      quizzes: current.quizzes.filter((quiz) => quiz.lectureKey !== lectureKey),
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

  const addQuizQuestion = (lectureKey: string) => {
    upsertQuiz(lectureKey, (quiz) => ({
      ...quiz,
      questions: [
        ...quiz.questions,
        { ...createEmptyQuestion(), sortOrder: quiz.questions.length },
      ],
    }));
  };

  const updateQuizQuestion = (
    lectureKey: string,
    questionIndex: number,
    updater: (question: AdminProgramDraftQuizQuestion) => AdminProgramDraftQuizQuestion,
  ) => {
    upsertQuiz(lectureKey, (quiz) => ({
      ...quiz,
      questions: quiz.questions.map((question, index) =>
        index === questionIndex ? updater(question) : question,
      ),
    }));
  };

  const removeQuizQuestion = (lectureKey: string, questionIndex: number) => {
    const targetQuiz =
      currentPayloadRef.current?.quizzes.find((quiz) => quiz.lectureKey === lectureKey) ?? null;
    const nextQuestionCount = targetQuiz ? targetQuiz.questions.length - 1 : 0;

    if (nextQuestionCount <= 0) {
      removeQuiz(lectureKey);
      return;
    }

    upsertQuiz(lectureKey, (quiz) => ({
      ...quiz,
      questions: quiz.questions
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

  const updateQuizOption = (
    lectureKey: string,
    questionIndex: number,
    optionIndex: number,
    updater: (option: AdminProgramDraftQuizOption) => AdminProgramDraftQuizOption,
  ) => {
    updateQuizQuestion(lectureKey, questionIndex, (question) => ({
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

  const removeLectureResources = (lectureKey: string) => {
    const removedResourceKeys =
      currentPayloadRef.current?.resources
        .filter((resource) => resource.lectureKey === lectureKey)
        .map((resource) => resource.key) ?? [];

    updatePayload((current) => ({
      ...current,
      resources: reindexDraftResources(
        current.resources.filter((resource) => resource.lectureKey !== lectureKey),
      ),
    }));

    setPendingResourceSelections((current) => {
      const next = { ...current };
      for (const resourceKey of removedResourceKeys) {
        delete next[resourceKey];
      }
      return next;
    });
  };

  const renderLectureQuizWorkspace = (lectureKey: string) => {
    const quiz = payload?.quizzes.find((item) => item.lectureKey === lectureKey) ?? null;

    return (
      <div className={styles['curriculumWorkspace']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h5 className={styles['panelTitle']}>문제</h5>
            <p className={styles['metaText']}>
              문제풀이형 강의는 이 영역만으로도 강의를 구성할 수 있습니다.
            </p>
          </div>
          {quiz ? (
            <Button
              onClick={() => {
                removeQuiz(lectureKey);
              }}
              type='button'
              variant='danger'
            >
              문제 삭제
            </Button>
          ) : (
            <Button
              onClick={() => {
                upsertQuiz(lectureKey, (current) => current);
              }}
              type='button'
              variant='secondary'
            >
              문제 추가
            </Button>
          )}
        </div>

        {quiz ? (
          <div className={styles['stackListCompact']}>
            <div className={styles['inlineFieldGrid']}>
              <TextField
                label='문제 제목'
                name={`quiz-title-${lectureKey}`}
                onChange={(event) => {
                  upsertQuiz(lectureKey, (current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                }}
                value={quiz.title ?? ''}
              />
              <TextField
                label='기준 점수'
                name={`quiz-pass-score-${lectureKey}`}
                onChange={(event) => {
                  upsertQuiz(lectureKey, (current) => ({
                    ...current,
                    passScore: event.target.value.trim() ? Number(event.target.value) : null,
                  }));
                }}
                value={quiz.passScore === null ? '' : String(quiz.passScore)}
              />
            </div>

            {quiz.questions.map((question, questionIndex) => {
              const uploadKey = `${lectureKey}:${String(questionIndex)}`;
              const pendingQuestionMediaSelection =
                pendingQuestionMediaSelections[uploadKey] ?? null;
              const questionMediaAccept = getQuestionMediaAccept(question.mediaType);
              const questionMediaInputId = `quiz-question-media-upload-${lectureKey}-${String(questionIndex)}`;

              return (
                <article
                  className={styles['panel']}
                  key={`quiz-question-${lectureKey}-${String(questionIndex)}`}
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
                        removeQuizQuestion(lectureKey, questionIndex);
                      }}
                      type='button'
                      variant='danger'
                    >
                      문제 삭제
                    </Button>
                  </div>

                  <TextAreaField
                    label='문제 내용'
                    name={`quiz-question-text-${lectureKey}-${String(questionIndex)}`}
                    onChange={(event) => {
                      updateQuizQuestion(lectureKey, questionIndex, (current) => ({
                        ...current,
                        questionText: event.target.value,
                      }));
                    }}
                    value={question.questionText}
                  />

                  <div className={styles['questionMediaRow']}>
                    <AdminDropdownField
                      compact
                      label='미디어 유형'
                      onChange={(nextValue) => {
                        updateQuizQuestion(lectureKey, questionIndex, (current) => ({
                          ...current,
                          mediaAssetId: nextValue ? current.mediaAssetId : null,
                          mediaType: nextValue ? (nextValue as AdminQuizMediaType) : null,
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
                              updateQuizQuestion(lectureKey, questionIndex, (current) => ({
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
                    ) : (
                      <p className={styles['helperText']}>
                        미디어를 붙이려면 먼저 미디어 유형을 선택하세요.
                      </p>
                    )}
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
                      name={`quiz-question-media-${lectureKey}-${String(questionIndex)}`}
                      onChange={(event) => {
                        updateQuizQuestion(lectureKey, questionIndex, (current) => ({
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
                        정답 문항에 체크하세요. 복수정답이면 여러 개를 체크하면 됩니다.
                      </span>
                    </div>
                    {question.options.map((option, optionIndex) => (
                      <div
                        className={styles['quizOptionRow']}
                        key={`quiz-option-${String(optionIndex)}`}
                      >
                        <label className={styles['quizOptionCheckbox']}>
                          <input
                            aria-label={`${String(optionIndex + 1)}번 문항 정답 선택`}
                            checked={option.correct}
                            onChange={(event) => {
                              updateQuizQuestion(lectureKey, questionIndex, (current) => {
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
                          label={`문항 ${String(optionIndex + 1)}`}
                          name={`quiz-option-${lectureKey}-${String(questionIndex)}-${String(optionIndex)}`}
                          onChange={(event) => {
                            updateQuizOption(lectureKey, questionIndex, optionIndex, (current) => ({
                              ...current,
                              optionText: event.target.value,
                            }));
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
                  addQuizQuestion(lectureKey);
                }}
                type='button'
                variant='secondary'
              >
                문제 추가
              </Button>
            </div>
          </div>
        ) : (
          <p className={styles['helperText']}>이 강의에는 아직 초안 문제가 없습니다.</p>
        )}
      </div>
    );
  };

  const renderLectureResourceWorkspace = (lectureKey: string) => {
    const lectureResources = (payload?.resources ?? [])
      .map((resource, resourceIndex) => ({ resource, resourceIndex }))
      .filter(({ resource }) => resource.lectureKey === lectureKey);

    return (
      <div className={styles['curriculumWorkspace']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h5 className={styles['panelTitle']}>강의 자료</h5>
            <p className={styles['metaText']}>이 강의에 연결되는 자료만 여기에서 등록합니다.</p>
          </div>
          <Button
            onClick={() => {
              addResource(lectureKey);
            }}
            type='button'
            variant='secondary'
          >
            자료 추가
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
                        자료 {String(resource.sortOrder + 1)}
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
                      label='자료 제목'
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

                  <TextAreaField
                    label='자료 설명'
                    name={`draft-resource-description-${lectureKey}-${String(resourceIndex)}`}
                    onChange={(event) => {
                      updateResource(resourceIndex, (current) => ({
                        ...current,
                        description: event.target.value,
                      }));
                    }}
                    value={resource.description ?? ''}
                  />
                  <p className={styles['metaText']}>자료는 수강생 전용으로만 등록됩니다.</p>

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
            <p className={styles['helperText']}>이 강의에는 아직 연결된 자료가 없습니다.</p>
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
    setPendingVideoSelections((current) => ({
      ...current,
      [lectureKey]: {
        file,
        sizeLabel: `${formatFileSizeInMb(file.size)} MB`,
      },
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

      const uploadTarget = await createAdminQuizMediaUploadTarget({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
      });

      await uploadAdminQuizMediaFile(uploadTarget.uploadUrl, file);
      updateQuizQuestion(lectureKey, questionIndex, (question) => ({
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
  const activeView: Exclude<AdminProgramCreateView, 'quizzes' | 'resources'> =
    view === 'quizzes' || view === 'resources' ? 'curriculum' : view;
  const createTabs: ReadonlyArray<{
    key: Exclude<AdminProgramCreateView, 'quizzes' | 'resources'>;
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

      {lectureTypePickerSection ? (
        <Modal
          description='강의는 생성 시점에 타입을 먼저 정하고, 바로 해당 작업영역으로 들어갑니다.'
          onClose={closeLectureTypePicker}
          title='강의 타입 선택'
        >
          <div className={styles['stackList']}>
            <div className={styles['stackListCompact']}>
              <strong className={styles['panelTitle']}>
                {lectureTypePickerSection.title?.trim() || '미제목 섹션'}
              </strong>
              <p className={styles['metaText']}>
                {payload?.basicInfo.programType
                  ? `현재 프로그램 유형에서 추가 가능한 강의만 표시합니다. (${payload.basicInfo.programType})`
                  : '프로그램 유형에 따라 추가 가능한 강의 타입이 달라집니다.'}
              </p>
            </div>
            <div className={styles['lectureTypePickerGrid']}>
              {allowedLectureTypes.map((lectureType) => (
                <button
                  className={styles['lectureTypePickerButton']}
                  key={lectureType}
                  onClick={() => {
                    addLecture(lectureTypePickerSection.key, lectureType);
                    closeLectureTypePicker();
                  }}
                  type='button'
                >
                  <strong className={styles['lectureTypePickerLabel']}>
                    {LECTURE_TYPE_LABELS[lectureType]}
                  </strong>
                  <span className={styles['lectureTypePickerDescription']}>
                    {LECTURE_TYPE_DESCRIPTIONS[lectureType]}
                  </span>
                </button>
              ))}
            </div>
            <div className={styles['actionRow']}>
              <Button onClick={closeLectureTypePicker} type='button' variant='secondary'>
                취소
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      <section className={styles['editorWorkspacePanel']}>
        <nav aria-label='새 프로그램 등록 섹션' className={styles['workspaceTabs']}>
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

                  <TextField
                    label='대표 이미지 URL'
                    name='draft-thumbnail-url'
                    onChange={(event) => {
                      updateBasicInfo('thumbnailUrl', event.target.value);
                    }}
                    value={payload.basicInfo.thumbnailUrl ?? ''}
                  />

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
                      label='할인가'
                      name='draft-sale-price'
                      onChange={(event) => {
                        updateBasicInfo(
                          'salePrice',
                          event.target.value.trim() ? Number(event.target.value) : null,
                        );
                      }}
                      value={
                        payload.basicInfo.salePrice === null
                          ? ''
                          : String(payload.basicInfo.salePrice)
                      }
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
                      통합등록에서도 섹션이 최상위입니다. 각 섹션을 펼친 뒤 강의를 만들고, 강의
                      안에서 영상/현장강의/문제풀이/자료를 연결합니다.
                    </p>
                  </div>
                  <Button onClick={addSection} type='button' variant='secondary'>
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
                            <h3 className={styles['panelTitle']}>
                              {section.title?.trim() || '미제목 섹션'}
                            </h3>
                            <p className={styles['metaText']}>
                              {section.description?.trim() || '섹션 설명이 아직 없습니다.'}
                            </p>
                            <div className={styles['curriculumStatGrid']}>
                              <div className={styles['curriculumStatCard']}>
                                <span className={styles['curriculumStatLabel']}>포함 강의</span>
                                <strong className={styles['curriculumStatValue']}>
                                  {`강의 ${String(section.lectures.length)}개`}
                                </strong>
                              </div>
                              <div className={styles['curriculumStatCard']}>
                                <span className={styles['curriculumStatLabel']}>정렬</span>
                                <strong className={styles['curriculumStatValue']}>
                                  {`${String(section.sortOrder + 1)}번째 섹션`}
                                </strong>
                              </div>
                            </div>
                          </div>
                          <div className={styles['curriculumActionColumn']}>
                            <Button
                              onClick={() => {
                                toggleSectionExpanded(section.key);
                              }}
                              type='button'
                              variant='secondary'
                            >
                              {sectionExpanded ? '섹션 접기' : '섹션 펼치기'}
                            </Button>
                            <Button
                              onClick={() => {
                                openLectureTypePicker(section.key);
                              }}
                              type='button'
                              variant='secondary'
                            >
                              새 강의 추가
                            </Button>
                            <Button
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

                        {sectionExpanded ? (
                          <div className={styles['curriculumBody']}>
                            <div className={styles['curriculumWorkspace']}>
                              <div className={styles['inlineFieldGrid']}>
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
                                <TextField
                                  label='정렬 순서'
                                  name={`section-sort-order-${section.key}`}
                                  onChange={(event) => {
                                    updateSection(section.key, (current) => ({
                                      ...current,
                                      sortOrder: Number(event.target.value || 0),
                                    }));
                                  }}
                                  value={String(section.sortOrder)}
                                />
                              </div>
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
                                const activeLecturePanel =
                                  lectureWorkspaceByKey[lecture.key] ?? 'basic';
                                const supportsVideo = isVideoLecture(lecture);
                                const supportsResource = isResourceLecture(lecture);
                                const supportsProblem = isProblemLecture(lecture);
                                const supportsPracticum = isPracticumLecture(lecture);
                                const supportsOffline = isOfflineLecture(lecture);
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
                                            {`강의 ${String(lectureIndex + 1)}`}
                                          </span>
                                          <span className={styles['curriculumLevelHint']}>
                                            섹션 안 학습 단위
                                          </span>
                                        </div>
                                        <h4 className={styles['panelTitle']}>
                                          {lecture.title?.trim() || '미제목 강의'}
                                        </h4>
                                        <p className={styles['metaText']}>
                                          {lecture.description?.trim() ||
                                            '강의 설명이 아직 없습니다.'}
                                        </p>
                                        <div className={styles['curriculumStatGrid']}>
                                          <div className={styles['curriculumStatCard']}>
                                            <span className={styles['curriculumStatLabel']}>
                                              전달 방식
                                            </span>
                                            <strong className={styles['curriculumStatValue']}>
                                              {formatDraftLectureDelivery(lecture)}
                                            </strong>
                                          </div>
                                          <div className={styles['curriculumStatCard']}>
                                            <span className={styles['curriculumStatLabel']}>
                                              영상 상태
                                            </span>
                                            <strong className={styles['curriculumStatValue']}>
                                              {lectureVideoStatus}
                                            </strong>
                                          </div>
                                          <div className={styles['curriculumStatCard']}>
                                            <span className={styles['curriculumStatLabel']}>
                                              강의 요약
                                            </span>
                                            <strong className={styles['curriculumStatValue']}>
                                              {supportsProblem
                                                ? '문제로 구성'
                                                : supportsPracticum
                                                  ? lecture.practicumTitle?.trim() || '실습 강의'
                                                  : LECTURE_TYPE_LABELS[lecture.lectureType]}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                      <div className={styles['curriculumActionColumn']}>
                                        <Button
                                          onClick={() => {
                                            toggleLectureExpanded(lecture.key);
                                          }}
                                          type='button'
                                          variant='secondary'
                                        >
                                          {lectureExpanded ? '강의 접기' : '강의 펼치기'}
                                        </Button>
                                        <Button
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

                                    {lectureExpanded ? (
                                      <div className={styles['curriculumBody']}>
                                        <div className={styles['curriculumWorkspaceHeader']}>
                                          <p className={styles['metaText']}>
                                            강의 하나당 작업영역 하나만 열립니다. 자료와 문제는 아래
                                            연결된 강의별 관리 영역으로 바로 이동합니다.
                                          </p>
                                          <div className={styles['curriculumWorkspaceTabs']}>
                                            <button
                                              className={styles['curriculumWorkspaceTab']}
                                              data-active={activeLecturePanel === 'basic'}
                                              onClick={() => {
                                                openLectureWorkspace(lecture.key, 'basic');
                                              }}
                                              type='button'
                                            >
                                              강의 정보
                                            </button>
                                            {supportsVideo ? (
                                              <button
                                                className={styles['curriculumWorkspaceTab']}
                                                data-active={activeLecturePanel === 'video'}
                                                onClick={() => {
                                                  openLectureWorkspace(lecture.key, 'video');
                                                }}
                                                type='button'
                                              >
                                                {activeLecturePanel === 'video'
                                                  ? '영상 추가 취소'
                                                  : '영상 추가'}
                                              </button>
                                            ) : null}
                                            {supportsResource ? (
                                              <button
                                                className={styles['curriculumWorkspaceTab']}
                                                data-active={activeLecturePanel === 'resource'}
                                                onClick={() => {
                                                  openLectureWorkspace(lecture.key, 'resource');
                                                }}
                                                type='button'
                                              >
                                                {activeLecturePanel === 'resource'
                                                  ? '첨부자료 추가 취소'
                                                  : '첨부자료 추가'}
                                              </button>
                                            ) : null}
                                            {supportsProblem ? (
                                              <button
                                                className={styles['curriculumWorkspaceTab']}
                                                data-active={activeLecturePanel === 'quiz'}
                                                onClick={() => {
                                                  openLectureWorkspace(lecture.key, 'quiz');
                                                }}
                                                type='button'
                                              >
                                                {activeLecturePanel === 'quiz'
                                                  ? '문제 추가 취소'
                                                  : '문제 추가'}
                                              </button>
                                            ) : null}
                                            {supportsPracticum ? (
                                              <button
                                                className={styles['curriculumWorkspaceTab']}
                                                data-active={activeLecturePanel === 'practicum'}
                                                onClick={() => {
                                                  openLectureWorkspace(lecture.key, 'practicum');
                                                }}
                                                type='button'
                                              >
                                                {activeLecturePanel === 'practicum'
                                                  ? '실습 추가 취소'
                                                  : '실습 추가'}
                                              </button>
                                            ) : null}
                                            {supportsOffline ? (
                                              <button
                                                className={styles['curriculumWorkspaceTab']}
                                                data-active={activeLecturePanel === 'offline'}
                                                onClick={() => {
                                                  openLectureWorkspace(lecture.key, 'offline');
                                                }}
                                                type='button'
                                              >
                                                {activeLecturePanel === 'offline'
                                                  ? '현장강의 추가 취소'
                                                  : '현장강의 추가'}
                                              </button>
                                            ) : null}
                                          </div>
                                        </div>

                                        {activeLecturePanel === 'basic' ? (
                                          <div className={styles['curriculumWorkspace']}>
                                            <div className={styles['inlineFieldGrid']}>
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
                                              <TextField
                                                label='정렬 순서'
                                                name={`lecture-sort-order-${lecture.key}`}
                                                onChange={(event) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      sortOrder: Number(event.target.value || 0),
                                                    }),
                                                  );
                                                }}
                                                value={String(lecture.sortOrder)}
                                              />
                                            </div>

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

                                            <div className={styles['compactFieldRow']}>
                                              <div className={styles['compactTextField']}>
                                                <TextField
                                                  label='길이(초)'
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
                                              <AdminDropdownField
                                                compact
                                                label='강의 종류'
                                                onChange={(nextValue) => {
                                                  const lectureType = nextValue;
                                                  const nextWorkspacePanel =
                                                    getDefaultWorkspacePanelForLectureType(
                                                      lectureType,
                                                    );
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      lectureType,
                                                      offlineScheduleRule:
                                                        lectureType === 'OFFLINE'
                                                          ? current.offlineScheduleRule
                                                          : null,
                                                      practicumDescription:
                                                        lectureType === 'PRACTICUM'
                                                          ? current.practicumDescription
                                                          : null,
                                                      practicumTitle:
                                                        lectureType === 'PRACTICUM'
                                                          ? current.practicumTitle
                                                          : null,
                                                      videoId:
                                                        lectureType === 'VIDEO'
                                                          ? current.videoId
                                                          : null,
                                                      videoUploadErrorMessage:
                                                        lectureType === 'VIDEO'
                                                          ? current.videoUploadErrorMessage
                                                          : null,
                                                      videoUploadFileName:
                                                        lectureType === 'VIDEO'
                                                          ? current.videoUploadFileName
                                                          : null,
                                                      videoUploadStatus:
                                                        lectureType === 'VIDEO'
                                                          ? current.videoUploadStatus
                                                          : null,
                                                    }),
                                                  );
                                                  if (lectureType !== 'VIDEO') {
                                                    setPendingVideoSelections((current) => {
                                                      const next = { ...current };
                                                      delete next[lecture.key];
                                                      return next;
                                                    });
                                                  }
                                                  if (lectureType !== 'PROBLEM') {
                                                    removeQuiz(lecture.key);
                                                  }
                                                  if (lectureType !== 'RESOURCE') {
                                                    removeLectureResources(lecture.key);
                                                  }
                                                  setLectureWorkspaceByKey((current) => {
                                                    const activePanel =
                                                      current[lecture.key] ?? 'basic';
                                                    if (
                                                      activePanel === 'basic' ||
                                                      activePanel === nextWorkspacePanel
                                                    ) {
                                                      return current;
                                                    }

                                                    return {
                                                      ...current,
                                                      [lecture.key]: nextWorkspacePanel,
                                                    };
                                                  });
                                                }}
                                                options={allowedLectureTypes.map((lectureType) => ({
                                                  label: LECTURE_TYPE_LABELS[lectureType],
                                                  value: lectureType,
                                                }))}
                                                value={lecture.lectureType}
                                              />
                                            </div>

                                            <div className={styles['compactFieldRow']}>
                                              <label className={styles['checkboxField']}>
                                                <input
                                                  checked={lecture.preview}
                                                  onChange={(event) => {
                                                    updateLecture(
                                                      section.key,
                                                      lecture.key,
                                                      (current) => ({
                                                        ...current,
                                                        preview: event.target.checked,
                                                      }),
                                                    );
                                                  }}
                                                  type='checkbox'
                                                />
                                                미리보기 공개
                                              </label>
                                              <label className={styles['checkboxField']}>
                                                <input
                                                  checked={lecture.published}
                                                  onChange={(event) => {
                                                    updateLecture(
                                                      section.key,
                                                      lecture.key,
                                                      (current) => ({
                                                        ...current,
                                                        published: event.target.checked,
                                                      }),
                                                    );
                                                  }}
                                                  type='checkbox'
                                                />
                                                강의 공개
                                              </label>
                                            </div>
                                          </div>
                                        ) : null}

                                        {supportsVideo && activeLecturePanel === 'video' ? (
                                          <div className={styles['curriculumWorkspace']}>
                                            <p className={styles['metaText']}>
                                              영상강의는 업로드 완료된 영상이 연결되어야 합니다.
                                            </p>
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
                                                  업로드 파일
                                                </span>
                                                <strong className={styles['curriculumStatValue']}>
                                                  {uploadedVideoName ??
                                                    '아직 업로드한 파일이 없습니다.'}
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
                                                variant='secondary'
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
                                                        videoId: null,
                                                        videoUploadErrorMessage: null,
                                                        videoUploadFileName: null,
                                                        videoUploadStatus: null,
                                                      }),
                                                    );
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

                                        {supportsResource && activeLecturePanel === 'resource'
                                          ? renderLectureResourceWorkspace(lecture.key)
                                          : null}

                                        {supportsProblem && activeLecturePanel === 'quiz'
                                          ? renderLectureQuizWorkspace(lecture.key)
                                          : null}

                                        {supportsPracticum && activeLecturePanel === 'practicum' ? (
                                          <div className={styles['curriculumWorkspace']}>
                                            <TextField
                                              label='실습명'
                                              name={`lecture-practicum-title-${lecture.key}`}
                                              onChange={(event) => {
                                                updateLecture(
                                                  section.key,
                                                  lecture.key,
                                                  (current) => ({
                                                    ...current,
                                                    practicumTitle: event.target.value,
                                                  }),
                                                );
                                              }}
                                              value={lecture.practicumTitle ?? ''}
                                            />
                                            <TextAreaField
                                              label='실습 설명'
                                              name={`lecture-practicum-description-${lecture.key}`}
                                              onChange={(event) => {
                                                updateLecture(
                                                  section.key,
                                                  lecture.key,
                                                  (current) => ({
                                                    ...current,
                                                    practicumDescription: event.target.value,
                                                  }),
                                                );
                                              }}
                                              value={lecture.practicumDescription ?? ''}
                                            />
                                          </div>
                                        ) : null}

                                        {supportsOffline && activeLecturePanel === 'offline' ? (
                                          <div className={styles['curriculumWorkspace']}>
                                            <p className={styles['metaText']}>
                                              현장강의는 강의 단위로 기간, 요일, 시간, 장소를
                                              설정합니다.
                                            </p>
                                            <div className={styles['inlineFieldGrid']}>
                                              <TextField
                                                label='시작일'
                                                name={`lecture-offline-start-date-${lecture.key}`}
                                                onChange={(event) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      offlineScheduleRule: {
                                                        ...(current.offlineScheduleRule ??
                                                          EMPTY_DRAFT_OFFLINE_SESSION),
                                                        startDate: event.target.value,
                                                      },
                                                    }),
                                                  );
                                                }}
                                                type='date'
                                                value={lecture.offlineScheduleRule?.startDate ?? ''}
                                              />
                                              <TextField
                                                label='종료일'
                                                name={`lecture-offline-end-date-${lecture.key}`}
                                                onChange={(event) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      offlineScheduleRule: {
                                                        ...(current.offlineScheduleRule ??
                                                          EMPTY_DRAFT_OFFLINE_SESSION),
                                                        endDate: event.target.value,
                                                      },
                                                    }),
                                                  );
                                                }}
                                                type='date'
                                                value={lecture.offlineScheduleRule?.endDate ?? ''}
                                              />
                                            </div>
                                            <div className={styles['inlineFieldGrid']}>
                                              <TextField
                                                label='시작 시간'
                                                name={`lecture-offline-start-time-${lecture.key}`}
                                                onChange={(event) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      offlineScheduleRule: {
                                                        ...(current.offlineScheduleRule ??
                                                          EMPTY_DRAFT_OFFLINE_SESSION),
                                                        startTime: event.target.value,
                                                      },
                                                    }),
                                                  );
                                                }}
                                                type='time'
                                                value={lecture.offlineScheduleRule?.startTime ?? ''}
                                              />
                                              <TextField
                                                label='종료 시간'
                                                name={`lecture-offline-end-time-${lecture.key}`}
                                                onChange={(event) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      offlineScheduleRule: {
                                                        ...(current.offlineScheduleRule ??
                                                          EMPTY_DRAFT_OFFLINE_SESSION),
                                                        endTime: event.target.value,
                                                      },
                                                    }),
                                                  );
                                                }}
                                                type='time'
                                                value={lecture.offlineScheduleRule?.endTime ?? ''}
                                              />
                                            </div>
                                            <div className={styles['inlineFieldGrid']}>
                                              <TextField
                                                label='장소'
                                                name={`lecture-offline-location-${lecture.key}`}
                                                onChange={(event) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      offlineScheduleRule: {
                                                        ...(current.offlineScheduleRule ??
                                                          EMPTY_DRAFT_OFFLINE_SESSION),
                                                        location: event.target.value,
                                                      },
                                                    }),
                                                  );
                                                }}
                                                value={lecture.offlineScheduleRule?.location ?? ''}
                                              />
                                              <TextField
                                                label='비고'
                                                name={`lecture-offline-notes-${lecture.key}`}
                                                onChange={(event) => {
                                                  updateLecture(
                                                    section.key,
                                                    lecture.key,
                                                    (current) => ({
                                                      ...current,
                                                      offlineScheduleRule: {
                                                        ...(current.offlineScheduleRule ??
                                                          EMPTY_DRAFT_OFFLINE_SESSION),
                                                        notes: event.target.value,
                                                      },
                                                    }),
                                                  );
                                                }}
                                                value={lecture.offlineScheduleRule?.notes ?? ''}
                                              />
                                            </div>
                                            <TextField
                                              label='요일'
                                              name={`lecture-offline-weekdays-${lecture.key}`}
                                              onChange={(event) => {
                                                updateLecture(
                                                  section.key,
                                                  lecture.key,
                                                  (current) => ({
                                                    ...current,
                                                    offlineScheduleRule: {
                                                      ...(current.offlineScheduleRule ??
                                                        EMPTY_DRAFT_OFFLINE_SESSION),
                                                      weekdays: event.target.value
                                                        .split(',')
                                                        .map((value) => value.trim().toUpperCase())
                                                        .filter(Boolean),
                                                    },
                                                  }),
                                                );
                                              }}
                                              value={(
                                                lecture.offlineScheduleRule?.weekdays ?? []
                                              ).join(', ')}
                                            />
                                          </div>
                                        ) : null}
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
