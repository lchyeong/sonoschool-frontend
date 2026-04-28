import { useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAdminLecture,
  createAdminSection,
  deleteAdminLecture,
  deleteAdminLectureOfflineSchedules,
  deleteAdminSection,
  fetchAdminLectureDeleteImpact,
  publishAdminLecture,
  replaceAdminLectureOfflineSchedules,
  reorderAdminLectures,
  reorderAdminSections,
  unpublishAdminLecture,
  updateAdminLecture,
  updateAdminSection,
} from '@/api/adminCurriculum';
import {
  createAdminPracticumSlot,
  deleteAdminPracticumSlot,
  fetchAdminPracticumSlots,
} from '@/api/adminPracticum';
import {
  assignAdminLectureVideo,
  completeAdminVideoUpload,
  createAdminVideoUploadSession,
  fetchAdminVideoStatus,
  startAdminVideoEncoding,
} from '@/api/adminVideos';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { adminCurriculumQueryKey, useAdminCurriculumQuery } from '@/query/useAdminCurriculumQuery';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminCurriculumLecture,
  AdminLectureDeleteImpact,
  AdminLectureOfflineSchedule,
  AdminLectureOfflineSchedulesReplacePayload,
  AdminCurriculumSection,
  AdminLectureUpsertPayload,
  AdminSectionUpsertPayload,
  AdminSortOrderItem,
} from '@/types/adminCurriculum';
import type { AdminProgramType } from '@/types/adminProgramsLive';
import type { AdminPracticumSlotPayload, PracticumSlot } from '@/types/practicum';
import { classNames } from '@/utils/classNames';

import styles from './AdminProgramCurriculumSection.module.scss';

const TARGET_PART_SIZE_BYTES = 8 * 1024 * 1024;
const VIDEO_ENCODING_POLL_INTERVAL_MS = 5000;

const buildLectureDeleteConfirmMessage = (impact: AdminLectureDeleteImpact): string => {
  if (!impact.hasHistory) {
    return `'${impact.lectureTitle}' 강의를 삭제하시겠습니까?`;
  }

  return [
    `'${impact.lectureTitle}' 강의에는 학습/응시 이력이 있어 완전 삭제하지 않고 목록에서 숨김 처리합니다.`,
    '',
    `수강 진행률 ${String(impact.progressCount)}건`,
    `문제 응시 기록 ${String(impact.problemAttemptCount)}건`,
    `실습 예약 기록 ${String(impact.reservationCount)}건`,
    `연결 자료 ${String(impact.documentCount)}건`,
    '',
    '계속 진행하시겠습니까?',
  ].join('\n');
};

interface AdminProgramCurriculumSectionProps {
  allowPastOfflineScheduleDates?: boolean;
  embedded?: boolean;
  enabled: boolean;
  onOpenLectureWorkspace?: (lectureId: number, target: 'problem' | 'resource') => void;
  programLearningEndAt?: string | null;
  programLearningStartAt?: string | null;
  programType?: AdminProgramType | null;
  programId: number | null;
}

interface SectionFormState {
  description: string;
  title: string;
}

interface LectureFormState {
  description: string;
  durationSeconds: string;
  problemOnly: boolean;
  preview: boolean;
  practicumEnabled: boolean;
  title: string;
}

interface PracticumSlotFormState {
  location: string;
  startAt: string;
}

interface OfflineScheduleFormState {
  date: string;
  endTime: string;
  location: string;
  notes: string;
  startTime: string;
}

type LectureWorkspacePanel = 'basic' | 'video' | 'resource' | 'problem' | 'practicum' | 'offline';

type SectionWorkspacePanel = 'lectures' | 'editor' | 'create-lecture';

const EMPTY_SECTION_FORM: SectionFormState = {
  description: '',
  title: '',
};

const EMPTY_LECTURE_FORM: LectureFormState = {
  description: '',
  durationSeconds: '',
  problemOnly: false,
  preview: false,
  practicumEnabled: false,
  title: '',
};

const EMPTY_PRACTICUM_SLOT_FORM: PracticumSlotFormState = {
  location: '',
  startAt: '',
};

const normalizeDescription = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseDurationMinutes = (value: string): number | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
};

const durationSecondsToMinutesInput = (durationSeconds: number | null): string => {
  if (durationSeconds === null) {
    return '';
  }

  return String(Math.ceil(durationSeconds / 60));
};

const parseDurationMinutesToSeconds = (value: string): number | null => {
  const durationMinutes = parseDurationMinutes(value);
  return durationMinutes === null ? null : durationMinutes * 60;
};

const validateSectionForm = (formState: SectionFormState): string | null => {
  if (!formState.title.trim()) {
    return '섹션명을 입력해 주세요.';
  }

  return null;
};

const validateLectureForm = (formState: LectureFormState): string | null => {
  if (!formState.title.trim()) {
    return '강의명을 입력해 주세요.';
  }

  if (
    formState.durationSeconds.trim() &&
    parseDurationMinutes(formState.durationSeconds) === null
  ) {
    return '강의 길이는 0분 이상의 숫자로 입력해 주세요.';
  }

  return null;
};

const toSectionPayload = (
  formState: SectionFormState,
  sortOrder: number,
): AdminSectionUpsertPayload => {
  return {
    description: normalizeDescription(formState.description),
    sortOrder,
    title: formState.title.trim(),
  };
};

const toLecturePayload = (
  formState: LectureFormState,
  sortOrder: number,
): AdminLectureUpsertPayload => {
  const lectureType = formState.problemOnly
    ? 'PROBLEM'
    : formState.practicumEnabled
      ? 'PRACTICUM'
      : 'VIDEO';
  return {
    description: normalizeDescription(formState.description),
    durationSeconds:
      !formState.problemOnly && formState.practicumEnabled
        ? null
        : parseDurationMinutesToSeconds(formState.durationSeconds),
    lectureType,
    problemOnly: formState.problemOnly,
    preview: false,
    practicumEnabled: formState.problemOnly ? false : formState.practicumEnabled,
    sortOrder,
    title: formState.title.trim(),
  };
};

const createOfflineScheduleFormState = (
  schedule?: AdminLectureOfflineSchedule,
): OfflineScheduleFormState => ({
  date: schedule?.date ?? '',
  endTime: schedule?.endTime ?? '',
  location: schedule?.location ?? '',
  notes: schedule?.notes ?? '',
  startTime: schedule?.startTime ?? '',
});

const createOfflineScheduleFormStates = (
  lecture: AdminCurriculumLecture,
): OfflineScheduleFormState[] => {
  if (lecture.offlineSchedules.length > 0) {
    return [createOfflineScheduleFormState(lecture.offlineSchedules[0])];
  }

  return [createOfflineScheduleFormState()];
};

const toOfflineSchedulesPayload = (
  formStates: OfflineScheduleFormState[],
): AdminLectureOfflineSchedulesReplacePayload => ({
  offlineSchedules: formStates.slice(0, 1).map((formState) => ({
    date: formState.date,
    endTime: formState.endTime,
    location: normalizeDescription(formState.location),
    notes: normalizeDescription(formState.notes),
    startTime: formState.startTime,
  })),
});

const adminPracticumSlotsQueryKey = (lectureId: number) =>
  ['admin', 'practicumSlots', lectureId] as const;

const toAdminPracticumSlotPayload = (
  formState: PracticumSlotFormState,
): AdminPracticumSlotPayload | null => {
  const trimmedStartAt = formState.startAt.trim();

  if (!trimmedStartAt) {
    return null;
  }

  const parsedDate = new Date(trimmedStartAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    location: normalizeDescription(formState.location),
    startAt: parsedDate.toISOString(),
  };
};

const formatPracticumDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toDateInputValue = (value: string | null | undefined): string => {
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

const buildReorderItems = (
  items: ReadonlyArray<{ id: number }>,
  targetId: number,
  direction: 'up' | 'down',
): AdminSortOrderItem[] | null => {
  const currentIndex = items.findIndex((item) => item.id === targetId);
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return null;
  }

  const reorderedItems = [...items];
  const [currentItem] = reorderedItems.splice(currentIndex, 1);
  reorderedItems.splice(nextIndex, 0, currentItem);

  return reorderedItems.map((item, index) => ({
    id: item.id,
    sortOrder: index,
  }));
};

const formatLectureMeta = (lecture: AdminCurriculumLecture): string => {
  if (lecture.videoId === null) {
    return '영상 미연결';
  }

  return `영상 ID ${String(lecture.videoId)}`;
};

const isVideoUploadStatusInProgress = (status: string | null): boolean => {
  return Boolean(
    status?.startsWith('영상 업로드 중') ||
      status?.startsWith('영상 인코딩 준비 중') ||
      status?.startsWith('영상 인코딩 중'),
  );
};

const formatOfflineScheduleLabel = (schedule: AdminLectureOfflineSchedule): string => {
  return `${schedule.date} ${schedule.startTime}~${schedule.endTime}`;
};

const formatDurationLabel = (durationSeconds: number | null): string => {
  if (durationSeconds === null || durationSeconds <= 0) {
    return '길이 미설정';
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

const formatLectureDelivery = (lecture: AdminCurriculumLecture): string => {
  if (lecture.problemOnly) {
    return '문제풀이 강의';
  }
  const hasVideo = lecture.videoId !== null;
  const hasOfflineSchedule = lecture.offlineSchedules.length > 0;

  if (hasVideo && hasOfflineSchedule) {
    return '온라인 + 현장 강의';
  }
  if (hasOfflineSchedule) {
    return '현장 강의';
  }
  if (hasVideo) {
    return '온라인 영상';
  }

  return '전달 방식 미설정';
};

const getLecturePanelLabel = (
  panel: LectureWorkspacePanel | null,
  lecture: AdminCurriculumLecture,
): string => {
  switch (panel) {
    case 'basic':
      return '강의 정보 편집';
    case 'video':
      return lecture.videoId === null ? '영상 추가' : '영상 교체';
    case 'resource':
      return '첨부자료 연결';
    case 'problem':
      return lecture.problemOnly ? '문제풀이 문제 구성' : '문제 연결';
    case 'practicum':
      return '실습 예약 구성';
    case 'offline':
      return '현장강의 일정 설정';
    default:
      return '작업영역 선택 전';
  }
};

const calculatePartCount = (fileSize: number): number => {
  return Math.max(1, Math.ceil(fileSize / TARGET_PART_SIZE_BYTES));
};

const stripETagQuotes = (value: string): string => {
  return value.replace(/^"+|"+$/g, '');
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

const formatProgressLabel = (label: string, progressPercent: number | null | undefined): string => {
  if (progressPercent === null || progressPercent === undefined) {
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

const LectureCard = ({
  allowPracticum,
  allowPastOfflineScheduleDates,
  canMoveDown,
  canMoveUp,
  lecture,
  onDeleteOfflineSchedules,
  onDelete,
  onManageResource,
  onManageQuiz,
  onSaveOfflineSchedules,
  onUploadVideo,
  onMove,
  onSave,
  onTogglePublish,
  programLearningEndAt,
  programLearningStartAt,
  videoUploadStatus,
}: {
  allowPracticum: boolean;
  allowPastOfflineScheduleDates: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  lecture: AdminCurriculumLecture;
  onDeleteOfflineSchedules: (lectureId: number) => void;
  onDelete: (lectureId: number) => void;
  onManageResource: (lectureId: number) => void;
  onManageQuiz: (lectureId: number) => void;
  onSaveOfflineSchedules: (
    lectureId: number,
    payload: AdminLectureOfflineSchedulesReplacePayload,
  ) => void;
  onUploadVideo: (lectureId: number, file: File) => void;
  onMove: (lectureId: number, direction: 'up' | 'down') => void;
  onSave: (lectureId: number, payload: AdminLectureUpsertPayload) => void;
  onTogglePublish: (lectureId: number, published: boolean) => void;
  programLearningEndAt: string | null;
  programLearningStartAt: string | null;
  videoUploadStatus: string | null;
}) => {
  const [formState, setFormState] = useState<LectureFormState>({
    description: lecture.description ?? '',
    durationSeconds: durationSecondsToMinutesInput(lecture.durationSeconds),
    problemOnly: lecture.problemOnly ?? false,
    preview: lecture.preview,
    practicumEnabled: lecture.practicumEnabled ?? false,
    title: lecture.title,
  });
  const [practicumSlotForm, setPracticumSlotForm] =
    useState<PracticumSlotFormState>(EMPTY_PRACTICUM_SLOT_FORM);
  const [offlineScheduleForms, setOfflineScheduleForms] = useState<OfflineScheduleFormState[]>(
    createOfflineScheduleFormStates(lecture),
  );
  const [expanded, setExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<LectureWorkspacePanel | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const showToast = useToastStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const offlineScheduleMinDate = allowPastOfflineScheduleDates
    ? ''
    : toDateInputValue(programLearningStartAt);
  const offlineScheduleMaxDate = toDateInputValue(programLearningEndAt);
  const offlineSchedulePeriodLabel =
    offlineScheduleMinDate && offlineScheduleMaxDate
      ? `${offlineScheduleMinDate} ~ ${offlineScheduleMaxDate}`
      : offlineScheduleMinDate
        ? `${offlineScheduleMinDate} 이후`
        : offlineScheduleMaxDate
          ? `${offlineScheduleMaxDate} 이전`
          : null;
  const practicumSlotsQuery = useQuery({
    enabled: Boolean(lecture.practicumEnabled),
    queryFn: () => fetchAdminPracticumSlots(lecture.id),
    queryKey: adminPracticumSlotsQueryKey(lecture.id),
  });
  const createPracticumSlotMutation = useMutation({
    mutationFn: (payload: AdminPracticumSlotPayload) =>
      createAdminPracticumSlot(lecture.id, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 슬롯을 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setPracticumSlotForm(EMPTY_PRACTICUM_SLOT_FORM);
      await queryClient.invalidateQueries({ queryKey: adminPracticumSlotsQueryKey(lecture.id) });
      showToast({
        message: '실습 슬롯을 추가했습니다.',
        variant: 'success',
      });
    },
  });
  const deletePracticumSlotMutation = useMutation({
    mutationFn: (slotId: number) => deleteAdminPracticumSlot(slotId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 슬롯을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPracticumSlotsQueryKey(lecture.id) });
      showToast({
        message: '실습 슬롯을 삭제했습니다.',
        variant: 'success',
      });
    },
  });
  const practicumSlots = practicumSlotsQuery.data ?? [];
  const pendingPracticumActivation = formState.practicumEnabled && !lecture.practicumEnabled;
  const supportsDeliveryPanels = !formState.problemOnly;
  const quickActionLabel = lecture.videoId === null ? '영상 추가' : '영상 교체';
  const togglePanel = (panel: LectureWorkspacePanel) => {
    setExpanded(true);
    setActivePanel((current) => (current === panel ? null : panel));
  };
  const handleExpandToggle = () => {
    if (expanded) {
      setExpanded(false);
      setActivePanel(null);
      return;
    }

    setExpanded(true);
    setActivePanel((current) => current ?? 'basic');
  };

  return (
    <article className={styles['lectureCard']}>
      <div className={styles['lectureHeader']}>
        <div className={styles['summaryContent']}>
          <div className={styles['headerEyebrowRow']}>
            <span className={styles['levelBadge']} data-level='lecture'>
              {`강의 ${String(lecture.sortOrder + 1)}`}
            </span>
            <span className={styles['levelHint']}>섹션 안 학습 단위</span>
          </div>
          <h4 className={styles['lectureTitle']}>{lecture.title}</h4>
          <p className={styles['sectionDescription']}>
            {lecture.description?.trim() || '강의 소개가 아직 없습니다.'}
          </p>
          <div className={styles['summaryGrid']}>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>전달 방식</span>
              <strong className={styles['summaryValue']}>{formatLectureDelivery(lecture)}</strong>
            </div>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>영상</span>
              <strong className={styles['summaryValue']}>
                {isVideoUploadStatusInProgress(videoUploadStatus) ? (
                  <span className={styles['inlineStatus']}>
                    <span aria-hidden='true' className={styles['inlineStatusSpinner']} />
                    <span>{videoUploadStatus}</span>
                  </span>
                ) : (
                  (videoUploadStatus ?? formatLectureMeta(lecture))
                )}
              </strong>
            </div>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>실습</span>
              <strong className={styles['summaryValue']}>
                {lecture.problemOnly
                  ? '문제로 구성'
                  : lecture.practicumEnabled
                    ? '실습 예약 사용'
                    : '실습 예약 없음'}
              </strong>
            </div>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>길이</span>
              <strong className={styles['summaryValue']}>
                {formatDurationLabel(lecture.durationSeconds)}
              </strong>
            </div>
          </div>
          <div className={styles['badgeRow']}>
            <span
              className={styles['statusBadge']}
              data-tone={lecture.published ? 'published' : 'draft'}
            >
              {lecture.published ? '공개중' : '비공개'}
            </span>
            {lecture.offlineSchedules.map((schedule) => (
              <span
                className={styles['statusBadge']}
                data-tone='neutral'
                key={`offline-schedule-${String(lecture.id)}-${String(schedule.id)}`}
              >
                {formatOfflineScheduleLabel(schedule)}
              </span>
            ))}
          </div>
        </div>

        <div className={styles['actionColumn']}>
          <div className={styles['buttonRow']}>
            <Button
              onClick={() => {
                handleExpandToggle();
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              {expanded ? '강의 접기' : '강의 펼치기'}
            </Button>
            <Button
              onClick={() => {
                setExpanded(true);
                setActivePanel((current) => (current === 'basic' ? null : 'basic'));
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              {activePanel === 'basic' ? '강의 수정 닫기' : '강의 수정'}
            </Button>
          </div>
          <Button
            disabled={!canMoveUp}
            onClick={() => {
              onMove(lecture.id, 'up');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            위로 이동
          </Button>
          <Button
            disabled={!canMoveDown}
            onClick={() => {
              onMove(lecture.id, 'down');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            아래로 이동
          </Button>
          <Button
            onClick={() => {
              onTogglePublish(lecture.id, lecture.published);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            {lecture.published ? '발행 해제' : '발행'}
          </Button>
          <Button
            onClick={() => {
              onDelete(lecture.id);
            }}
            size='sm'
            type='button'
            variant='danger'
          >
            삭제
          </Button>
        </div>
      </div>

      <input
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          onUploadVideo(lecture.id, file);
          event.currentTarget.value = '';
        }}
        ref={fileInputRef}
        type='file'
      />

      {expanded ? (
        <div className={styles['cardBody']}>
          <div className={styles['workspaceHeader']}>
            <div className={styles['workspaceHeaderSummary']}>
              <span className={styles['workspaceEyebrow']}>강의 작업영역</span>
              <strong className={styles['workspaceCurrentPanel']}>
                {getLecturePanelLabel(activePanel, lecture)}
              </strong>
            </div>
            <div className={styles['workspaceTabBar']}>
              <button
                className={styles['workspaceTab']}
                data-active={activePanel === 'basic'}
                onClick={() => {
                  togglePanel('basic');
                }}
                type='button'
              >
                {activePanel === 'basic' ? '강의 정보 닫기' : '강의 정보'}
              </button>
              {supportsDeliveryPanels ? (
                <button
                  className={styles['workspaceTab']}
                  data-active={activePanel === 'video'}
                  onClick={() => {
                    togglePanel('video');
                  }}
                  type='button'
                >
                  {activePanel === 'video' ? `${quickActionLabel} 취소` : quickActionLabel}
                </button>
              ) : null}
              <button
                className={styles['workspaceTab']}
                data-active={activePanel === 'resource'}
                onClick={() => {
                  togglePanel('resource');
                  onManageResource(lecture.id);
                }}
                type='button'
              >
                {activePanel === 'resource' ? '첨부자료 닫기' : '첨부자료 추가'}
              </button>
              <button
                className={styles['workspaceTab']}
                data-active={activePanel === 'problem'}
                onClick={() => {
                  togglePanel('problem');
                  onManageQuiz(lecture.id);
                }}
                type='button'
              >
                {activePanel === 'problem' ? '문제 닫기' : '문제 추가'}
              </button>
              {allowPracticum && supportsDeliveryPanels ? (
                <button
                  className={styles['workspaceTab']}
                  data-active={activePanel === 'practicum'}
                  onClick={() => {
                    togglePanel('practicum');
                  }}
                  type='button'
                >
                  {activePanel === 'practicum' ? '실습 추가 취소' : '실습 추가'}
                </button>
              ) : null}
              {supportsDeliveryPanels ? (
                <button
                  className={styles['workspaceTab']}
                  data-active={activePanel === 'offline'}
                  onClick={() => {
                    togglePanel('offline');
                  }}
                  type='button'
                >
                  {activePanel === 'offline' ? '현장강의 추가 취소' : '현장강의 추가'}
                </button>
              ) : null}
            </div>
            <p className={styles['helperText']}>
              강의 카드 안에서는 한 번에 하나의 작업만 엽니다. 자료와 문제는 연결된 관리 영역으로
              바로 이동합니다.
            </p>
          </div>

          {activePanel === 'basic' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h5 className={styles['subsectionTitle']}>강의 기본 정보</h5>
              </div>
              <div className={styles['fieldGrid']}>
                <label className={styles['selectField']}>
                  <span className={styles['selectLabel']}>강의 종류</span>
                  <select
                    className={styles['selectControl']}
                    onChange={(event) => {
                      const nextProblemOnly = event.target.value === 'PROBLEM_ONLY';
                      setFormState((current) => ({
                        ...current,
                        practicumEnabled: nextProblemOnly ? false : current.practicumEnabled,
                        problemOnly: nextProblemOnly,
                      }));
                    }}
                    value={formState.problemOnly ? 'PROBLEM_ONLY' : 'STANDARD'}
                  >
                    <option value='STANDARD'>일반 강의</option>
                    <option value='PROBLEM_ONLY'>문제풀이형 강의</option>
                  </select>
                </label>

                <TextField
                  label='강의명'
                  name={`lecture-title-${String(lecture.id)}`}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }));
                  }}
                  value={formState.title}
                />
                <TextAreaField
                  label='강의 설명'
                  name={`lecture-description-${String(lecture.id)}`}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  rows={3}
                  value={formState.description}
                />
                {!formState.practicumEnabled || formState.problemOnly ? (
                  <TextField
                    label='강의 길이(분)'
                    name={`lecture-duration-${String(lecture.id)}`}
                    onChange={(event) => {
                      setFormState((current) => ({
                        ...current,
                        durationSeconds: event.target.value,
                      }));
                    }}
                    value={formState.durationSeconds}
                  />
                ) : null}

                {allowPracticum && !formState.problemOnly ? (
                  <label className={styles['checkboxRow']}>
                    <input
                      checked={formState.practicumEnabled}
                      onChange={(event) => {
                        setFormState((current) => ({
                          ...current,
                          practicumEnabled: event.target.checked,
                        }));
                      }}
                      type='checkbox'
                    />
                    실습 예약 사용
                  </label>
                ) : null}

                <div className={styles['buttonRow']}>
                  <Button
                    onClick={() => {
                      onSave(lecture.id, toLecturePayload(formState, lecture.sortOrder));
                    }}
                    size='sm'
                    type='button'
                  >
                    강의 저장
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {supportsDeliveryPanels && activePanel === 'video' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h5 className={styles['subsectionTitle']}>영상 연결</h5>
              </div>
              <div className={styles['buttonRow']}>
                <Button
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  size='sm'
                  type='button'
                  variant='secondary'
                >
                  {lecture.videoId === null ? '강의 영상 업로드' : '강의 영상 교체'}
                </Button>
                <Button
                  onClick={() => {
                    setActivePanel(null);
                  }}
                  size='sm'
                  type='button'
                  variant='secondary'
                >
                  취소
                </Button>
              </div>
            </div>
          ) : null}

          {supportsDeliveryPanels && activePanel === 'offline' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h5 className={styles['subsectionTitle']}>현장 강의 일정</h5>
              </div>
              <p className={styles['helperText']}>
                강의별로 실제 진행 일자와 시간을 직접 등록합니다. 저장된 일정만 공유 일정표에 자동
                반영됩니다. 시간은 1시간 단위로만 입력할 수 있습니다.
              </p>
              {offlineSchedulePeriodLabel ? (
                <p className={styles['helperText']}>
                  일정 날짜는 프로그램 수강 기간인 {offlineSchedulePeriodLabel} 안에서만 등록할 수
                  있습니다.
                </p>
              ) : null}
              <div className={styles['offlineRuleList']}>
                {offlineScheduleForms.map((scheduleForm, index) => (
                  <div
                    className={styles['offlineRuleCard']}
                    key={`offline-rule-form-${String(lecture.id)}-${String(index)}`}
                  >
                    <div className={styles['panelHeader']}>
                      <strong className={styles['subsectionTitle']}>일정 {index + 1}</strong>
                      {offlineScheduleForms.length > 1 ? (
                        <Button
                          onClick={() => {
                            setOfflineScheduleForms((current) =>
                              current.filter((_, currentIndex) => currentIndex !== index),
                            );
                          }}
                          size='sm'
                          type='button'
                          variant='danger'
                        >
                          일정 제거
                        </Button>
                      ) : null}
                    </div>
                    <div className={styles['fieldGrid']}>
                      <TextField
                        label='일자'
                        max={offlineScheduleMaxDate || undefined}
                        min={offlineScheduleMinDate || undefined}
                        name={`lecture-offline-date-${String(lecture.id)}-${String(index)}`}
                        onChange={(event) => {
                          setOfflineScheduleForms((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index ? { ...item, date: event.target.value } : item,
                            ),
                          );
                        }}
                        type='date'
                        value={scheduleForm.date}
                      />
                      <TextField
                        label='시작 시간'
                        name={`lecture-offline-start-time-${String(lecture.id)}-${String(index)}`}
                        onChange={(event) => {
                          setOfflineScheduleForms((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index
                                ? { ...item, startTime: event.target.value }
                                : item,
                            ),
                          );
                        }}
                        step={3600}
                        type='time'
                        value={scheduleForm.startTime}
                      />
                      <TextField
                        label='종료 시간'
                        name={`lecture-offline-end-time-${String(lecture.id)}-${String(index)}`}
                        onChange={(event) => {
                          setOfflineScheduleForms((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index
                                ? { ...item, endTime: event.target.value }
                                : item,
                            ),
                          );
                        }}
                        step={3600}
                        type='time'
                        value={scheduleForm.endTime}
                      />
                      <TextField
                        label='장소'
                        name={`lecture-offline-location-${String(lecture.id)}-${String(index)}`}
                        onChange={(event) => {
                          setOfflineScheduleForms((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index
                                ? { ...item, location: event.target.value }
                                : item,
                            ),
                          );
                        }}
                        value={scheduleForm.location}
                      />
                      <TextAreaField
                        label='비고'
                        name={`lecture-offline-notes-${String(lecture.id)}-${String(index)}`}
                        onChange={(event) => {
                          setOfflineScheduleForms((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index
                                ? { ...item, notes: event.target.value }
                                : item,
                            ),
                          );
                        }}
                        rows={3}
                        value={scheduleForm.notes}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles['buttonRow']}>
                <Button
                  onClick={() => {
                    const hasEmptySchedule = offlineScheduleForms.some(
                      (schedule) => !schedule.date || !schedule.startTime || !schedule.endTime,
                    );
                    if (hasEmptySchedule) {
                      showToast({
                        message: '일정마다 날짜, 시작 시간, 종료 시간을 모두 입력해 주세요.',
                        variant: 'error',
                      });
                      return;
                    }
                    onSaveOfflineSchedules(
                      lecture.id,
                      toOfflineSchedulesPayload(offlineScheduleForms),
                    );
                  }}
                  size='sm'
                  type='button'
                >
                  일정 저장
                </Button>
                {lecture.offlineSchedules.length > 0 ? (
                  <Button
                    onClick={() => {
                      onDeleteOfflineSchedules(lecture.id);
                      setOfflineScheduleForms([createOfflineScheduleFormState()]);
                      setActivePanel(null);
                    }}
                    size='sm'
                    type='button'
                    variant='danger'
                  >
                    일정 전체 삭제
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {activePanel === 'resource' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h5 className={styles['subsectionTitle']}>첨부자료 관리</h5>
              </div>
              <p className={styles['helperText']}>
                이 강의의 첨부자료 작업영역으로 이동했습니다. 아래 연결된 자료 관리 영역에서
                등록/수정할 수 있습니다.
              </p>
            </div>
          ) : null}

          {activePanel === 'problem' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h5 className={styles['subsectionTitle']}>문제 관리</h5>
              </div>
              <p className={styles['helperText']}>
                이 강의의 문제 작업영역으로 이동했습니다. 아래 연결된 문제 관리 영역에서 등록/수정할
                수 있습니다.
              </p>
            </div>
          ) : null}

          {allowPracticum &&
          supportsDeliveryPanels &&
          activePanel === 'practicum' &&
          pendingPracticumActivation ? (
            <div className={styles['managementPanel']}>
              <h5 className={styles['subsectionTitle']}>실습 슬롯</h5>
              <p className={styles['helperText']}>
                강의를 먼저 저장하면 이 아래에서 1시간 단위 실습 슬롯을 등록할 수 있습니다.
              </p>
            </div>
          ) : null}

          {allowPracticum &&
          supportsDeliveryPanels &&
          lecture.practicumEnabled &&
          activePanel === 'practicum' ? (
            <div className={styles['managementPanel']}>
              <h5 className={styles['subsectionTitle']}>실습 슬롯</h5>
              <p className={styles['helperText']}>
                같은 시간대는 강의가 달라도 전체 합산 2명까지만 예약됩니다.
              </p>

              {practicumSlotsQuery.isLoading ? (
                <p className={styles['helperText']}>실습 슬롯을 불러오는 중입니다.</p>
              ) : null}
              {practicumSlotsQuery.isError ? (
                <p className={styles['errorText']}>
                  {practicumSlotsQuery.error instanceof Error
                    ? practicumSlotsQuery.error.message
                    : '실습 슬롯을 불러오지 못했습니다.'}
                </p>
              ) : null}

              {practicumSlots.length ? (
                <div className={styles['practicumSlotList']}>
                  {practicumSlots.map((slot: PracticumSlot) => (
                    <div className={styles['practicumSlotCard']} key={slot.id}>
                      <div>
                        <strong className={styles['practicumSlotTitle']}>
                          {formatPracticumDateTime(slot.startAt)} ~{' '}
                          {formatPracticumDateTime(slot.endAt)}
                        </strong>
                        <div className={styles['badgeRow']}>
                          <span className={styles['statusBadge']} data-tone='neutral'>
                            예약 {slot.reservedCount}/{slot.maxCapacity}
                          </span>
                          <span className={styles['statusBadge']} data-tone='neutral'>
                            {slot.location?.trim() || '장소 미정'}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          deletePracticumSlotMutation.mutate(slot.id);
                        }}
                        size='sm'
                        type='button'
                        variant='danger'
                      >
                        슬롯 삭제
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                !practicumSlotsQuery.isLoading &&
                !practicumSlotsQuery.isError && (
                  <p className={styles['emptyState']}>등록된 실습 슬롯이 없습니다.</p>
                )
              )}

              <div className={styles['practicumSlotForm']}>
                <TextField
                  label='실습 시작 시각'
                  name={`practicum-start-${String(lecture.id)}`}
                  onChange={(event) => {
                    setPracticumSlotForm((current) => ({
                      ...current,
                      startAt: event.target.value,
                    }));
                  }}
                  step={3600}
                  type='datetime-local'
                  value={practicumSlotForm.startAt}
                />
                <TextField
                  label='실습 장소'
                  name={`practicum-location-${String(lecture.id)}`}
                  onChange={(event) => {
                    setPracticumSlotForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }));
                  }}
                  value={practicumSlotForm.location}
                />
                <div className={styles['buttonRow']}>
                  <Button
                    onClick={() => {
                      const payload = toAdminPracticumSlotPayload(practicumSlotForm);
                      if (!payload) {
                        showToast({
                          message: '실습 시작 시각을 올바르게 입력해 주세요.',
                          variant: 'error',
                        });
                        return;
                      }
                      createPracticumSlotMutation.mutate(payload);
                    }}
                    size='sm'
                    type='button'
                  >
                    실습 슬롯 추가
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

const SectionCard = ({
  allowPracticum,
  allowPastOfflineScheduleDates,
  canMoveDown,
  canMoveUp,
  onCreateLecture,
  onDeleteLectureOfflineSchedules,
  onDeleteLecture,
  onDeleteSection,
  onManageLectureResource,
  onManageLectureQuiz,
  onSaveLectureOfflineSchedules,
  onUploadLectureVideo,
  onMoveLecture,
  onMoveSection,
  onSaveLecture,
  onSaveSection,
  onToggleLecturePublish,
  programLearningEndAt,
  programLearningStartAt,
  section,
  videoUploadStatusByLectureId,
}: {
  allowPracticum: boolean;
  allowPastOfflineScheduleDates: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  onCreateLecture: (sectionId: number, payload: AdminLectureUpsertPayload) => boolean;
  onDeleteLectureOfflineSchedules: (lectureId: number) => void;
  onDeleteLecture: (lectureId: number) => void;
  onDeleteSection: (sectionId: number) => void;
  onManageLectureResource: (lectureId: number) => void;
  onManageLectureQuiz: (lectureId: number) => void;
  onSaveLectureOfflineSchedules: (
    lectureId: number,
    payload: AdminLectureOfflineSchedulesReplacePayload,
  ) => void;
  onUploadLectureVideo: (lectureId: number, file: File) => void;
  onMoveLecture: (sectionId: number, lectureId: number, direction: 'up' | 'down') => void;
  onMoveSection: (sectionId: number, direction: 'up' | 'down') => void;
  onSaveLecture: (lectureId: number, payload: AdminLectureUpsertPayload) => void;
  onSaveSection: (sectionId: number, payload: AdminSectionUpsertPayload) => void;
  onToggleLecturePublish: (lectureId: number, published: boolean) => void;
  programLearningEndAt: string | null;
  programLearningStartAt: string | null;
  section: AdminCurriculumSection;
  videoUploadStatusByLectureId: Record<number, string>;
}) => {
  const [sectionForm, setSectionForm] = useState<SectionFormState>({
    description: section.description ?? '',
    title: section.title,
  });
  const [newLectureForm, setNewLectureForm] = useState<LectureFormState>(EMPTY_LECTURE_FORM);
  const [expanded, setExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<SectionWorkspacePanel>('lectures');
  const toggleSectionPanel = (panel: SectionWorkspacePanel) => {
    setExpanded(true);
    setActivePanel((current) => (current === panel ? 'lectures' : panel));
  };
  const handleSectionExpandToggle = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    setActivePanel('lectures');
  };

  return (
    <article className={styles['sectionCard']}>
      <div className={styles['cardHeader']}>
        <div className={styles['summaryContent']}>
          <div className={styles['headerEyebrowRow']}>
            <span className={styles['levelBadge']} data-level='section'>
              {`섹션 ${String(section.sortOrder + 1)}`}
            </span>
            <span className={styles['levelHint']}>강의 구성 최상위 묶음</span>
          </div>
          <h3 className={styles['cardTitle']}>{section.title}</h3>
          <p className={styles['sectionDescription']}>
            {section.description?.trim() || '섹션 설명이 아직 없습니다.'}
          </p>
          <div className={styles['summaryGrid']}>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>포함 강의</span>
              <strong className={styles['summaryValue']}>
                {`강의 ${String(section.lectures.length)}개`}
              </strong>
            </div>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>정렬 순서</span>
              <strong
                className={styles['summaryValue']}
              >{`${String(section.sortOrder + 1)}번째 섹션`}</strong>
            </div>
          </div>
        </div>

        <div className={styles['actionColumn']}>
          <div className={styles['buttonRow']}>
            <Button
              onClick={() => {
                handleSectionExpandToggle();
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              {expanded ? '섹션 접기' : '섹션 펼치기'}
            </Button>
            <Button
              onClick={() => {
                toggleSectionPanel('editor');
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              {activePanel === 'editor' ? '섹션 수정 닫기' : '섹션 수정'}
            </Button>
            <Button
              onClick={() => {
                toggleSectionPanel('create-lecture');
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              {activePanel === 'create-lecture' ? '새 강의 추가 닫기' : '새 강의 추가'}
            </Button>
          </div>
          <Button
            disabled={!canMoveUp}
            onClick={() => {
              onMoveSection(section.id, 'up');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            위로 이동
          </Button>
          <Button
            disabled={!canMoveDown}
            onClick={() => {
              onMoveSection(section.id, 'down');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            아래로 이동
          </Button>
          <Button
            disabled={section.lectures.length > 0}
            onClick={() => {
              onDeleteSection(section.id);
            }}
            size='sm'
            type='button'
            variant='danger'
          >
            섹션 삭제
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className={styles['cardBody']}>
          <div className={styles['workspaceHeader']}>
            <div className={styles['workspaceHeaderSummary']}>
              <span className={styles['workspaceEyebrow']}>섹션 작업영역</span>
              <strong className={styles['workspaceCurrentPanel']}>
                {activePanel === 'lectures'
                  ? '강의 목록 관리'
                  : activePanel === 'editor'
                    ? '섹션 정보 편집'
                    : '새 강의 추가'}
              </strong>
            </div>
            <div className={styles['workspaceTabBar']}>
              <button
                className={styles['workspaceTab']}
                data-active={activePanel === 'lectures'}
                onClick={() => {
                  setExpanded(true);
                  setActivePanel('lectures');
                }}
                type='button'
              >
                강의 목록
              </button>
              <button
                className={styles['workspaceTab']}
                data-active={activePanel === 'editor'}
                onClick={() => {
                  toggleSectionPanel('editor');
                }}
                type='button'
              >
                {activePanel === 'editor' ? '섹션 수정 닫기' : '섹션 수정'}
              </button>
              <button
                className={styles['workspaceTab']}
                data-active={activePanel === 'create-lecture'}
                onClick={() => {
                  toggleSectionPanel('create-lecture');
                }}
                type='button'
              >
                {activePanel === 'create-lecture' ? '새 강의 추가 닫기' : '새 강의 추가'}
              </button>
            </div>
            <p className={styles['helperText']}>
              먼저 섹션 단위를 고정하고, 그 안에서 강의를 추가하거나 순서를 조정하는 흐름으로
              관리합니다.
            </p>
          </div>

          {activePanel === 'editor' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h4 className={styles['subsectionTitle']}>섹션 정보 수정</h4>
              </div>
              <div className={styles['fieldGrid']}>
                <TextField
                  label='섹션명'
                  name={`section-title-${String(section.id)}`}
                  onChange={(event) => {
                    setSectionForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }));
                  }}
                  value={sectionForm.title}
                />
                <TextAreaField
                  label='섹션 설명'
                  name={`section-description-${String(section.id)}`}
                  onChange={(event) => {
                    setSectionForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  rows={3}
                  value={sectionForm.description}
                />
                <div className={styles['buttonRow']}>
                  <Button
                    onClick={() => {
                      onSaveSection(section.id, toSectionPayload(sectionForm, section.sortOrder));
                    }}
                    size='sm'
                    type='button'
                  >
                    섹션 저장
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {activePanel === 'lectures' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h4 className={styles['subsectionTitle']}>강의 목록</h4>
                <span className={styles['levelHint']}>
                  {`이 섹션에 강의 ${String(section.lectures.length)}개`}
                </span>
              </div>

              {section.lectures.length ? (
                <div className={styles['lectureList']}>
                  {section.lectures.map((lecture, index) => (
                    <LectureCard
                      allowPracticum={allowPracticum}
                      allowPastOfflineScheduleDates={allowPastOfflineScheduleDates}
                      canMoveDown={index < section.lectures.length - 1}
                      canMoveUp={index > 0}
                      key={lecture.id}
                      lecture={lecture}
                      onDeleteOfflineSchedules={onDeleteLectureOfflineSchedules}
                      onDelete={onDeleteLecture}
                      onManageQuiz={onManageLectureQuiz}
                      onManageResource={onManageLectureResource}
                      onMove={(lectureId, direction) => {
                        onMoveLecture(section.id, lectureId, direction);
                      }}
                      onSave={onSaveLecture}
                      onSaveOfflineSchedules={onSaveLectureOfflineSchedules}
                      onTogglePublish={onToggleLecturePublish}
                      onUploadVideo={onUploadLectureVideo}
                      programLearningEndAt={programLearningEndAt}
                      programLearningStartAt={programLearningStartAt}
                      videoUploadStatus={videoUploadStatusByLectureId[lecture.id] ?? null}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles['emptyState']}>등록된 강의가 없습니다.</p>
              )}
            </div>
          ) : null}

          {activePanel === 'create-lecture' ? (
            <div className={styles['managementPanel']}>
              <div className={styles['panelHeader']}>
                <h4 className={styles['subsectionTitle']}>새 강의 추가</h4>
              </div>
              <div className={styles['fieldGrid']}>
                <label className={styles['selectField']}>
                  <span className={styles['selectLabel']}>새 강의 종류</span>
                  <select
                    className={styles['selectControl']}
                    onChange={(event) => {
                      const nextProblemOnly = event.target.value === 'PROBLEM_ONLY';
                      setNewLectureForm((current) => ({
                        ...current,
                        practicumEnabled: nextProblemOnly ? false : current.practicumEnabled,
                        problemOnly: nextProblemOnly,
                      }));
                    }}
                    value={newLectureForm.problemOnly ? 'PROBLEM_ONLY' : 'STANDARD'}
                  >
                    <option value='STANDARD'>일반 강의</option>
                    <option value='PROBLEM_ONLY'>문제풀이형 강의</option>
                  </select>
                </label>
                <TextField
                  label='새 강의명'
                  name={`new-lecture-title-${String(section.id)}`}
                  onChange={(event) => {
                    setNewLectureForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }));
                  }}
                  value={newLectureForm.title}
                />
                <TextAreaField
                  label='새 강의 설명'
                  name={`new-lecture-description-${String(section.id)}`}
                  onChange={(event) => {
                    setNewLectureForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  rows={3}
                  value={newLectureForm.description}
                />
                {!newLectureForm.practicumEnabled || newLectureForm.problemOnly ? (
                  <TextField
                    label='새 강의 길이(분)'
                    name={`new-lecture-duration-${String(section.id)}`}
                    onChange={(event) => {
                      setNewLectureForm((current) => ({
                        ...current,
                        durationSeconds: event.target.value,
                      }));
                    }}
                    value={newLectureForm.durationSeconds}
                  />
                ) : null}

                {allowPracticum && !newLectureForm.problemOnly ? (
                  <label className={styles['checkboxRow']}>
                    <input
                      checked={newLectureForm.practicumEnabled}
                      onChange={(event) => {
                        setNewLectureForm((current) => ({
                          ...current,
                          practicumEnabled: event.target.checked,
                        }));
                      }}
                      type='checkbox'
                    />
                    실습 예약 사용
                  </label>
                ) : null}

                <div className={styles['buttonRow']}>
                  <Button
                    onClick={() => {
                      const didStart = onCreateLecture(
                        section.id,
                        toLecturePayload(newLectureForm, section.lectures.length),
                      );
                      if (didStart) {
                        setNewLectureForm(EMPTY_LECTURE_FORM);
                        setActivePanel('lectures');
                      }
                    }}
                    size='sm'
                    type='button'
                  >
                    강의 추가
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

const AdminProgramCurriculumSection = ({
  allowPastOfflineScheduleDates = false,
  embedded = false,
  enabled,
  onOpenLectureWorkspace,
  programLearningEndAt = null,
  programLearningStartAt = null,
  programType = null,
  programId,
}: AdminProgramCurriculumSectionProps) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const curriculumQuery = useAdminCurriculumQuery(programId, enabled);
  const [newSectionForm, setNewSectionForm] = useState<SectionFormState>(EMPTY_SECTION_FORM);
  const [videoUploadStatusByLectureId, setVideoUploadStatusByLectureId] = useState<
    Record<number, string>
  >({});

  const invalidateCurriculum = async () => {
    await queryClient.invalidateQueries({ queryKey: adminCurriculumQueryKey(programId) });
  };

  const createSectionMutation = useMutation({
    mutationFn: (payload: AdminSectionUpsertPayload) =>
      createAdminSection(programId as number, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션을 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setNewSectionForm(EMPTY_SECTION_FORM);
      await invalidateCurriculum();
      showToast({
        message: '섹션을 추가했습니다.',
        variant: 'success',
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({
      payload,
      sectionId,
    }: {
      payload: AdminSectionUpsertPayload;
      sectionId: number;
    }) => updateAdminSection(sectionId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션을 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '섹션을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: number) => deleteAdminSection(sectionId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '섹션을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: (items: readonly AdminSortOrderItem[]) =>
      reorderAdminSections(programId as number, items),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션 순서를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
    },
  });

  const createLectureMutation = useMutation({
    mutationFn: ({
      payload,
      sectionId,
    }: {
      payload: AdminLectureUpsertPayload;
      sectionId: number;
    }) => createAdminLecture(sectionId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의를 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '강의를 추가했습니다.',
        variant: 'success',
      });
    },
  });

  const updateLectureMutation = useMutation({
    mutationFn: ({
      lectureId,
      payload,
    }: {
      lectureId: number;
      payload: AdminLectureUpsertPayload;
    }) => updateAdminLecture(lectureId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '강의를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteLectureMutation = useMutation({
    mutationFn: async (lectureId: number) => {
      const impact = await fetchAdminLectureDeleteImpact(lectureId);
      if (!window.confirm(buildLectureDeleteConfirmMessage(impact))) {
        return { impact, deleted: false };
      }

      await deleteAdminLecture(lectureId);
      return { impact, deleted: true };
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async ({ impact, deleted }) => {
      if (!deleted) {
        return;
      }

      await invalidateCurriculum();
      showToast({
        message: impact.hasHistory
          ? '학습 이력이 있어 강의를 숨김 처리했습니다.'
          : '강의를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const toggleLecturePublishMutation = useMutation({
    mutationFn: ({ lectureId, published }: { lectureId: number; published: boolean }) => {
      if (published) {
        return unpublishAdminLecture(lectureId);
      }

      return publishAdminLecture(lectureId);
    },
    onError: (error: unknown, variables) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : variables.published
              ? '강의 발행을 해제하지 못했습니다.'
              : '강의를 발행하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await invalidateCurriculum();
      showToast({
        message: variables.published ? '강의 발행을 해제했습니다.' : '강의를 발행했습니다.',
        variant: 'success',
      });
    },
  });

  const reorderLecturesMutation = useMutation({
    mutationFn: ({
      items,
      sectionId,
    }: {
      items: readonly AdminSortOrderItem[];
      sectionId: number;
    }) => reorderAdminLectures(sectionId, items),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 순서를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
    },
  });

  const replaceOfflineSchedulesMutation = useMutation({
    mutationFn: ({
      lectureId,
      payload,
    }: {
      lectureId: number;
      payload: AdminLectureOfflineSchedulesReplacePayload;
    }) => replaceAdminLectureOfflineSchedules(lectureId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '현장 강의 일정을 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '현장 강의 일정을 저장했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteOfflineSchedulesMutation = useMutation({
    mutationFn: (lectureId: number) => deleteAdminLectureOfflineSchedules(lectureId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '현장 강의 일정을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '현장 강의 일정을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  if (!enabled || programId === null) {
    return (
      <section className={classNames(styles['section'], embedded && styles['sectionEmbedded'])}>
        <div className={styles['header']}>
          <div>
            {!embedded ? <h2 className={styles['title']}>강의 구성 관리</h2> : null}
            <p className={styles['description']}>
              강의 구성은 프로그램 기본정보를 먼저 저장한 뒤 관리할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const sections = curriculumQuery.data ?? [];
  const allowPracticum = programType === 'HYBRID';

  const handleCreateSection = () => {
    const validationMessage = validateSectionForm(newSectionForm);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    createSectionMutation.mutate(toSectionPayload(newSectionForm, sections.length));
  };

  const handleSaveSection = (sectionId: number, payload: AdminSectionUpsertPayload) => {
    const validationMessage = validateSectionForm({
      description: payload.description ?? '',
      title: payload.title,
    });

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    updateSectionMutation.mutate({ payload, sectionId });
  };

  const handleCreateLecture = (sectionId: number, payload: AdminLectureUpsertPayload): boolean => {
    const validationMessage = validateLectureForm({
      description: payload.description ?? '',
      durationSeconds: durationSecondsToMinutesInput(payload.durationSeconds),
      problemOnly: payload.problemOnly ?? false,
      preview: payload.preview,
      practicumEnabled: payload.practicumEnabled ?? false,
      title: payload.title,
    });

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return false;
    }

    createLectureMutation.mutate({ payload, sectionId });
    return true;
  };

  const handleSaveLecture = (lectureId: number, payload: AdminLectureUpsertPayload) => {
    const validationMessage = validateLectureForm({
      description: payload.description ?? '',
      durationSeconds: durationSecondsToMinutesInput(payload.durationSeconds),
      problemOnly: payload.problemOnly ?? false,
      preview: payload.preview,
      practicumEnabled: payload.practicumEnabled ?? false,
      title: payload.title,
    });

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    updateLectureMutation.mutate({ lectureId, payload });
  };

  const handleMoveSection = (sectionId: number, direction: 'up' | 'down') => {
    const items = buildReorderItems(sections, sectionId, direction);

    if (!items) {
      return;
    }

    reorderSectionsMutation.mutate(items);
  };

  const handleMoveLecture = (sectionId: number, lectureId: number, direction: 'up' | 'down') => {
    const section = sections.find((currentSection) => currentSection.id === sectionId);

    if (!section) {
      return;
    }

    const items = buildReorderItems(section.lectures, lectureId, direction);

    if (!items) {
      return;
    }

    reorderLecturesMutation.mutate({ items, sectionId });
  };

  const pollVideoReady = async (videoId: number, lectureId: number): Promise<void> => {
    for (;;) {
      const status = await fetchAdminVideoStatus(videoId);
      if (status.status === 'PROCESSING') {
        setVideoUploadStatusByLectureId((current) => ({
          ...current,
          [lectureId]: formatProgressLabel('영상 인코딩 중', status.progressPercent),
        }));
      }
      if (status.status === 'READY') {
        return;
      }
      if (status.status === 'FAILED') {
        throw new Error(status.errorMessage || '영상 인코딩에 실패했습니다.');
      }
      await new Promise((resolve) => window.setTimeout(resolve, VIDEO_ENCODING_POLL_INTERVAL_MS));
    }
  };

  const handleUploadLectureVideo = async (lectureId: number, file: File) => {
    const lecture = sections
      .flatMap((section) => section.lectures)
      .find((current) => current.id === lectureId);

    if (!lecture) {
      showToast({
        message: '강의 정보를 다시 불러온 뒤 시도해 주세요.',
        variant: 'error',
      });
      return;
    }

    if (!lecture.title.trim()) {
      showToast({
        message: '영상 업로드 전에 강의명을 먼저 저장해 주세요.',
        variant: 'error',
      });
      return;
    }

    try {
      setVideoUploadStatusByLectureId((current) => ({
        ...current,
        [lectureId]: '영상 업로드 중',
      }));

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
          setVideoUploadStatusByLectureId((current) => ({
            ...current,
            [lectureId]: formatProgressLabel(
              '영상 업로드 중',
              (completedUploadPartCount / chunks.length) * 100,
            ),
          }));
          return {
            eTag,
            partNumber: chunk.partNumber,
          };
        }),
      );

      setVideoUploadStatusByLectureId((current) => ({
        ...current,
        [lectureId]: '영상 인코딩 준비 중',
      }));

      await completeAdminVideoUpload(session.videoId, {
        parts: completedParts,
        uploadId: session.uploadId,
      });
      await startAdminVideoEncoding(session.videoId);

      setVideoUploadStatusByLectureId((current) => ({
        ...current,
        [lectureId]: '영상 인코딩 중',
      }));

      await pollVideoReady(session.videoId, lectureId);
      await assignAdminLectureVideo(String(lectureId), session.videoId);
      await invalidateCurriculum();

      setVideoUploadStatusByLectureId((current) => ({
        ...current,
        [lectureId]: `연결된 videoId ${String(session.videoId)}`,
      }));
      showToast({
        message: '강의 영상을 연결했습니다.',
        variant: 'success',
      });
    } catch (error) {
      setVideoUploadStatusByLectureId((current) => ({
        ...current,
        [lectureId]: '업로드 실패',
      }));
      showToast({
        message: error instanceof Error ? error.message : '강의 영상 업로드에 실패했습니다.',
        variant: 'error',
      });
    }
  };

  return (
    <section className={classNames(styles['section'], embedded && styles['sectionEmbedded'])}>
      <div className={styles['header']}>
        <div>
          {!embedded ? <h2 className={styles['title']}>강의 구성 관리</h2> : null}
          {!embedded ? (
            <p className={styles['description']}>
              섹션과 강의를 편집하고 공개 상태를 관리합니다. 영상은 강의 카드 안에서 바로 업로드하고
              인코딩 완료 후 연결합니다.
            </p>
          ) : null}
        </div>
      </div>

      {curriculumQuery.isPending ? (
        <p className={styles['helperText']}>강의 구성을 불러오는 중입니다.</p>
      ) : null}

      {curriculumQuery.isError ? (
        <p className={styles['helperText']}>
          {curriculumQuery.error instanceof Error
            ? curriculumQuery.error.message
            : '강의 구성을 불러오지 못했습니다.'}
        </p>
      ) : null}

      {!curriculumQuery.isPending && !curriculumQuery.isError ? (
        <>
          <div className={styles['createCard']}>
            <div className={styles['workspaceHeaderSummary']}>
              <span className={styles['workspaceEyebrow']}>새 섹션 생성</span>
              <strong className={styles['workspaceCurrentPanel']}>
                {`현재 섹션 ${String(sections.length)}개`}
              </strong>
            </div>
            <p className={styles['helperText']}>
              섹션은 강의 구성의 최상위 뎁스입니다. 먼저 섹션을 만든 뒤, 각 섹션 안에 강의를
              넣습니다.
            </p>
            <div className={styles['fieldGrid']}>
              <TextField
                label='새 섹션명'
                name='new-section-title'
                onChange={(event) => {
                  setNewSectionForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                }}
                value={newSectionForm.title}
              />
              <TextAreaField
                label='새 섹션 설명'
                name='new-section-description'
                onChange={(event) => {
                  setNewSectionForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                rows={3}
                value={newSectionForm.description}
              />
              <div className={styles['buttonRow']}>
                <Button onClick={handleCreateSection} type='button'>
                  섹션 추가
                </Button>
              </div>
            </div>
          </div>

          <div className={styles['sectionList']}>
            {sections.length ? (
              sections.map((section, index) => (
                <SectionCard
                  allowPracticum={allowPracticum}
                  allowPastOfflineScheduleDates={allowPastOfflineScheduleDates}
                  canMoveDown={index < sections.length - 1}
                  canMoveUp={index > 0}
                  key={section.id}
                  onCreateLecture={handleCreateLecture}
                  onDeleteLectureOfflineSchedules={(lectureId) => {
                    deleteOfflineSchedulesMutation.mutate(lectureId);
                  }}
                  onDeleteLecture={(lectureId) => {
                    deleteLectureMutation.mutate(lectureId);
                  }}
                  onManageLectureQuiz={(lectureId) => {
                    onOpenLectureWorkspace?.(lectureId, 'problem');
                  }}
                  onManageLectureResource={(lectureId) => {
                    onOpenLectureWorkspace?.(lectureId, 'resource');
                  }}
                  onSaveLectureOfflineSchedules={(lectureId, payload) => {
                    replaceOfflineSchedulesMutation.mutate({ lectureId, payload });
                  }}
                  onUploadLectureVideo={(lectureId, file) => {
                    void handleUploadLectureVideo(lectureId, file);
                  }}
                  onDeleteSection={(sectionId) => {
                    deleteSectionMutation.mutate(sectionId);
                  }}
                  onMoveLecture={handleMoveLecture}
                  onMoveSection={handleMoveSection}
                  onSaveLecture={handleSaveLecture}
                  onSaveSection={handleSaveSection}
                  onToggleLecturePublish={(lectureId, published) => {
                    toggleLecturePublishMutation.mutate({ lectureId, published });
                  }}
                  programLearningEndAt={programLearningEndAt}
                  programLearningStartAt={programLearningStartAt}
                  section={section}
                  videoUploadStatusByLectureId={videoUploadStatusByLectureId}
                />
              ))
            ) : (
              <p className={styles['emptyState']}>등록된 섹션이 없습니다.</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
};

export default AdminProgramCurriculumSection;
