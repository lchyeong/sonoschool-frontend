/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Hls from 'hls.js/light';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  cancelMyLecturePracticum,
  fetchLectureStream,
  moveMyLecturePracticum,
  reserveMyLecturePracticum,
  saveLectureProgress,
  sendLectureProgressBeacon,
  updateMyOfflineScheduleAbsence,
} from '@/api/mypage';
import {
  fetchStudentProblem,
  saveStudentProblemSession,
  startStudentProblemSession,
  submitStudentProblem,
} from '@/api/studentProblems';
import iconArrowDownToLine from '@/assets/icons/lucide_arrow-down-to-line.svg';
import iconArrowLeft from '@/assets/icons/lucide_arrow-left.svg';
import iconBookmark from '@/assets/icons/lucide_bookmark.svg';
import iconCheck from '@/assets/icons/lucide_check.svg';
import iconChevronDown from '@/assets/icons/lucide_chevron-down.svg';
import iconFolderOpen from '@/assets/icons/lucide_folder-open.svg';
import iconFullscreen from '@/assets/icons/lucide_fullscreen.svg';
import iconPlay from '@/assets/icons/lucide_play.svg';
import iconVolume from '@/assets/icons/lucide_volume-2.svg';
import iconCurrentLessonIndicator from '@/assets/icons/player-current-indicator.svg';
import ProgramQnaPanel from '@/components/qna/ProgramQnaPanel';
import Button from '@/components/ui/Button/Button';
import { getPlayerMockQueryKeySegment } from '@/mocks/player/runtime';
import {
  myEnrollmentPracticumQueryKey,
  myLearningPlayerQueryKey,
  useMyEnrollmentPracticumQuery,
  useMyLearningPlayerSnapshotQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type {
  LearningPlayerLessonProgress,
  LearningPlayerResourceAttachment,
  ProtectedLectureStream,
} from '@/types/mypage';
import type {
  EnrollmentPracticumLecture,
  PracticumReservation,
  PracticumSlot,
} from '@/types/practicum';
import type {
  ProgramCurriculumLesson,
  ProgramCurriculumLessonDeliveryType,
  ProgramCurriculumScheduleItem,
} from '@/types/programCatalog';
import type { StudentProblem, StudentProblemAttemptResult } from '@/types/studentProblems';
import { classNames } from '@/utils/classNames';
import { getOrCreatePlaybackDeviceId } from '@/utils/playbackDeviceId';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  formatTimeRange,
  getSlotDateKey,
  toDateInputValue,
  toMonthValue,
} from '@/utils/practicumCalendar';

import {
  flattenLessons,
  flattenPlayerItems,
  formatDateRange,
  formatSeconds,
  getDefaultPlayerItemId,
} from '../LearningPage/learningShared';

import styles from './PlayerPage.module.scss';

type LessonStatusStyle = CSSProperties & {
  '--lesson-check-icon'?: string;
};

type PlayerIconStyle = CSSProperties & {
  '--player-icon': string;
};

interface QualityOption {
  label: string;
  levelIndex: number | 'auto';
}

type SidebarPanel = 'curriculum' | 'qna';
type QuizSidebarPanel = 'curriculum' | 'qna';
type SettingsPanel = 'quality' | 'speed';

interface QuizClockAnchor {
  elapsedSeconds: number;
  receivedAtMs: number;
  remainingSeconds: number | null;
  startedAt: string | null;
}

const PLAYBACK_SPEED_OPTIONS = [0.8, 1, 1.25, 1.5] as const;
const DEFAULT_QUALITY_OPTIONS: QualityOption[] = [{ label: '자동', levelIndex: 'auto' }];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const FIXED_PLAYER_CALENDAR_CELL_COUNT = 42;
const PROGRESS_SAVE_INTERVAL_SECONDS = 30;
const PROGRESS_SAVE_MIN_DELTA_SECONDS = 20;
const PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS = 5;
const PROBLEM_SESSION_SAVE_INTERVAL_SECONDS = 10;
const PLAYER_CONTROLS_AUTO_HIDE_MS = 2400;
const LESSON_TYPE_LABELS: Record<ProgramCurriculumLessonDeliveryType, string> = {
  offline: '오프라인 강의',
  online: '동영상 강의',
  practicum: '실습 예약 강의',
  problem: '문제 풀이 강의',
  resource: '첨부파일 강의',
};
const PLAYER_LESSON_TYPE_LABELS: Record<ProgramCurriculumLessonDeliveryType, string> = {
  offline: '오프라인',
  online: '영상',
  practicum: '실습',
  problem: '문제풀이',
  resource: '첨부파일',
};

const buildPlayerIconStyle = (iconSrc: string): PlayerIconStyle => ({
  '--player-icon': `url("${iconSrc}")`,
});

const playerArrowLeftIconStyle = buildPlayerIconStyle(iconArrowLeft);
const playerChevronDownIconStyle = buildPlayerIconStyle(iconChevronDown);
const playerPlayIconStyle = buildPlayerIconStyle(iconPlay);
const playerVolumeIconStyle = buildPlayerIconStyle(iconVolume);
const playerFullscreenIconStyle = buildPlayerIconStyle(iconFullscreen);
const playerFolderOpenIconStyle = buildPlayerIconStyle(iconFolderOpen);
const playerCurrentLessonIndicatorStyle = buildPlayerIconStyle(iconCurrentLessonIndicator);
const playerArrowDownToLineIconStyle = buildPlayerIconStyle(iconArrowDownToLine);

type HlsLoaderConstructor = typeof Hls.DefaultConfig.loader;
type HlsLoaderInstance = InstanceType<HlsLoaderConstructor>;

const formatQualityLabel = (level: {
  height?: number;
  width?: number;
  bitrate?: number;
  name?: string;
}) => {
  if (level.name) {
    return level.name;
  }

  if (level.height) {
    return `${String(level.height)}p`;
  }

  if (level.width) {
    return `${String(level.width)}px`;
  }

  if (level.bitrate) {
    return `${String(Math.round(level.bitrate / 1000))}kbps`;
  }

  return '수동';
};

const buildQualityOptions = (
  levels: Array<{ bitrate?: number; height?: number; name?: string; width?: number }>,
) => {
  const dedupedByLabel = new Map<string, QualityOption>();

  levels.forEach((level, index) => {
    const label = formatQualityLabel(level);
    dedupedByLabel.set(label, { label, levelIndex: index });
  });

  return [...DEFAULT_QUALITY_OPTIONS, ...dedupedByLabel.values()];
};

const createProtectedHlsLoader = (hlsKeyUrl: string): HlsLoaderConstructor => {
  const DefaultLoader = Hls.DefaultConfig.loader;

  return class ProtectedHlsLoader extends DefaultLoader {
    override load: HlsLoaderInstance['load'] = (context, config, callbacks) => {
      const nextContext =
        'type' in context && context.type === 'key'
          ? {
              ...context,
              url: hlsKeyUrl,
            }
          : context;

      super.load(nextContext, config, callbacks);
    };
  };
};

const buildPlaybackRequestPrefix = (streamUrl: string): string | null => {
  try {
    const parsed = new URL(streamUrl, window.location.origin);
    const marker = '/api/v1/lectures/';
    const playbackMarker = '/playback/';

    if (!parsed.pathname.includes(marker) || !parsed.pathname.includes(playbackMarker)) {
      return null;
    }

    const lastSlashIndex = parsed.pathname.lastIndexOf('/');
    if (lastSlashIndex < 0) {
      return null;
    }

    return `${parsed.origin}${parsed.pathname.slice(0, lastSlashIndex + 1)}`;
  } catch {
    return null;
  }
};

const normalizeQuizAnswers = (answers: Record<number, number[]>) => {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, optionIds]) => {
      const uniqueSortedOptionIds = [...new Set(optionIds)].sort((left, right) => left - right);
      return [Number(questionId), uniqueSortedOptionIds];
    }),
  ) as Record<number, number[]>;
};

const clampQuestionIndex = (index: number, questionCount: number) => {
  if (questionCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), questionCount - 1);
};

const resolveQuizElapsedSeconds = (
  clockAnchor: QuizClockAnchor | null,
  timeLimitSeconds: number | null | undefined,
  nowMs: number,
  fallbackElapsedSeconds: number,
) => {
  const hasTimeLimit = Boolean(timeLimitSeconds && timeLimitSeconds > 0);
  let elapsedSeconds = Math.max(0, Math.floor(fallbackElapsedSeconds));

  if (clockAnchor) {
    const localTickDeltaSeconds = Math.max(
      0,
      Math.floor((nowMs - clockAnchor.receivedAtMs) / 1000),
    );
    elapsedSeconds = Math.max(
      elapsedSeconds,
      Math.max(0, clockAnchor.elapsedSeconds) + localTickDeltaSeconds,
    );

    if (hasTimeLimit && clockAnchor.remainingSeconds !== null) {
      const remainingSeconds = Math.max(0, clockAnchor.remainingSeconds - localTickDeltaSeconds);
      elapsedSeconds = Math.max(elapsedSeconds, (timeLimitSeconds as number) - remainingSeconds);
    } else if (hasTimeLimit && clockAnchor.startedAt) {
      const startedAtMs = new Date(clockAnchor.startedAt).getTime();
      if (!Number.isNaN(startedAtMs)) {
        elapsedSeconds = Math.max(elapsedSeconds, Math.floor((nowMs - startedAtMs) / 1000));
      }
    }
  }

  if (hasTimeLimit) {
    return Math.min(Math.max(0, elapsedSeconds), timeLimitSeconds as number);
  }

  return Math.max(0, elapsedSeconds);
};

const formatScheduleDate = (dateValue: string | null) => {
  if (!dateValue) {
    return '일정 준비중';
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString('ko-KR', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
};

const normalizeScheduleClock = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const [hourText, minuteText] = value.split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatScheduleTime = (schedule: ProgramCurriculumScheduleItem) => {
  const startTime = normalizeScheduleClock(schedule.startTime);
  const endTime = normalizeScheduleClock(schedule.endTime);

  if (startTime && endTime) {
    return `${startTime}~${endTime}`;
  }

  return startTime ?? endTime ?? '';
};

const getLessonScheduleLabel = (lesson: ProgramCurriculumLesson) => {
  const firstSchedule = lesson.offlineSchedules?.[0] ?? null;

  if (!firstSchedule) {
    return lesson.startDate ? formatScheduleDate(lesson.startDate) : '일정 준비중';
  }

  const timeLabel = formatScheduleTime(firstSchedule);
  const scheduleCountLabel =
    lesson.offlineSchedules && lesson.offlineSchedules.length > 1
      ? ` 외 ${String(lesson.offlineSchedules.length - 1)}회`
      : '';

  return `${formatScheduleDate(firstSchedule.date)}${timeLabel ? ` ${timeLabel}` : ''}${scheduleCountLabel}`;
};

const formatProblemTimeLimit = (seconds: number | null | undefined) => {
  if (!seconds || seconds <= 0) {
    return '시간 제한 없음';
  }

  return `제한시간 ${formatSeconds(seconds)}`;
};

const formatProblemQuestionCount = (questionCount: number | null | undefined) => {
  return typeof questionCount === 'number' ? `${String(questionCount)}문항` : null;
};

const formatResourceFileTypeLabel = (attachment: LearningPlayerResourceAttachment) => {
  const extension = attachment.fileName.split('.').pop()?.trim().toUpperCase();

  if (extension) {
    return extension.length <= 4 ? extension : extension.slice(0, 4);
  }

  const mimeType = attachment.mimeType?.toLowerCase() ?? '';

  if (mimeType.includes('pdf')) {
    return 'PDF';
  }

  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return 'XLS';
  }

  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return 'PPT';
  }

  if (mimeType.includes('word')) {
    return 'DOC';
  }

  return 'FILE';
};

const formatResourceFileSize = (fileSize: number | null | undefined) => {
  if (!fileSize || fileSize <= 0) {
    return '-';
  }

  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)}MB`;
  }

  return `${String(Math.max(1, Math.round(fileSize / 1024)))}KB`;
};

const formatResourceUpdatedDate = (dateValue: string | null | undefined) => {
  if (!dateValue) {
    return '-';
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');

  return `${String(year)}. ${month}. ${day}.`;
};

interface OfflineScheduleEntry {
  absent: boolean;
  attendanceCompleted: boolean;
  date: string | null;
  id: string;
  location: string | null;
  notes: string | null;
  ruleId: number | null;
  timeLabel: string | null;
}

const buildOfflineScheduleEntries = (
  lesson: ProgramCurriculumLesson | null | undefined,
): OfflineScheduleEntry[] => {
  if (!lesson || lesson.deliveryType !== 'offline') {
    return [];
  }

  if (lesson.offlineSchedules?.length) {
    return lesson.offlineSchedules.map((schedule, index) => ({
      absent: schedule.absent === true,
      attendanceCompleted: schedule.attendanceCompleted === true,
      date: schedule.date,
      id: schedule.ruleId
        ? `${lesson.id}-schedule-${String(schedule.ruleId)}`
        : `${lesson.id}-${schedule.date ?? 'unknown'}-${String(index)}`,
      location: schedule.location?.trim() || null,
      notes: schedule.notes?.trim() || null,
      ruleId: schedule.ruleId ?? null,
      timeLabel: formatScheduleTime(schedule) || null,
    }));
  }

  if (!lesson.startDate) {
    return [];
  }

  return [
    {
      absent: false,
      attendanceCompleted: false,
      date: lesson.startDate,
      id: `${lesson.id}-fallback`,
      location: null,
      notes: null,
      ruleId: null,
      timeLabel: null,
    },
  ];
};

const getLessonSummaryActionLabel = (
  lesson: ProgramCurriculumLesson,
  practicumSidebarLabel: string | null = null,
) => {
  if (lesson.deliveryType === 'online') {
    return lesson.durationLabel;
  }

  if (lesson.deliveryType === 'offline') {
    return '일정 확인';
  }

  if (lesson.deliveryType === 'resource') {
    return '자료 확인';
  }

  if (lesson.deliveryType === 'problem') {
    return typeof lesson.questionCount === 'number'
      ? `${String(lesson.questionCount)}문항`
      : '문제 풀이';
  }

  return practicumSidebarLabel ?? '예약 확인';
};

const getOfflineSidebarState = (lesson: ProgramCurriculumLesson) => {
  if (lesson.deliveryType !== 'offline') {
    return null;
  }

  return lesson.offlineSchedules?.some((schedule) => schedule.absent === true)
    ? { label: '불참', tone: 'noshow' as const }
    : null;
};

const getQuizSidebarStatusLabel = (
  selectedOptionIds: number[],
  isFlagged: boolean,
  isCurrentQuestion: boolean,
) => {
  if (isCurrentQuestion) {
    return isFlagged ? '나중에 풀기' : '현재 진행';
  }

  if (isFlagged) {
    return '나중에 풀기';
  }

  if (selectedOptionIds.length > 0) {
    return '답변 완료';
  }

  return '미응답';
};

const formatSelectedQuizAnswerLabel = (
  question: StudentProblem['questions'][number],
  selectedOptionIds: number[],
) => {
  if (!selectedOptionIds.length) {
    return null;
  }

  const optionNumberById = new Map(
    question.options.map((option, optionIndex) => [option.id, optionIndex + 1]),
  );
  const selectedOptionNumbers = selectedOptionIds
    .map((optionId) => optionNumberById.get(optionId))
    .filter((optionNumber): optionNumber is number => optionNumber !== undefined)
    .sort((left, right) => left - right);

  if (!selectedOptionNumbers.length) {
    return null;
  }

  return `${selectedOptionNumbers.join(', ')}번`;
};

const formatQuizQuestionLabel = (index: number) => {
  return `Question ${String(index + 1).padStart(2, '0')}`;
};

const getLessonMetaItems = (lesson: ProgramCurriculumLesson) => {
  if (lesson.deliveryType === 'problem') {
    return [
      formatProblemQuestionCount(lesson.questionCount),
      formatProblemTimeLimit(lesson.problemTimeLimitSeconds),
    ].filter((item): item is string => Boolean(item));
  }

  if (lesson.deliveryType === 'offline') {
    const scheduleLabel = getLessonScheduleLabel(lesson);
    const locationLabel = lesson.offlineSchedules?.[0]?.location ?? null;
    return [scheduleLabel, locationLabel].filter((item): item is string => Boolean(item));
  }

  if (lesson.deliveryType === 'practicum') {
    return [lesson.offlineSchedules?.length ? getLessonScheduleLabel(lesson) : '실습 일정 확인'];
  }

  if (lesson.deliveryType === 'resource') {
    return lesson.description?.trim() ? [lesson.description.trim()] : [];
  }

  return lesson.description?.trim() ? [lesson.description.trim()] : [];
};

const formatPracticumSummaryDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '예약';
  }

  return date.toLocaleString('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
  });
};

const sortPracticumSlots = (slots: PracticumSlot[]) => {
  return [...slots].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
};

const isPracticumSlotInPast = (slot: PracticumSlot) => Date.parse(slot.startAt) < Date.now();

const isPracticumSlotReservable = (slot: PracticumSlot) =>
  slot.slotStatus === 'OPEN' && !slot.full && !isPracticumSlotInPast(slot);

type PracticumSidebarStateTone = 'completed' | 'cta' | 'noshow' | 'scheduled';

interface PracticumSidebarState {
  label: string;
  tone: PracticumSidebarStateTone;
}

const getPracticumReservationKind = (reservation: PracticumReservation) => {
  if (reservation.status === 'NO_SHOW') {
    return 'noshow';
  }

  return Date.parse(reservation.endAt) < Date.now() ? 'completed' : 'scheduled';
};

const resolvePracticumSidebarState = (
  lecture: EnrollmentPracticumLecture | null,
): PracticumSidebarState | null => {
  if (!lecture) {
    return null;
  }

  const reservations = [...lecture.currentReservations].sort(
    (left, right) => Date.parse(right.startAt) - Date.parse(left.startAt),
  );
  const latestReservation = reservations[0] ?? null;

  if (!latestReservation) {
    return {
      label: lecture.eligible ? '예약 가능' : '예약 대기',
      tone: lecture.eligible ? 'cta' : 'noshow',
    };
  }

  const reservationKind = getPracticumReservationKind(latestReservation);
  if (reservationKind === 'noshow') {
    return {
      label: '불참',
      tone: 'noshow',
    };
  }
  if (reservationKind === 'completed') {
    return {
      label: '실습 완료',
      tone: 'completed',
    };
  }

  return {
    label: '예약 완료',
    tone: 'scheduled',
  };
};

const resolvePracticumLessonBadgeLabel = (
  lecture: EnrollmentPracticumLecture | null,
): string | null => {
  if (!lecture) {
    return null;
  }

  const reservations = [...lecture.currentReservations].sort(
    (left, right) => Date.parse(right.startAt) - Date.parse(left.startAt),
  );
  const latestReservation = reservations[0] ?? null;

  if (!latestReservation) {
    return lecture.eligible ? '예약 가능' : '예약 대기';
  }

  const reservationKind = getPracticumReservationKind(latestReservation);
  if (reservationKind === 'noshow') {
    return '불참';
  }
  if (reservationKind === 'completed') {
    return '실습 완료';
  }

  return `${formatPracticumSummaryDateTime(latestReservation.startAt)} 예약`;
};

const getPracticumDefaultMonthValue = (lecture: EnrollmentPracticumLecture | null) => {
  if (!lecture) {
    return toMonthValue(new Date());
  }

  const candidates = [
    ...lecture.slots.map((slot) => slot.startAt),
    ...lecture.currentReservations.map((reservation) => reservation.startAt),
  ]
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return toMonthValue(candidates[0] ?? new Date());
};

const getPracticumDefaultSelectedDate = (
  lecture: EnrollmentPracticumLecture | null,
  monthValue: string,
) => {
  if (!lecture) {
    return `${monthValue}-01`;
  }

  const firstReservedAt =
    lecture.currentReservation?.startAt ?? lecture.currentReservations[0]?.startAt;
  if (firstReservedAt) {
    return getSlotDateKey(firstReservedAt);
  }

  const firstOpenSlot = sortPracticumSlots(lecture.slots).find((slot) =>
    isPracticumSlotReservable(slot),
  );
  return firstOpenSlot ? getSlotDateKey(firstOpenSlot.startAt) : `${monthValue}-01`;
};

const getMonthYear = (monthValue: string): number => {
  return Number(monthValue.split('-')[0]);
};

const getMonthNumber = (monthValue: string): number => {
  return Number(monthValue.split('-')[1]);
};

const buildMonthValue = (year: number, month: number): string => {
  return `${String(year)}-${String(month).padStart(2, '0')}`;
};

const shiftMonthValue = (monthValue: string, offset: number): string => {
  const year = getMonthYear(monthValue);
  const month = getMonthNumber(monthValue);
  return toMonthValue(new Date(year, month - 1 + offset, 1));
};

const shiftMonthYear = (monthValue: string, offset: number): string => {
  return buildMonthValue(getMonthYear(monthValue) + offset, getMonthNumber(monthValue));
};

const buildFixedPlayerCalendarCells = (monthValue: string) => {
  const cells = buildCalendarCells(monthValue);

  return [
    ...cells,
    ...Array.from({ length: Math.max(0, FIXED_PLAYER_CALENDAR_CELL_COUNT - cells.length) }, () => ({
      date: null,
      isCurrentMonth: false,
    })),
  ];
};

const PlayerPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const params = useParams<{ enrollmentId: string; lessonId: string }>();
  const resolvedEnrollmentId = Number(params.enrollmentId ?? '');
  const isValidEnrollmentId = Number.isInteger(resolvedEnrollmentId) && resolvedEnrollmentId > 0;
  const playerSnapshotQuery = useMyLearningPlayerSnapshotQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId,
  );
  const snapshot = playerSnapshotQuery.data;
  const enrollmentState = snapshot?.enrollment;
  const lessons = useMemo(
    () => flattenLessons(snapshot?.curriculumTrack.sections ?? []),
    [snapshot?.curriculumTrack.sections],
  );
  const hasPracticumLesson = useMemo(() => {
    return lessons.some((lesson) => lesson.deliveryType === 'practicum');
  }, [lessons]);
  const playerItems = useMemo(
    () => flattenPlayerItems(snapshot?.curriculumTrack.sections ?? []),
    [snapshot?.curriculumTrack.sections],
  );
  const playbackDeviceId = useMemo(() => getOrCreatePlaybackDeviceId(), []);
  const completedStatusStyle = useMemo<LessonStatusStyle>(() => {
    return {
      '--lesson-check-icon': `url(${iconCheck})`,
    };
  }, []);
  const supportsHlsPlayback = Hls.isSupported();
  const [playbackErrorsByLessonId, setPlaybackErrorsByLessonId] = useState<
    Record<string, string | undefined>
  >({});
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_SPEED_OPTIONS)[number]>(1);
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>(DEFAULT_QUALITY_OPTIONS);
  const [selectedQualityLevel, setSelectedQualityLevel] = useState<number | 'auto'>('auto');
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel | null>(null);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('curriculum');
  const [activeQuizSidebarPanel, setActiveQuizSidebarPanel] =
    useState<QuizSidebarPanel>('curriculum');
  const [mediaDurationSeconds, setMediaDurationSeconds] = useState(0);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [arePlayerControlsVisible, setArePlayerControlsVisible] = useState(true);
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const [lessonProgressByLessonId, setLessonProgressByLessonId] = useState<
    Partial<Record<string, LearningPlayerLessonProgress>>
  >({});
  const [expandedCurriculumSectionIds, setExpandedCurriculumSectionIds] = useState<Set<string>>(
    new Set(),
  );
  const [quizAttemptedLessonIds, setQuizAttemptedLessonIds] = useState<Set<string>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number[]>>({});
  const [quizFlaggedQuestionIds, setQuizFlaggedQuestionIds] = useState<Set<number>>(new Set());
  const [quizCurrentQuestionIndex, setQuizCurrentQuestionIndex] = useState(0);
  const [isQuizQuestionListExpanded, setIsQuizQuestionListExpanded] = useState(true);
  const [quizClockAnchor, setQuizClockAnchor] = useState<QuizClockAnchor | null>(null);
  const [quizClockNowMs, setQuizClockNowMs] = useState(() => Date.now());
  const [quizElapsedSeconds, setQuizElapsedSeconds] = useState(0);
  const [quizAttemptResult, setQuizAttemptResult] = useState<StudentProblemAttemptResult | null>(
    null,
  );
  const [quizReviewMode, setQuizReviewMode] = useState(false);
  const [practicumMonthValue, setPracticumMonthValue] = useState(() => toMonthValue(new Date()));
  const [practicumSelectedDateValue, setPracticumSelectedDateValue] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [isPracticumMonthPickerOpen, setIsPracticumMonthPickerOpen] = useState(false);
  const [offlineCalendarMonthValue, setOfflineCalendarMonthValue] = useState(() =>
    toMonthValue(new Date()),
  );
  const [isOfflineMonthPickerOpen, setIsOfflineMonthPickerOpen] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const practicumMonthPickerRef = useRef<HTMLDivElement | null>(null);
  const offlineMonthPickerRef = useRef<HTMLDivElement | null>(null);
  const curriculumSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lastSavedProgressRef = useRef<Record<number, number>>({});
  const saveInFlightRef = useRef<Record<number, boolean>>({});
  const progressTimerRef = useRef<number | null>(null);
  const playerControlsHideTimerRef = useRef<number | null>(null);
  const quizElapsedTimerRef = useRef<number | null>(null);
  const quizSessionDirtyRef = useRef(false);
  const quizSessionSaveInFlightRef = useRef(false);
  const quizAutoSubmitTriggeredRef = useRef(false);
  const defaultPlayerItemId = getDefaultPlayerItemId(snapshot, playerItems);
  const resolvedItemId = playerItems.some((item) => item.id === params.lessonId)
    ? params.lessonId
    : defaultPlayerItemId;
  const selectedItem = resolvedItemId
    ? playerItems.find((item) => item.id === resolvedItemId) || null
    : null;
  const selectedLesson = selectedItem?.lesson ?? null;

  const clearPlayerControlsHideTimer = () => {
    if (playerControlsHideTimerRef.current !== null) {
      window.clearTimeout(playerControlsHideTimerRef.current);
      playerControlsHideTimerRef.current = null;
    }
  };

  const schedulePlayerControlsHide = () => {
    clearPlayerControlsHideTimer();

    if (!isVideoPlaying || activeSettingsPanel !== null) {
      return;
    }

    playerControlsHideTimerRef.current = window.setTimeout(() => {
      setArePlayerControlsVisible(false);
      playerControlsHideTimerRef.current = null;
    }, PLAYER_CONTROLS_AUTO_HIDE_MS);
  };

  const revealPlayerControls = () => {
    setArePlayerControlsVisible(true);
    schedulePlayerControlsHide();
  };
  const completedLessonIds = useMemo(() => {
    const lessonIds = new Set(snapshot?.completedLessonIds ?? []);
    Object.entries(lessonProgressByLessonId)
      .filter(([lessonId, progress]) => {
        if (progress?.completed !== true) {
          return false;
        }
        const lesson = lessons.find((item) => item.id === lessonId);
        return lesson?.deliveryType !== 'offline';
      })
      .forEach(([lessonId]) => {
        lessonIds.add(lessonId);
      });
    return lessonIds;
  }, [lessonProgressByLessonId, lessons, snapshot?.completedLessonIds]);
  const lockedLessonIds = useMemo(() => {
    return new Set<string>();
  }, []);
  const selectedSource = selectedLesson
    ? snapshot?.lessonPlaybackById[selectedLesson.id] || null
    : null;
  const selectedItemLocked = selectedLesson ? lockedLessonIds.has(selectedLesson.id) : false;
  const isQuizLesson = selectedLesson?.deliveryType === 'problem';
  const isPracticumLesson = selectedLesson?.deliveryType === 'practicum';
  const isResourceLesson = selectedLesson?.deliveryType === 'resource';
  const isQuizMode = Boolean(selectedItem) && isQuizLesson && !selectedItemLocked;
  const isLessonItem = selectedItem?.kind === 'lesson';
  const selectedLectureId = selectedSource?.lectureId ?? null;
  const selectedLessonProgress = selectedLesson
    ? (lessonProgressByLessonId[selectedLesson.id] ?? null)
    : null;
  const selectedLessonHasStream =
    isLessonItem && !selectedItemLocked && selectedSource?.mimeType === 'application/x-mpegURL';
  const shouldResumeCurrentLesson =
    isLessonItem &&
    !selectedItemLocked &&
    selectedLesson?.id === snapshot?.currentLessonId &&
    (snapshot?.resumeAtSeconds || 0) > 0;
  const totalLessonCount = lessons.length;
  const completedLessonCount = completedLessonIds.size;
  const completedRatio =
    totalLessonCount > 0 ? Math.round((completedLessonCount / totalLessonCount) * 100) : 0;
  const isUnsupportedPlayback = isLessonItem && selectedLessonHasStream && !supportsHlsPlayback;
  const curriculumPanelTitle =
    enrollmentState?.programTitle || snapshot?.curriculumTrack.title || '프로그램';
  const activeLectureId =
    enrollmentState?.active &&
    isLessonItem &&
    !selectedItemLocked &&
    selectedSource !== null &&
    selectedSource.mimeType === 'application/x-mpegURL'
      ? selectedSource.lectureId
      : null;
  const lectureStreamQuery = useQuery<ProtectedLectureStream>({
    queryKey: ['lecture-stream', activeLectureId, playbackDeviceId, getPlayerMockQueryKeySegment()],
    queryFn: () => fetchLectureStream(activeLectureId as number, playbackDeviceId),
    enabled: activeLectureId !== null && supportsHlsPlayback,
    retry: false,
  });
  const protectedStream = lectureStreamQuery.data ?? null;
  const quizQuery = useQuery<StudentProblem | null>({
    queryKey: ['student-problem', selectedLectureId],
    queryFn: () => fetchStudentProblem(selectedLectureId as number),
    enabled: selectedLectureId !== null && isQuizMode,
    retry: false,
  });
  const practicumOverviewQuery = useMyEnrollmentPracticumQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId && hasPracticumLesson,
  );
  const saveQuizSessionMutation = useMutation({
    mutationFn: ({
      payload,
      quizId,
    }: {
      quizId: number;
      payload: {
        answers: Record<number, number[]>;
        currentQuestionIndex: number;
        elapsedSeconds: number;
        flaggedQuestionIds: number[];
      };
    }) => saveStudentProblemSession(quizId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 풀이 상태를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
  });
  const applyQuizSession = useCallback(
    (session: NonNullable<StudentProblem['session']>) => {
      const nowMs = Date.now();
      const nextClockAnchor: QuizClockAnchor = {
        elapsedSeconds: session.elapsedSeconds,
        receivedAtMs: nowMs,
        remainingSeconds: session.remainingSeconds,
        startedAt: session.startedAt,
      };

      setQuizAnswers(session.answers);
      setQuizFlaggedQuestionIds(new Set(session.flaggedQuestionIds));
      setQuizCurrentQuestionIndex(
        clampQuestionIndex(session.currentQuestionIndex, quizQuery.data?.questions.length ?? 0),
      );
      setQuizClockAnchor(nextClockAnchor);
      setQuizClockNowMs(nowMs);
      setQuizElapsedSeconds(
        resolveQuizElapsedSeconds(
          nextClockAnchor,
          quizQuery.data?.timeLimitSeconds ?? selectedLesson?.problemTimeLimitSeconds ?? null,
          nowMs,
          session.elapsedSeconds,
        ),
      );
      setQuizAttemptResult(null);
      setQuizReviewMode(false);
      quizSessionDirtyRef.current = false;
      quizAutoSubmitTriggeredRef.current = false;
    },
    [
      quizQuery.data?.questions.length,
      quizQuery.data?.timeLimitSeconds,
      selectedLesson?.problemTimeLimitSeconds,
    ],
  );
  const startQuizSessionMutation = useMutation({
    mutationFn: (quizId: number) => startStudentProblemSession(quizId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 풀이를 시작하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (session) => {
      if (session.status === 'SUBMITTED') {
        setQuizClockAnchor(null);
        setQuizReviewMode(false);
        queryClient.setQueryData<StudentProblem | null>(
          ['student-problem', selectedLectureId],
          (current) => (current ? { ...current, session } : current),
        );
        showToast({
          message: '이미 제출한 문제입니다.',
          variant: 'info',
        });
        return;
      }

      applyQuizSession(session);
      queryClient.setQueryData<StudentProblem | null>(
        ['student-problem', selectedLectureId],
        (current) => (current ? { ...current, latestAttempt: null, session } : current),
      );
      showToast({
        message: '문제 풀이를 시작했습니다.',
        variant: 'success',
      });
    },
  });
  const submitQuizMutation = useMutation({
    mutationFn: ({
      answers,
      elapsedSeconds,
      quizId,
    }: {
      answers: Record<number, number[]>;
      elapsedSeconds: number;
      quizId: number;
    }) => submitStudentProblem(quizId, { answers, elapsedSeconds }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 제출에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (result) => {
      if (selectedLesson?.id) {
        setQuizAttemptedLessonIds((current) => new Set([...current, selectedLesson.id]));
      }
      quizSessionDirtyRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: myLearningPlayerQueryKey(resolvedEnrollmentId),
      });
      queryClient.setQueryData<StudentProblem | null>(
        ['student-problem', selectedLectureId],
        (current) =>
          current
            ? {
                ...current,
                latestAttempt: result,
                session: current.session
                  ? {
                      ...current.session,
                      answers: normalizeQuizAnswers(quizAnswers),
                      elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
                      remainingSeconds: 0,
                      status: 'SUBMITTED',
                    }
                  : current.session,
              }
            : current,
      );
      setQuizAttemptResult(result);
      setQuizReviewMode(false);
      showToast({
        message: result.passed ? '문제를 통과했습니다.' : '문제 제출을 완료했습니다.',
        variant: 'success',
      });
    },
  });
  const reservePracticumMutation = useMutation({
    mutationFn: ({ lectureId, slotId }: { lectureId: number; slotId: number }) =>
      reserveMyLecturePracticum(resolvedEnrollmentId, slotId, lectureId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약을 완료했습니다.',
        variant: 'success',
      });
    },
  });
  const cancelPracticumMutation = useMutation({
    mutationFn: (reservationId: number) =>
      cancelMyLecturePracticum(resolvedEnrollmentId, reservationId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약 취소에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약을 취소했습니다.',
        variant: 'success',
      });
    },
  });
  const movePracticumMutation = useMutation({
    mutationFn: ({ reservationId, slotId }: { reservationId: number; slotId: number }) =>
      moveMyLecturePracticum(resolvedEnrollmentId, reservationId, slotId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약 일정을 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약 일정을 변경했습니다.',
        variant: 'success',
      });
    },
  });
  const offlineAttendanceMutation = useMutation({
    mutationFn: ({ absent, ruleId }: { absent: boolean; ruleId: number }) =>
      updateMyOfflineScheduleAbsence(resolvedEnrollmentId, ruleId, absent),
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '오프라인 참석 상태를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: myLearningPlayerQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: variables.absent
          ? '오프라인 강의를 불참으로 표시했습니다.'
          : '불참 표시를 취소했습니다.',
        variant: 'success',
      });
    },
  });
  const streamLoading = lectureStreamQuery.isLoading;
  const streamErrorMessage = lectureStreamQuery.isError
    ? lectureStreamQuery.error instanceof Error
      ? lectureStreamQuery.error.message
      : '보호된 스트리밍 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
    : null;
  const playerError =
    (selectedLesson ? playbackErrorsByLessonId[selectedLesson.id] : null) || streamErrorMessage;
  const selectedQualityLabel =
    qualityOptions.find((quality) => quality.levelIndex === selectedQualityLevel)?.label || '자동';
  const playerDurationSeconds =
    mediaDurationSeconds > 0
      ? mediaDurationSeconds
      : Math.max(0, (selectedLesson?.durationMinutes ?? 0) * 60);
  const playerProgressRatio =
    playerDurationSeconds > 0
      ? Math.min(100, Math.max(0, (currentPlaybackSeconds / playerDurationSeconds) * 100))
      : 0;
  const qnaContext = snapshot?.qnaContext ?? null;
  const qnaProgramId = enrollmentState?.programId ?? qnaContext?.programId ?? null;
  const practicumLectures = useMemo(() => {
    return practicumOverviewQuery.data?.lectures ?? [];
  }, [practicumOverviewQuery.data?.lectures]);
  const selectedPracticumLecture =
    selectedLectureId === null
      ? null
      : (practicumLectures.find((lecture) => lecture.lectureId === selectedLectureId) ?? null);
  const practicumCurrentReservation = selectedPracticumLecture?.currentReservation ?? null;
  const practicumLectureByLectureId = useMemo(() => {
    return new Map(practicumLectures.map((lecture) => [lecture.lectureId, lecture]));
  }, [practicumLectures]);
  const selectedPracticumReservations = useMemo(() => {
    return selectedPracticumLecture?.currentReservations ?? [];
  }, [selectedPracticumLecture?.currentReservations]);
  const practicumReservationDateKeys = useMemo(() => {
    return new Set(
      selectedPracticumReservations.map((reservation) => getSlotDateKey(reservation.startAt)),
    );
  }, [selectedPracticumReservations]);
  const practicumReservationsByDate = useMemo(() => {
    const grouped = new Map<string, PracticumReservation[]>();

    selectedPracticumReservations.forEach((reservation) => {
      const dateKey = getSlotDateKey(reservation.startAt);
      const current = grouped.get(dateKey);
      if (current) {
        current.push(reservation);
      } else {
        grouped.set(dateKey, [reservation]);
      }
    });

    return grouped;
  }, [selectedPracticumReservations]);
  const practicumCalendarCells = useMemo(() => {
    return buildFixedPlayerCalendarCells(practicumMonthValue);
  }, [practicumMonthValue]);
  const practicumSlotsByDate = useMemo(() => {
    const grouped = new Map<string, PracticumSlot[]>();

    sortPracticumSlots(selectedPracticumLecture?.slots ?? []).forEach((slot) => {
      const dateKey = getSlotDateKey(slot.startAt);
      const current = grouped.get(dateKey);
      if (current) {
        current.push(slot);
      } else {
        grouped.set(dateKey, [slot]);
      }
    });

    return grouped;
  }, [selectedPracticumLecture]);
  const practicumSelectedDate = practicumSelectedDateValue.startsWith(practicumMonthValue)
    ? practicumSelectedDateValue
    : `${practicumMonthValue}-01`;
  const practicumSelectedDateSlots = practicumSlotsByDate.get(practicumSelectedDate) ?? [];
  const updatePracticumMonth = useCallback((nextMonthValue: string) => {
    setPracticumMonthValue(nextMonthValue);
    setPracticumSelectedDateValue((current) =>
      current.startsWith(nextMonthValue) ? current : `${nextMonthValue}-01`,
    );
  }, []);
  const updateOfflineMonth = useCallback((nextMonthValue: string) => {
    setOfflineCalendarMonthValue(nextMonthValue);
  }, []);
  const practicumSidebarStatesByLessonId = useMemo(() => {
    const entries = lessons
      .filter((lesson) => lesson.deliveryType === 'practicum')
      .map((lesson) => {
        const lectureId =
          snapshot?.lessonPlaybackById[lesson.id]?.lectureId ?? lesson.lectureId ?? null;
        const sidebarState =
          lectureId === null
            ? null
            : resolvePracticumSidebarState(practicumLectureByLectureId.get(lectureId) ?? null);
        return [lesson.id, sidebarState] as const;
      });

    return new Map(entries);
  }, [lessons, practicumLectureByLectureId, snapshot?.lessonPlaybackById]);
  const isOfflineLesson = selectedLesson?.deliveryType === 'offline';
  const lessonResourceAttachments = selectedLesson
    ? (snapshot?.resourceAttachmentsByLessonId?.[selectedLesson.id] ?? [])
    : [];
  const offlineScheduleEntries = useMemo(
    () => buildOfflineScheduleEntries(selectedLesson),
    [selectedLesson],
  );
  const offlineScheduleEntriesByDate = useMemo(() => {
    const grouped = new Map<string, OfflineScheduleEntry[]>();

    offlineScheduleEntries.forEach((entry) => {
      if (!entry.date) {
        return;
      }

      const current = grouped.get(entry.date);

      if (current) {
        current.push(entry);
      } else {
        grouped.set(entry.date, [entry]);
      }
    });

    return grouped;
  }, [offlineScheduleEntries]);
  const firstOfflineDate =
    offlineScheduleEntries.find((entry) => entry.date)?.date ?? selectedLesson?.startDate ?? null;
  const offlineCalendarCells = useMemo(() => {
    return buildFixedPlayerCalendarCells(offlineCalendarMonthValue);
  }, [offlineCalendarMonthValue]);

  useEffect(() => {
    if (!selectedPracticumLecture) {
      return;
    }

    const defaultMonthValue = getPracticumDefaultMonthValue(selectedPracticumLecture);
    setPracticumMonthValue(defaultMonthValue);
    setPracticumSelectedDateValue(
      getPracticumDefaultSelectedDate(selectedPracticumLecture, defaultMonthValue),
    );
  }, [selectedPracticumLecture]);

  useEffect(() => {
    if (!isOfflineLesson) {
      return;
    }

    setOfflineCalendarMonthValue(
      firstOfflineDate ? firstOfflineDate.slice(0, 7) : toMonthValue(new Date()),
    );
    setIsOfflineMonthPickerOpen(false);
  }, [firstOfflineDate, isOfflineLesson, selectedLesson?.id]);

  const quizQuestions = quizQuery.data?.questions ?? [];
  const quizTimeLimitSeconds =
    quizQuery.data?.timeLimitSeconds ?? selectedLesson?.problemTimeLimitSeconds ?? null;
  const quizEffectiveElapsedSeconds = resolveQuizElapsedSeconds(
    quizClockAnchor,
    quizTimeLimitSeconds,
    quizClockNowMs,
    quizElapsedSeconds,
  );
  const quizRemainingSeconds =
    quizTimeLimitSeconds && quizTimeLimitSeconds > 0
      ? Math.max(0, quizTimeLimitSeconds - quizEffectiveElapsedSeconds)
      : null;
  const resolvedQuizQuestionIndex = clampQuestionIndex(
    quizCurrentQuestionIndex,
    quizQuestions.length,
  );
  const currentQuizQuestion = quizQuestions[resolvedQuizQuestionIndex] ?? null;
  const quizRemainingTimeLabel =
    quizRemainingSeconds !== null ? formatSeconds(quizRemainingSeconds) : '없음';
  const quizSessionStatus = quizClockAnchor
    ? 'IN_PROGRESS'
    : (quizQuery.data?.session?.status ?? null);
  const isQuizSessionActive = quizSessionStatus === 'IN_PROGRESS' && !quizAttemptResult;
  const shouldShowQuizStartPrompt =
    Boolean(quizQuery.data) &&
    !quizQuery.data?.session &&
    !quizQuery.data?.latestAttempt &&
    !quizAttemptResult;
  const shouldShowSubmittedWithoutResult =
    quizQuery.data?.session?.status === 'SUBMITTED' && !quizAttemptResult;
  const shouldShowQuizQuestion =
    Boolean(currentQuizQuestion) &&
    (isQuizSessionActive || Boolean(quizAttemptResult && quizReviewMode));
  const shouldShowQuizQuestionNavigator =
    isQuizQuestionListExpanded && Boolean(isQuizSessionActive || quizAttemptResult);
  const shouldShowQuizNavigatorEmptyText =
    isQuizQuestionListExpanded && !isQuizSessionActive && !quizAttemptResult;
  const currentQuizResult = currentQuizQuestion
    ? (quizAttemptResult?.results.find((result) => result.questionId === currentQuizQuestion.id) ??
      null)
    : null;

  const persistProgress = useEffectEvent(
    async (
      nextWatchedSeconds: number,
      force = false,
      minDeltaSeconds = PROGRESS_SAVE_MIN_DELTA_SECONDS,
    ) => {
      if (!selectedSource || !selectedLesson || !isValidEnrollmentId || !selectedLessonHasStream) {
        return;
      }

      const lectureId = selectedSource.lectureId;
      const lessonId = selectedLesson.id;
      const normalizedSeconds = Math.max(0, Math.floor(nextWatchedSeconds));
      const lastSavedSeconds = lastSavedProgressRef.current[lectureId] ?? 0;

      if (!force && normalizedSeconds < lastSavedSeconds + minDeltaSeconds) {
        return;
      }
      if (saveInFlightRef.current[lectureId]) {
        return;
      }

      saveInFlightRef.current[lectureId] = true;
      try {
        const response = await saveLectureProgress(
          resolvedEnrollmentId,
          lectureId,
          normalizedSeconds,
        );
        lastSavedProgressRef.current[lectureId] = response.watchedSeconds;
        setLessonProgressByLessonId((previous) => {
          const fallbackDurationSeconds =
            mediaDurationSeconds > 0
              ? mediaDurationSeconds
              : Math.max(0, (selectedLesson.durationMinutes ?? 0) * 60);
          const progressPercent = response.completed
            ? 100
            : fallbackDurationSeconds > 0
              ? Math.min(100, Math.round((response.watchedSeconds / fallbackDurationSeconds) * 100))
              : previous[lessonId]?.progressPercent || 0;

          return {
            ...previous,
            [lessonId]: {
              completed: response.completed,
              completedAt: response.completedAt,
              lastWatchedAt: response.lastWatchedAt,
              lectureId,
              progressPercent,
              watchedSeconds: response.watchedSeconds,
            },
          };
        });
        setProgressSaveError(null);
      } catch (error) {
        if (error instanceof Error) {
          setProgressSaveError(error.message);
        } else {
          setProgressSaveError('학습 진도를 저장하지 못했습니다.');
        }
      } finally {
        saveInFlightRef.current[lectureId] = false;
      }
    },
  );

  const queueProgressBeacon = useEffectEvent((nextWatchedSeconds: number) => {
    if (!selectedSource || !isValidEnrollmentId || !selectedLessonHasStream) {
      return false;
    }

    const lectureId = selectedSource.lectureId;
    const normalizedSeconds = Math.max(0, Math.floor(nextWatchedSeconds));
    const lastSavedSeconds = lastSavedProgressRef.current[lectureId] ?? 0;

    if (normalizedSeconds < lastSavedSeconds + PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS) {
      return false;
    }

    const queued = sendLectureProgressBeacon(resolvedEnrollmentId, lectureId, normalizedSeconds);

    if (queued) {
      lastSavedProgressRef.current[lectureId] = normalizedSeconds;
      setProgressSaveError(null);
    }

    return queued;
  });

  const persistQuizSession = useEffectEvent(async (force = false) => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    if (quizRemainingSeconds === 0) {
      return;
    }

    if (!force && !quizSessionDirtyRef.current) {
      return;
    }

    if (quizSessionSaveInFlightRef.current) {
      return;
    }

    quizSessionSaveInFlightRef.current = true;

    try {
      await saveQuizSessionMutation.mutateAsync({
        payload: {
          answers: normalizeQuizAnswers(quizAnswers),
          currentQuestionIndex: clampQuestionIndex(
            quizCurrentQuestionIndex,
            quizQuery.data.questions.length,
          ),
          elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
          flaggedQuestionIds: [...quizFlaggedQuestionIds].sort((left, right) => left - right),
        },
        quizId: quizQuery.data.id,
      });
      quizSessionDirtyRef.current = false;
    } finally {
      quizSessionSaveInFlightRef.current = false;
    }
  });

  useEffect(() => {
    const initialProgress: Record<number, number> = {};
    Object.values(snapshot?.lessonProgressByLessonId ?? {}).forEach((progress) => {
      initialProgress[progress.lectureId] = progress.watchedSeconds;
    });
    lastSavedProgressRef.current = initialProgress;
    setLessonProgressByLessonId(snapshot?.lessonProgressByLessonId ?? {});
  }, [snapshot?.lessonProgressByLessonId]);

  useEffect(() => {
    const nextAttemptedLessonIds = new Set<string>();

    snapshot?.curriculumTrack.sections.forEach((section) => {
      section.lessons.forEach((lesson) => {
        if (lesson.problemAttempted ?? lesson.quizAttempted) {
          nextAttemptedLessonIds.add(lesson.id);
        }
      });
    });

    setQuizAttemptedLessonIds(nextAttemptedLessonIds);
  }, [snapshot?.curriculumTrack.sections]);

  useEffect(() => {
    setQuizAnswers({});
    setQuizFlaggedQuestionIds(new Set());
    setQuizCurrentQuestionIndex(0);
    setIsQuizQuestionListExpanded(true);
    setQuizClockAnchor(null);
    setQuizClockNowMs(Date.now());
    setQuizElapsedSeconds(0);
    quizSessionDirtyRef.current = false;
    quizAutoSubmitTriggeredRef.current = false;
    setQuizAttemptResult(null);
    setQuizReviewMode(false);
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!quizQuery.data || !isQuizMode) {
      return;
    }

    const session = quizQuery.data.session;
    if (session?.status === 'IN_PROGRESS') {
      applyQuizSession(session);
      return;
    }

    const latestAttempt = quizQuery.data.latestAttempt ?? null;
    const submittedAnswers =
      latestAttempt?.results.reduce<Record<number, number[]>>((answers, result) => {
        answers[result.questionId] = result.submittedOptionIds;
        return answers;
      }, {}) ?? {};
    setQuizAnswers(session?.answers ?? submittedAnswers);
    setQuizFlaggedQuestionIds(new Set(session?.flaggedQuestionIds ?? []));
    setQuizCurrentQuestionIndex(
      clampQuestionIndex(session?.currentQuestionIndex ?? 0, quizQuery.data.questions.length),
    );
    setQuizClockAnchor(null);
    setQuizClockNowMs(Date.now());
    setQuizElapsedSeconds(session?.elapsedSeconds ?? 0);
    setQuizAttemptResult(latestAttempt);
    setQuizReviewMode(false);
    quizSessionDirtyRef.current = false;
    quizAutoSubmitTriggeredRef.current = false;
  }, [applyQuizSession, isQuizMode, quizQuery.data]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    const updateQuizClock = () => {
      const nowMs = Date.now();
      setQuizClockNowMs(nowMs);
      setQuizElapsedSeconds((current) =>
        resolveQuizElapsedSeconds(quizClockAnchor, quizTimeLimitSeconds, nowMs, current),
      );
    };

    updateQuizClock();
    const timerId = window.setInterval(updateQuizClock, 1000);
    quizElapsedTimerRef.current = timerId;

    return () => {
      window.clearInterval(timerId);
      quizElapsedTimerRef.current = null;
    };
  }, [isQuizMode, isQuizSessionActive, quizClockAnchor, quizQuery.data, quizTimeLimitSeconds]);

  useEffect(() => {
    if (
      !isQuizMode ||
      !quizQuery.data ||
      !isQuizSessionActive ||
      submitQuizMutation.isPending ||
      quizRemainingSeconds !== 0 ||
      quizAutoSubmitTriggeredRef.current
    ) {
      return;
    }

    quizAutoSubmitTriggeredRef.current = true;
    submitQuizMutation.mutate({
      answers: normalizeQuizAnswers(quizAnswers),
      elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
      quizId: quizQuery.data.id,
    });
  }, [
    isQuizMode,
    isQuizSessionActive,
    quizAnswers,
    quizEffectiveElapsedSeconds,
    quizQuery.data,
    quizRemainingSeconds,
    submitQuizMutation,
  ]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void persistQuizSession(true);
    }, PROBLEM_SESSION_SAVE_INTERVAL_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isQuizMode, isQuizSessionActive, quizQuery.data]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistQuizSession();
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isQuizMode,
    quizAnswers,
    quizCurrentQuestionIndex,
    quizFlaggedQuestionIds,
    isQuizSessionActive,
    quizQuery.data,
  ]);

  useEffect(() => {
    if (!isQuizMode || !quizQuery.data || !isQuizSessionActive) {
      return;
    }

    const flushQuizSession = () => {
      void persistQuizSession(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushQuizSession();
      }
    };

    window.addEventListener('pagehide', flushQuizSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushQuizSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isQuizMode, isQuizSessionActive, quizQuery.data]);

  useEffect(() => {
    setProgressSaveError(null);
    setMediaDurationSeconds(0);
    setCurrentPlaybackSeconds(0);
    setIsVideoPlaying(false);
    if (!selectedSource || !selectedLessonHasStream) {
      return;
    }
  }, [selectedLessonHasStream, selectedSource]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.playbackRate = playbackRate;
  }, [playbackRate, selectedLesson?.id, protectedStream?.hlsUrl]);

  useEffect(() => {
    setActiveSettingsPanel(null);
  }, [selectedLesson?.id]);

  useEffect(() => {
    setActiveSidebarPanel('curriculum');
  }, [selectedItem?.id]);

  useEffect(() => {
    setExpandedCurriculumSectionIds(
      new Set(snapshot?.curriculumTrack.sections.map((section) => section.id) ?? []),
    );
  }, [snapshot?.curriculumTrack.sections]);

  const toggleCurriculumSection = useCallback(
    (sectionId: string) => {
      const willOpen = !expandedCurriculumSectionIds.has(sectionId);

      setExpandedCurriculumSectionIds((current) => {
        const next = new Set(current);

        if (next.has(sectionId)) {
          next.delete(sectionId);
        } else {
          next.add(sectionId);
        }

        return next;
      });

      if (willOpen) {
        window.setTimeout(() => {
          curriculumSectionRefs.current[sectionId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }, 180);
      }
    },
    [expandedCurriculumSectionIds],
  );

  useEffect(() => {
    if (!activeSettingsPanel) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsPanelRef.current?.contains(event.target as Node)) {
        setActiveSettingsPanel(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveSettingsPanel(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeSettingsPanel]);

  useEffect(() => {
    if (!isPracticumMonthPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!practicumMonthPickerRef.current?.contains(event.target as Node)) {
        setIsPracticumMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPracticumMonthPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPracticumMonthPickerOpen]);

  useEffect(() => {
    if (!isOfflineMonthPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!offlineMonthPickerRef.current?.contains(event.target as Node)) {
        setIsOfflineMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOfflineMonthPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOfflineMonthPickerOpen]);

  useEffect(() => {
    if (
      isValidEnrollmentId &&
      snapshot &&
      playerItems.length > 0 &&
      params.lessonId !== resolvedItemId
    ) {
      void navigate(routePaths.learningLesson(String(resolvedEnrollmentId), resolvedItemId || ''), {
        replace: true,
      });
    }
  }, [
    isValidEnrollmentId,
    playerItems.length,
    navigate,
    params.lessonId,
    resolvedEnrollmentId,
    resolvedItemId,
    snapshot,
  ]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const playbackSessionToken = protectedStream?.playbackSessionToken ?? '';
    const selectedHlsKeyUrl = protectedStream?.hlsKeyUrl ?? '';
    const selectedStreamUrl = protectedStream?.hlsUrl ?? '';
    const playbackRequestPrefix = buildPlaybackRequestPrefix(selectedStreamUrl);

    setQualityOptions(DEFAULT_QUALITY_OPTIONS);
    setSelectedQualityLevel('auto');
    hlsRef.current = null;

    if (!videoElement || !selectedStreamUrl || !supportsHlsPlayback || !selectedLessonHasStream) {
      return;
    }

    let hls: Hls | null = null;

    const syncResumeTime = () => {
      if (!shouldResumeCurrentLesson) {
        return;
      }

      try {
        videoElement.currentTime = snapshot?.resumeAtSeconds || 0;
      } catch {
        // currentTime은 메타데이터 준비 전 실패할 수 있으므로 조용히 무시합니다.
      }
    };

    const handleLoadedMetadata = () => {
      setMediaDurationSeconds(
        Number.isFinite(videoElement.duration) && videoElement.duration > 0
          ? Math.round(videoElement.duration)
          : 0,
      );
      syncResumeTime();
      setCurrentPlaybackSeconds(videoElement.currentTime || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentPlaybackSeconds(videoElement.currentTime || 0);
    };

    const handleVolumeChange = () => {
      setIsVideoMuted(videoElement.muted || videoElement.volume === 0);
    };

    const clearProgressTimer = () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    const scheduleProgressTimer = () => {
      clearProgressTimer();
      progressTimerRef.current = window.setInterval(() => {
        if (videoElement.paused || videoElement.ended) {
          return;
        }
        void persistProgress(videoElement.currentTime || 0);
      }, PROGRESS_SAVE_INTERVAL_SECONDS * 1000);
    };

    const flushProgress = () => {
      if (!queueProgressBeacon(videoElement.currentTime || 0)) {
        void persistProgress(
          videoElement.currentTime || 0,
          false,
          PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS,
        );
      }
    };

    const handlePause = () => {
      clearProgressTimer();
      setIsVideoPlaying(false);
      setArePlayerControlsVisible(true);
    };

    const handlePlay = () => {
      setIsVideoPlaying(true);
      scheduleProgressTimer();
    };

    const handleEnded = () => {
      clearProgressTimer();
      setIsVideoPlaying(false);
      const durationSeconds =
        Number.isFinite(videoElement.duration) && videoElement.duration > 0
          ? videoElement.duration
          : videoElement.currentTime || 0;
      void persistProgress(durationSeconds, true);
    };

    const handlePageHide = () => {
      flushProgress();
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    window.addEventListener('pagehide', handlePageHide);
    handleVolumeChange();

    const ProtectedLoader = createProtectedHlsLoader(selectedHlsKeyUrl);
    hls = new Hls({
      enableWorker: true,
      loader: ProtectedLoader,
      xhrSetup: (xhr, url) => {
        xhr.withCredentials = true;

        const isKeyRequest = url === selectedHlsKeyUrl;
        const isProtectedPlaybackRequest =
          playbackRequestPrefix !== null && url.startsWith(playbackRequestPrefix);

        if (isKeyRequest || isProtectedPlaybackRequest) {
          xhr.setRequestHeader('X-Playback-Session-Token', playbackSessionToken);
          xhr.setRequestHeader('X-Playback-Device-Id', playbackDeviceId);
        }
      },
    });
    hlsRef.current = hls;
    hls.loadSource(selectedStreamUrl);
    hls.attachMedia(videoElement);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setQualityOptions(buildQualityOptions(hls.levels));
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal && selectedLesson) {
        setPlaybackErrorsByLessonId((previous) => ({
          ...previous,
          [selectedLesson.id]: '스트리밍을 재생하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        }));
      }
    });

    return () => {
      clearProgressTimer();
      flushProgress();
      hlsRef.current = null;
      videoElement.removeAttribute('src');
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
      window.removeEventListener('pagehide', handlePageHide);
      hls.destroy();
    };
  }, [
    isValidEnrollmentId,
    playbackDeviceId,
    protectedStream,
    protectedStream?.hlsKeyUrl,
    protectedStream?.hlsUrl,
    protectedStream?.playbackSessionToken,
    resolvedEnrollmentId,
    selectedLesson,
    shouldResumeCurrentLesson,
    snapshot,
    supportsHlsPlayback,
    selectedLessonHasStream,
  ]);

  useEffect(() => {
    if (!selectedLessonHasStream) {
      clearPlayerControlsHideTimer();
      setArePlayerControlsVisible(true);
      return;
    }

    if (!isVideoPlaying || activeSettingsPanel !== null) {
      clearPlayerControlsHideTimer();
      setArePlayerControlsVisible(true);
      return;
    }

    setArePlayerControlsVisible(true);
    schedulePlayerControlsHide();

    return clearPlayerControlsHideTimer;
  }, [activeSettingsPanel, isVideoPlaying, selectedLessonHasStream]);

  const isLoading = playerSnapshotQuery.isLoading;
  const hasError = playerSnapshotQuery.isError;
  const errorMessage =
    playerSnapshotQuery.error instanceof Error
      ? playerSnapshotQuery.error.message
      : '온라인 수강 정보를 불러오지 못했습니다.';
  const isPlaybackBlocked =
    !enrollmentState || !enrollmentState.active || lessons.length === 0 || !selectedItem;

  const applyPlaybackRate = (nextPlaybackRate: (typeof PLAYBACK_SPEED_OPTIONS)[number]) => {
    setPlaybackRate(nextPlaybackRate);
  };

  const applyQualityLevel = (levelIndex: number | 'auto') => {
    setSelectedQualityLevel(levelIndex);

    if (!hlsRef.current) {
      return;
    }

    if (levelIndex === 'auto') {
      hlsRef.current.loadLevel = -1;
      hlsRef.current.nextLevel = -1;
      return;
    }

    hlsRef.current.loadLevel = levelIndex;
    hlsRef.current.nextLevel = levelIndex;
  };

  const togglePlayback = () => {
    const videoElement = videoRef.current;

    if (!videoElement || !selectedLessonHasStream) {
      return;
    }

    if (videoElement.paused || videoElement.ended) {
      void videoElement.play();
      return;
    }

    videoElement.pause();
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;

    if (!videoElement || !selectedLessonHasStream) {
      return;
    }

    videoElement.muted = !videoElement.muted;
    setIsVideoMuted(videoElement.muted || videoElement.volume === 0);
    revealPlayerControls();
  };

  const handlePlayerFrameKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ' && event.code !== 'Space') {
      return;
    }

    const eventTarget = event.target;

    if (
      eventTarget instanceof HTMLElement &&
      eventTarget.closest('button, a, input, select, textarea')
    ) {
      return;
    }

    event.preventDefault();
    revealPlayerControls();
    togglePlayback();
  };

  const handlePlayerFrameClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const eventTarget = event.target;

    if (
      eventTarget instanceof HTMLElement &&
      eventTarget.closest('button, a, input, select, textarea, [role="dialog"]')
    ) {
      return;
    }

    revealPlayerControls();
    togglePlayback();
  };

  const requestPlayerFullscreen = () => {
    const videoElement = videoRef.current;

    if (!videoElement?.parentElement?.requestFullscreen) {
      return;
    }

    void videoElement.parentElement.requestFullscreen();
  };

  const updateQuizAnswer = (
    questionId: number,
    optionId: number,
    questionType: StudentProblem['questions'][number]['questionType'],
  ) => {
    quizSessionDirtyRef.current = true;
    setQuizFlaggedQuestionIds((current) => {
      if (!current.has(questionId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(questionId);
      return next;
    });
    setQuizAnswers((current) => {
      if (questionType === 'MULTIPLE') {
        const currentOptionIds = current[questionId] ?? [];
        const nextOptionIds = currentOptionIds.includes(optionId)
          ? currentOptionIds.filter((currentOptionId) => currentOptionId !== optionId)
          : [...currentOptionIds, optionId];

        return {
          ...current,
          [questionId]: nextOptionIds,
        };
      }

      return {
        ...current,
        [questionId]: [optionId],
      };
    });
  };

  const moveToQuizQuestion = (nextQuestionIndex: number) => {
    const questionCount = quizQuery.data?.questions.length ?? 0;
    if (isQuizSessionActive) {
      quizSessionDirtyRef.current = true;
    }
    setQuizCurrentQuestionIndex(clampQuestionIndex(nextQuestionIndex, questionCount));
  };

  const setQuizFlaggedQuestion = (questionId: number, flagged: boolean) => {
    quizSessionDirtyRef.current = true;
    setIsQuizQuestionListExpanded(true);
    if (flagged) {
      setQuizAnswers((current) => ({
        ...current,
        [questionId]: [],
      }));
    }
    setQuizFlaggedQuestionIds((current) => {
      const next = new Set(current);
      if (flagged) {
        next.add(questionId);
      } else {
        next.delete(questionId);
      }
      return next;
    });
  };

  const handleQuizStart = () => {
    const problem = quizQuery.data;
    if (!problem || startQuizSessionMutation.isPending) {
      return;
    }

    startQuizSessionMutation.mutate(problem.id);
  };

  const handleQuizSubmit = () => {
    const problem = quizQuery.data;
    if (!problem) {
      return;
    }

    if (quizRemainingSeconds === 0) {
      showToast({
        message: '제한시간이 종료되어 제출할 수 없습니다.',
        variant: 'error',
      });
      return;
    }

    const unansweredQuestion = problem.questions.find((question) => {
      return (quizAnswers[question.id] ?? []).length === 0;
    });

    if (unansweredQuestion) {
      showToast({
        message: '모든 문항에 답을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    submitQuizMutation.mutate({
      answers: normalizeQuizAnswers(quizAnswers),
      elapsedSeconds: Math.max(0, quizEffectiveElapsedSeconds),
      quizId: problem.id,
    });
  };

  const renderQuizMedia = (
    mediaType: StudentProblem['questions'][number]['mediaType'],
    mediaPreviewUrl: string | null | undefined,
    mediaUrl: string | null,
    alt: string,
    className: string,
  ) => {
    const resolvedMediaUrl = mediaPreviewUrl || mediaUrl;

    if (!mediaType || !resolvedMediaUrl) {
      return null;
    }

    if (mediaType === 'VIDEO') {
      return (
        <video className={className} controls preload='metadata'>
          <source src={resolvedMediaUrl} />
        </video>
      );
    }

    return <img alt={alt} className={className} src={resolvedMediaUrl} />;
  };

  const renderPracticumPanel = () => {
    if (!isPracticumLesson) {
      return null;
    }

    const practicumSidebarState = resolvePracticumSidebarState(selectedPracticumLecture);
    const currentReservationKind = practicumCurrentReservation
      ? getPracticumReservationKind(practicumCurrentReservation)
      : null;
    const activeScheduledReservation =
      practicumCurrentReservation && currentReservationKind === 'scheduled'
        ? practicumCurrentReservation
        : null;
    const isPracticumMutationPending =
      reservePracticumMutation.isPending ||
      cancelPracticumMutation.isPending ||
      movePracticumMutation.isPending;

    return (
      <section className={styles['notesPanel']}>
        <div className={styles['notesHeader']}>
          <div className={styles['stageCopy']}>
            <p className={styles['stageEyebrow']}>PRACTICUM</p>
            <h2 className={styles['workspaceTitle']}>
              {selectedPracticumLecture?.lectureTitle ?? selectedLesson?.title ?? '실습 예약'}
            </h2>
            <p className={styles['quizDescription']}>
              운영 일정과 오프라인 강의를 반영한 시간만 달력에 노출합니다.
            </p>
          </div>
          <span className={styles['summaryChip']}>
            {practicumSidebarState?.label ?? '예약 확인'}
          </span>
        </div>

        {practicumOverviewQuery.isLoading ? (
          <p className={styles['notesHint']}>실습 예약 정보를 불러오는 중입니다.</p>
        ) : null}

        {practicumOverviewQuery.isError ? (
          <p className={styles['errorText']}>
            {practicumOverviewQuery.error instanceof Error
              ? practicumOverviewQuery.error.message
              : '실습 예약 정보를 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!practicumOverviewQuery.isLoading &&
        !practicumOverviewQuery.isError &&
        selectedLectureId === null ? (
          <p className={styles['notesHint']}>실습 강의 정보를 아직 연결하지 못했습니다.</p>
        ) : null}

        {!practicumOverviewQuery.isLoading &&
        !practicumOverviewQuery.isError &&
        selectedPracticumLecture ? (
          <div className={styles['practicumWorkspace']}>
            <section className={styles['practicumCalendarPanel']}>
              <div className={styles['practicumCalendarHeader']}>
                <div className={styles['practicumMonthPicker']} ref={practicumMonthPickerRef}>
                  <button
                    aria-label='이전 달'
                    className={styles['practicumMonthNavButton']}
                    onClick={() => {
                      updatePracticumMonth(shiftMonthValue(practicumMonthValue, -1));
                    }}
                    type='button'
                  >
                    ‹
                  </button>
                  <button
                    aria-expanded={isPracticumMonthPickerOpen}
                    className={styles['practicumMonthTrigger']}
                    onClick={() => {
                      setIsPracticumMonthPickerOpen((current) => !current);
                    }}
                    type='button'
                  >
                    {formatMonthLabel(practicumMonthValue)}
                  </button>
                  <button
                    aria-label='다음 달'
                    className={styles['practicumMonthNavButton']}
                    onClick={() => {
                      updatePracticumMonth(shiftMonthValue(practicumMonthValue, 1));
                    }}
                    type='button'
                  >
                    ›
                  </button>

                  {isPracticumMonthPickerOpen ? (
                    <div className={styles['practicumMonthPopover']} role='dialog'>
                      <div className={styles['practicumMonthPopoverHeader']}>
                        <button
                          aria-label='이전 연도'
                          className={styles['practicumMonthYearButton']}
                          onClick={() => {
                            updatePracticumMonth(shiftMonthYear(practicumMonthValue, -1));
                          }}
                          type='button'
                        >
                          ‹
                        </button>
                        <strong>{`${String(getMonthYear(practicumMonthValue))}년`}</strong>
                        <button
                          aria-label='다음 연도'
                          className={styles['practicumMonthYearButton']}
                          onClick={() => {
                            updatePracticumMonth(shiftMonthYear(practicumMonthValue, 1));
                          }}
                          type='button'
                        >
                          ›
                        </button>
                      </div>
                      <div className={styles['practicumMonthGrid']}>
                        {MONTH_OPTIONS.map((month) => {
                          const monthValue = buildMonthValue(
                            getMonthYear(practicumMonthValue),
                            month,
                          );

                          return (
                            <button
                              className={styles['practicumMonthOption']}
                              data-selected={monthValue === practicumMonthValue}
                              key={month}
                              onClick={() => {
                                updatePracticumMonth(monthValue);
                                setIsPracticumMonthPickerOpen(false);
                              }}
                              type='button'
                            >
                              {`${String(month)}월`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={styles['practicumCalendarLegend']} aria-label='실습 예약 상태'>
                  <span data-tone='available'>예약가능</span>
                  <span data-tone='reserved'>예약됨</span>
                  <span data-tone='absent'>불참</span>
                  <span data-tone='disabled'>예약불가</span>
                </div>
              </div>

              <div className={styles['practicumCalendarWeekdays']}>
                {calendarWeekdays.map((weekday) => (
                  <span className={styles['practicumCalendarWeekday']} key={weekday}>
                    {weekday}
                  </span>
                ))}
              </div>

              <div className={styles['practicumCalendarGrid']}>
                {practicumCalendarCells.map((cell, index) => {
                  if (!cell.date) {
                    return (
                      <div
                        className={styles['practicumCalendarEmptyCell']}
                        key={`practicum-empty-${String(index)}`}
                      />
                    );
                  }

                  const date = cell.date;
                  const daySlots = practicumSlotsByDate.get(date) ?? [];
                  const dayReservations = practicumReservationsByDate.get(date) ?? [];
                  const availableCount = daySlots.filter((slot) =>
                    isPracticumSlotReservable(slot),
                  ).length;
                  const previewReservation = [...dayReservations].sort(
                    (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt),
                  )[0];
                  const hasNoShowReservation = dayReservations.some(
                    (reservation) => reservation.status === 'NO_SHOW',
                  );
                  const dayStatus = previewReservation
                    ? hasNoShowReservation
                      ? 'absent'
                      : 'reserved'
                    : availableCount > 0
                      ? 'available'
                      : daySlots.length > 0
                        ? 'disabled'
                        : 'empty';

                  return (
                    <button
                      className={styles['practicumCalendarDay']}
                      data-has-items={availableCount > 0 || dayReservations.length > 0}
                      data-reserved={practicumReservationDateKeys.has(date)}
                      data-selected={date === practicumSelectedDate}
                      data-status={dayStatus}
                      key={date}
                      onClick={() => {
                        setPracticumSelectedDateValue(date);
                      }}
                      type='button'
                    >
                      <div className={styles['practicumCalendarDayHeader']}>
                        <span className={styles['practicumCalendarDayNumber']}>
                          {Number(date.split('-')[2])}
                        </span>
                        {previewReservation ? (
                          <span className={styles['practicumCalendarDayReservation']}>
                            {hasNoShowReservation ? '불참' : '예약됨'}
                          </span>
                        ) : availableCount ? (
                          <span className={styles['practicumCalendarDayCount']}>
                            {`${String(availableCount)}개 가능`}
                          </span>
                        ) : daySlots.length ? (
                          <span className={styles['practicumCalendarDayUnavailable']}>
                            예약불가
                          </span>
                        ) : null}
                      </div>

                      <div className={styles['practicumCalendarPreviewList']}>
                        {previewReservation ? (
                          <span className={styles['practicumCalendarPreviewReserved']}>
                            {formatTimeRange(previewReservation.startAt, previewReservation.endAt)}
                          </span>
                        ) : availableCount ? (
                          <span className={styles['practicumCalendarPreviewOpen']}>
                            {formatTimeRange(daySlots[0].startAt, daySlots[0].endAt)}
                          </span>
                        ) : daySlots.length ? (
                          <span className={styles['practicumCalendarPreviewUnavailable']}>
                            {formatTimeRange(daySlots[0].startAt, daySlots[0].endAt)}
                          </span>
                        ) : (
                          <span className={styles['practicumCalendarPreviewEmpty']}>일정 없음</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles['practicumDetailPanel']}>
              <div className={styles['practicumDetailHeader']}>
                <div>
                  <strong className={styles['practicumPanelTitle']}>
                    선택 날짜 · {formatDate(practicumSelectedDate)}
                  </strong>
                  <p className={styles['practicumPanelDescription']}>
                    이미 예약한 경우 다른 시간 버튼으로 바로 일정 변경이 가능합니다.
                  </p>
                </div>
              </div>

              {!selectedPracticumLecture.enabled || !selectedPracticumLecture.eligible ? (
                <div className={styles['practicumNotice']}>
                  <strong className={styles['practicumNoticeTitle']}>
                    지금은 예약할 수 없습니다.
                  </strong>
                  <p className={styles['notesHint']}>
                    {selectedPracticumLecture.blockedReason || '예약 가능한 상태가 아닙니다.'}
                  </p>
                </div>
              ) : null}

              {practicumSelectedDateSlots.length ? (
                <div className={styles['practicumSlotList']}>
                  {practicumSelectedDateSlots.map((slot) => {
                    const isCurrentReservedSlot = activeScheduledReservation?.slotId === slot.id;

                    return (
                      <article className={styles['practicumSlotRow']} key={slot.id}>
                        <div className={styles['practicumSlotMain']}>
                          <div>
                            <strong className={styles['practicumSlotTime']}>
                              {formatTimeRange(slot.startAt, slot.endAt)}
                            </strong>
                            <p className={styles['practicumSlotMeta']}>
                              {slot.location || '장소 안내 예정'} · {slot.reservedCount}/
                              {slot.maxCapacity}명
                            </p>
                          </div>
                          {isCurrentReservedSlot ? null : (
                            <span className={styles['practicumSlotCapacity']}>
                              잔여 {slot.remainingCapacity}석
                            </span>
                          )}
                        </div>
                        <Button
                          disabled={
                            isPracticumMutationPending ||
                            !selectedPracticumLecture.eligible ||
                            (!isCurrentReservedSlot && !isPracticumSlotReservable(slot))
                          }
                          onClick={() => {
                            if (isCurrentReservedSlot && activeScheduledReservation) {
                              cancelPracticumMutation.mutate(activeScheduledReservation.id);
                              return;
                            }

                            if (activeScheduledReservation) {
                              movePracticumMutation.mutate({
                                reservationId: activeScheduledReservation.id,
                                slotId: slot.id,
                              });
                              return;
                            }

                            reservePracticumMutation.mutate({
                              lectureId: selectedPracticumLecture.lectureId,
                              slotId: slot.id,
                            });
                          }}
                          size='sm'
                          type='button'
                          variant={
                            isCurrentReservedSlot || activeScheduledReservation
                              ? 'secondary'
                              : 'primary'
                          }
                        >
                          {isCurrentReservedSlot
                            ? cancelPracticumMutation.isPending
                              ? '취소 중...'
                              : '예약 취소'
                            : activeScheduledReservation
                              ? movePracticumMutation.isPending
                                ? '변경 중...'
                                : '이 일정으로 변경'
                              : reservePracticumMutation.isPending
                                ? '예약 중...'
                                : '이 일정 예약'}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className={styles['notesHint']}>
                  선택한 날짜에는 예약 가능한 실습 일정이 없습니다.
                </p>
              )}
            </section>
          </div>
        ) : null}

        {!practicumOverviewQuery.isLoading &&
        !practicumOverviewQuery.isError &&
        selectedLectureId !== null &&
        !selectedPracticumLecture ? (
          <div className={styles['practicumNotice']}>
            <strong className={styles['practicumNoticeTitle']}>
              실습 강의 정보를 찾지 못했습니다.
            </strong>
            <p className={styles['notesHint']}>강의 연결 상태를 확인한 뒤 다시 시도해 주세요.</p>
          </div>
        ) : null}
      </section>
    );
  };

  const renderOfflineSchedulePanel = () => {
    if (!selectedLesson || selectedLesson.deliveryType !== 'offline') {
      return null;
    }

    if (!firstOfflineDate) {
      return (
        <div className={styles['playerPlaceholder']}>
          <div className={styles['playerOverlayCopy']}>
            <p className={styles['overlayTitle']}>오프라인 강의 일정이 아직 등록되지 않았습니다.</p>
            <p className={styles['overlayDescription']}>
              관리자에서 일정을 등록하면 이 영역에서 바로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      );
    }

    const primaryOfflineEntry = offlineScheduleEntries[0] ?? null;
    const attendanceStatusLabel = primaryOfflineEntry?.absent
      ? '불참'
      : primaryOfflineEntry?.attendanceCompleted
        ? '참석 처리됨'
        : '참석 예정';
    const attendanceDescription = primaryOfflineEntry?.absent
      ? null
      : primaryOfflineEntry?.attendanceCompleted
        ? '일정 종료 후 진도율에 반영되었습니다.'
        : '불참 표시 없으면 자동 참석';
    const prerequisiteVideoLabel = selectedLessonHasStream
      ? selectedLessonProgress?.completed
        ? '선행 영상 완료'
        : '선행 영상 미완료'
      : null;

    return (
      <div className={styles['offlineScheduleWorkspace']}>
        <section
          className={classNames(styles['practicumCalendarPanel'], styles['offlineCalendarPanel'])}
        >
          <div
            className={classNames(
              styles['practicumCalendarHeader'],
              styles['offlineCalendarHeader'],
            )}
          >
            <div className={styles['practicumMonthPicker']} ref={offlineMonthPickerRef}>
              <button
                aria-label='이전 달'
                className={styles['practicumMonthNavButton']}
                onClick={() => {
                  updateOfflineMonth(shiftMonthValue(offlineCalendarMonthValue, -1));
                }}
                type='button'
              >
                ‹
              </button>
              <button
                aria-expanded={isOfflineMonthPickerOpen}
                className={styles['practicumMonthTrigger']}
                onClick={() => {
                  setIsOfflineMonthPickerOpen((current) => !current);
                }}
                type='button'
              >
                {formatMonthLabel(offlineCalendarMonthValue)}
              </button>
              <button
                aria-label='다음 달'
                className={styles['practicumMonthNavButton']}
                onClick={() => {
                  updateOfflineMonth(shiftMonthValue(offlineCalendarMonthValue, 1));
                }}
                type='button'
              >
                ›
              </button>

              {isOfflineMonthPickerOpen ? (
                <div className={styles['practicumMonthPopover']} role='dialog'>
                  <div className={styles['practicumMonthPopoverHeader']}>
                    <button
                      aria-label='이전 연도'
                      className={styles['practicumMonthYearButton']}
                      onClick={() => {
                        updateOfflineMonth(shiftMonthYear(offlineCalendarMonthValue, -1));
                      }}
                      type='button'
                    >
                      ‹
                    </button>
                    <strong>{`${String(getMonthYear(offlineCalendarMonthValue))}년`}</strong>
                    <button
                      aria-label='다음 연도'
                      className={styles['practicumMonthYearButton']}
                      onClick={() => {
                        updateOfflineMonth(shiftMonthYear(offlineCalendarMonthValue, 1));
                      }}
                      type='button'
                    >
                      ›
                    </button>
                  </div>
                  <div className={styles['practicumMonthGrid']}>
                    {MONTH_OPTIONS.map((month) => {
                      const monthValue = buildMonthValue(
                        getMonthYear(offlineCalendarMonthValue),
                        month,
                      );

                      return (
                        <button
                          className={styles['practicumMonthOption']}
                          data-selected={monthValue === offlineCalendarMonthValue}
                          key={month}
                          onClick={() => {
                            updateOfflineMonth(monthValue);
                            setIsOfflineMonthPickerOpen(false);
                          }}
                          type='button'
                        >
                          {`${String(month)}월`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            {primaryOfflineEntry ? (
              <div className={styles['offlineScheduleSummary']} aria-label='오프라인 일정 요약'>
                <strong>
                  {formatDate(primaryOfflineEntry.date ?? firstOfflineDate)}
                  {primaryOfflineEntry.timeLabel ? ` · ${primaryOfflineEntry.timeLabel}` : ''}
                </strong>
                <span>{primaryOfflineEntry.location ?? '장소 안내 예정'}</span>
              </div>
            ) : null}
          </div>

          {primaryOfflineEntry ? (
            <div className={styles['offlineAttendancePanel']}>
              <div className={styles['offlineAttendanceMain']}>
                <span
                  className={styles['offlineAttendanceBadge']}
                  data-tone={
                    primaryOfflineEntry.absent
                      ? 'absent'
                      : primaryOfflineEntry.attendanceCompleted
                        ? 'completed'
                        : 'scheduled'
                  }
                >
                  {attendanceStatusLabel}
                </span>
                {prerequisiteVideoLabel ? (
                  <span
                    className={styles['offlineAttendanceBadge']}
                    data-tone={selectedLessonProgress?.completed ? 'completed' : 'pending'}
                  >
                    {prerequisiteVideoLabel}
                  </span>
                ) : null}
                {attendanceDescription ? (
                  <span className={styles['offlineAttendanceHelp']}>{attendanceDescription}</span>
                ) : null}
              </div>
              <Button
                disabled={offlineAttendanceMutation.isPending}
                onClick={() => {
                  if (!primaryOfflineEntry.ruleId) {
                    showToast({
                      message:
                        '오프라인 일정 정보가 갱신되지 않았습니다. 새로고침 후 다시 시도해 주세요.',
                      variant: 'error',
                    });
                    return;
                  }
                  offlineAttendanceMutation.mutate({
                    absent: !primaryOfflineEntry.absent,
                    ruleId: primaryOfflineEntry.ruleId,
                  });
                }}
                size='sm'
                type='button'
                variant={primaryOfflineEntry.absent ? 'secondary' : 'primary'}
              >
                {offlineAttendanceMutation.isPending
                  ? '저장 중...'
                  : primaryOfflineEntry.absent
                    ? '불참 취소'
                    : '불참으로 표시'}
              </Button>
            </div>
          ) : null}

          <div className={styles['practicumCalendarWeekdays']}>
            {calendarWeekdays.map((weekday) => (
              <span className={styles['practicumCalendarWeekday']} key={weekday}>
                {weekday}
              </span>
            ))}
          </div>

          <div className={styles['practicumCalendarGrid']}>
            {offlineCalendarCells.map((cell, index) => {
              if (!cell.date) {
                return (
                  <div
                    className={styles['practicumCalendarEmptyCell']}
                    key={`offline-empty-${String(index)}`}
                  />
                );
              }

              const dayEntries = offlineScheduleEntriesByDate.get(cell.date) ?? [];
              const previewEntries = dayEntries.slice(0, 2);

              return (
                <div
                  className={styles['practicumCalendarDay']}
                  data-has-items={dayEntries.length > 0}
                  data-reserved={dayEntries.length > 0}
                  key={cell.date}
                >
                  <div className={styles['practicumCalendarDayHeader']}>
                    <span className={styles['practicumCalendarDayNumber']}>
                      {Number(cell.date.split('-')[2])}
                    </span>
                  </div>

                  <div className={styles['practicumCalendarPreviewList']}>
                    {previewEntries.length
                      ? previewEntries.map((entry) => (
                          <span className={styles['offlineCalendarPreviewItem']} key={entry.id}>
                            <span className={styles['offlineCalendarPreviewTime']}>
                              {entry.timeLabel ?? '오프라인 수업'}
                            </span>
                          </span>
                        ))
                      : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

  const handleDownloadResourceAttachment = (attachment: LearningPlayerResourceAttachment) => {
    if (!attachment.fileUrl) {
      showToast({
        message: '이 자료는 아직 다운로드할 수 있는 파일 주소가 준비되지 않았습니다.',
        variant: 'error',
      });
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = attachment.fileUrl;
    anchor.download = attachment.fileName;
    anchor.rel = 'noopener noreferrer';
    anchor.target = '_blank';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleDownloadAllResourceAttachments = () => {
    const downloadableAttachments = lessonResourceAttachments.filter((attachment) =>
      Boolean(attachment.fileUrl),
    );

    if (!downloadableAttachments.length) {
      showToast({
        message: '다운로드할 수 있는 첨부파일이 아직 없습니다.',
        variant: 'error',
      });
      return;
    }

    downloadableAttachments.forEach((attachment) => {
      handleDownloadResourceAttachment(attachment);
    });
  };

  const renderResourcePanel = () => {
    return (
      <div className={styles['resourceBoardViewport']}>
        <div className={styles['resourceBoard']}>
          <div className={styles['resourceBoardHeader']} aria-hidden='true'>
            <span className={styles['resourceBoardHeaderFile']}>파일</span>
            <span>크기</span>
            <span>업데이트</span>
            <span>다운로드</span>
          </div>
          {lessonResourceAttachments.length ? (
            <div className={styles['resourceBoardList']}>
              {lessonResourceAttachments.map((attachment) => (
                <article className={styles['resourceBoardRow']} key={attachment.id}>
                  <div className={styles['resourceFileCell']}>
                    <span className={styles['resourceFileType']}>
                      {formatResourceFileTypeLabel(attachment)}
                    </span>
                    <strong className={styles['resourceBoardTitle']}>
                      {attachment.title?.trim() || attachment.fileName}
                    </strong>
                  </div>
                  <span className={styles['resourceBoardSize']}>
                    {formatResourceFileSize(attachment.fileSize)}
                  </span>
                  <span className={styles['resourceBoardDate']}>
                    {formatResourceUpdatedDate(attachment.updatedAt)}
                  </span>
                  <div className={styles['resourceBoardActions']}>
                    <button
                      className={styles['resourceDownloadButton']}
                      onClick={() => {
                        handleDownloadResourceAttachment(attachment);
                      }}
                      type='button'
                    >
                      다운로드
                      <span
                        aria-hidden='true'
                        className={styles['resourceDownloadIcon']}
                        style={playerArrowDownToLineIconStyle}
                      />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles['resourceBoardEmptyState']}>
              <span
                aria-hidden='true'
                className={styles['resourceBoardEmptyIcon']}
                style={playerFolderOpenIconStyle}
              />
              <strong>등록된 첨부파일이 없습니다.</strong>
              <span>자료가 등록되면 여기에서 확인할 수 있습니다.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuizQuestionNavigator = () => {
    if (!quizQuestions.length) {
      return null;
    }

    return (
      <nav aria-label='문제 문항 목록' className={styles['quizNavigatorList']}>
        {quizQuestions.map((question, index) => {
          const isCurrentQuestion = question.id === currentQuizQuestion?.id;
          const selectedOptionIds = quizAnswers[question.id] ?? [];
          const isFlagged = quizFlaggedQuestionIds.has(question.id);
          const selectedAnswerLabel = formatSelectedQuizAnswerLabel(question, selectedOptionIds);
          const sidebarStatusLabel = getQuizSidebarStatusLabel(
            selectedOptionIds,
            isFlagged,
            isCurrentQuestion,
          );

          return (
            <button
              className={classNames(
                styles['quizNavigatorListButton'],
                isCurrentQuestion && styles['quizNavigatorListButtonCurrent'],
              )}
              key={question.id}
              onClick={() => {
                moveToQuizQuestion(index);
              }}
              type='button'
            >
              <span className={styles['quizNavigatorStateRow']}>
                <span
                  className={classNames(
                    styles['quizNavigatorNumber'],
                    selectedOptionIds.length > 0 && styles['quizNavigatorNumberAnswered'],
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles['quizNavigatorQuestionTitle']}>
                  {formatQuizQuestionLabel(index)}
                </span>
                <span
                  className={classNames(
                    styles['quizNavigatorStateBadge'],
                    selectedAnswerLabel && styles['quizNavigatorStateBadgeAnswered'],
                    !selectedAnswerLabel && isFlagged && styles['quizNavigatorStateBadgeFlagged'],
                    !selectedAnswerLabel &&
                      isCurrentQuestion &&
                      styles['quizNavigatorStateBadgeCurrent'],
                  )}
                >
                  {selectedAnswerLabel ?? sidebarStatusLabel}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    );
  };

  return (
    <div className={styles['page']}>
      <div className={styles['shell']}>
        <header className={styles['topBar']}>
          <div className={styles['topBarCopy']}>
            <Link className={styles['backLink']} to={routePaths.mypage}>
              <span
                aria-hidden='true'
                className={styles['backLinkIcon']}
                style={playerArrowLeftIconStyle}
              />
              <span>내 강의</span>
            </Link>
          </div>
          {enrollmentState ? (
            <div className={styles['topBarMeta']}>
              <span className={styles['topBarChip']}>진도율 {completedRatio}%</span>
              <span className={styles['topBarText']}>
                운영기간 {formatDateRange(enrollmentState.enrolledAt, enrollmentState.expireAt)}
              </span>
            </div>
          ) : null}
        </header>

        {!isValidEnrollmentId ? (
          <p className={styles['message']}>올바른 수강 정보가 아닙니다.</p>
        ) : null}
        {isValidEnrollmentId && isLoading ? (
          <p className={styles['message']}>온라인 수강 정보를 불러오는 중입니다.</p>
        ) : null}
        {isValidEnrollmentId && hasError ? (
          <p className={styles['errorText']}>{errorMessage}</p>
        ) : null}

        {isValidEnrollmentId && !isLoading && !hasError ? (
          !isPlaybackBlocked ? (
            <div className={styles['layout']}>
              <section className={styles['viewerColumn']}>
                {!selectedItemLocked && isLessonItem && !isQuizMode ? (
                  <>
                    <section
                      className={classNames(
                        styles['stageCard'],
                        isResourceLesson && styles['resourceStageCard'],
                      )}
                    >
                      <div className={styles['stageHeader']}>
                        <div className={styles['stageCopy']}>
                          <h1 className={styles['lessonTitle']}>{selectedLesson?.title}</h1>
                          {isResourceLesson && selectedLesson?.description?.trim() ? (
                            <p className={styles['resourceStageDescription']}>
                              {selectedLesson.description}
                            </p>
                          ) : null}
                          {progressSaveError ? (
                            <p className={styles['stageProgressWarning']}>{progressSaveError}</p>
                          ) : null}
                        </div>
                        {selectedLesson ? (
                          <div className={styles['stageMeta']} aria-label='현재 강의 정보'>
                            {isResourceLesson ? (
                              <button
                                className={styles['resourceDownloadAllButton']}
                                onClick={handleDownloadAllResourceAttachments}
                                type='button'
                              >
                                모두 다운로드
                                <span
                                  aria-hidden='true'
                                  className={styles['resourceDownloadIcon']}
                                  style={playerArrowDownToLineIconStyle}
                                />
                              </button>
                            ) : (
                              <span className={styles['metaChip']}>
                                {LESSON_TYPE_LABELS[selectedLesson.deliveryType]}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={classNames(
                          styles['playerShell'],
                          isResourceLesson && styles['resourcePlayerShell'],
                        )}
                      >
                        <div
                          aria-label='영상 플레이어'
                          className={classNames(
                            styles['playerFrame'],
                            (isOfflineLesson || isResourceLesson) && styles['playerFrameSchedule'],
                            selectedLessonHasStream &&
                              !arePlayerControlsVisible &&
                              styles['playerFrameControlsHidden'],
                          )}
                          onFocus={selectedLessonHasStream ? revealPlayerControls : undefined}
                          onClick={selectedLessonHasStream ? handlePlayerFrameClick : undefined}
                          onKeyDown={selectedLessonHasStream ? handlePlayerFrameKeyDown : undefined}
                          onPointerDown={selectedLessonHasStream ? revealPlayerControls : undefined}
                          onPointerMove={selectedLessonHasStream ? revealPlayerControls : undefined}
                          role={selectedLessonHasStream ? 'region' : undefined}
                          tabIndex={selectedLessonHasStream ? 0 : undefined}
                        >
                          {isOfflineLesson ? (
                            renderOfflineSchedulePanel()
                          ) : isResourceLesson ? (
                            renderResourcePanel()
                          ) : selectedLessonHasStream ? (
                            <video
                              className={styles['playerElement']}
                              controlsList='nodownload noremoteplayback'
                              disablePictureInPicture
                              disableRemotePlayback
                              playsInline
                              poster={selectedSource.posterUrl ?? undefined}
                              preload='auto'
                              ref={videoRef}
                            />
                          ) : (
                            <div className={styles['playerPlaceholder']}>
                              <div className={styles['playerOverlayCopy']}>
                                <p className={styles['overlayTitle']}>
                                  이 강의는 영상 없이 제공되는 강의입니다.
                                </p>
                                <p className={styles['overlayDescription']}>
                                  실습, 첨부자료, 강의 설명 중심으로 진행되며 영상이 연결되면
                                  여기에서 바로 재생할 수 있습니다.
                                </p>
                                {selectedLesson?.description ? (
                                  <p className={styles['playerPlaceholderDescription']}>
                                    {selectedLesson.description}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {selectedLessonHasStream && streamLoading ? (
                            <div className={styles['playerOverlay']} data-state='loading'>
                              <span aria-hidden='true' className={styles['playerLoadingSpinner']} />
                              <div className={styles['playerOverlayCopy']}>
                                <p className={styles['overlayTitle']}>스트리밍 준비 중</p>
                                <p className={styles['overlayDescription']}>
                                  잠시만 기다려 주세요. 영상 재생을 준비하고 있습니다.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          {isUnsupportedPlayback ? (
                            <div className={styles['playerOverlay']} data-state='notice'>
                              <div className={styles['playerOverlayCopy']}>
                                <p className={styles['overlayTitle']}>
                                  현재 브라우저에서는 재생이 지원되지 않습니다.
                                </p>
                                <p className={styles['overlayDescription']}>
                                  최신 버전의 Chrome 또는 Edge 사용을 권장합니다.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          {!isOfflineLesson && !isResourceLesson && !selectedSource ? (
                            <div className={styles['playerOverlay']} data-state='notice'>
                              <p className={styles['overlayTitle']}>
                                재생할 강의를 찾을 수 없습니다.
                              </p>
                            </div>
                          ) : null}

                          {playerError ? (
                            <div className={styles['playerOverlay']} data-state='error'>
                              <div className={styles['playerOverlayCopy']}>
                                <p className={styles['overlayTitle']}>
                                  영상 재생에 문제가 발생했습니다.
                                </p>
                                <p className={styles['overlayDescription']}>
                                  잠시 후 다시 시도해 주세요.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          {selectedLessonHasStream ? (
                            <div className={styles['playerFrameControls']} ref={settingsPanelRef}>
                              <div className={styles['playerTimeline']}>
                                <span className={styles['playerTimelineTrack']} />
                                <span
                                  className={styles['playerTimelineBuffer']}
                                  style={{ width: '31%' }}
                                />
                                <span
                                  className={styles['playerTimelineFill']}
                                  style={{ width: `${String(playerProgressRatio)}%` }}
                                />
                                <span
                                  aria-hidden='true'
                                  className={styles['playerTimelineThumb']}
                                  style={{ left: `${String(playerProgressRatio)}%` }}
                                />
                              </div>
                              <div className={styles['playerControlRow']}>
                                <div className={styles['playerPrimaryControls']}>
                                  <button
                                    aria-label={isVideoPlaying ? '멈춤' : '재생'}
                                    className={styles['playerIconButton']}
                                    onClick={togglePlayback}
                                    title={isVideoPlaying ? '멈춤' : '재생'}
                                    type='button'
                                  >
                                    <span
                                      aria-hidden='true'
                                      className={classNames(
                                        styles['playerControlIcon'],
                                        isVideoPlaying && styles['playerPauseIcon'],
                                      )}
                                      style={isVideoPlaying ? undefined : playerPlayIconStyle}
                                    />
                                  </button>
                                  <button
                                    aria-label={isVideoMuted ? '음소거 해제' : '음소거'}
                                    className={styles['playerIconButton']}
                                    onClick={toggleMute}
                                    title={isVideoMuted ? '음소거 해제' : '음소거'}
                                    type='button'
                                  >
                                    <span
                                      aria-hidden='true'
                                      className={styles['playerControlIcon']}
                                      style={playerVolumeIconStyle}
                                    />
                                    {isVideoMuted ? (
                                      <span
                                        aria-hidden='true'
                                        className={styles['playerMuteSlash']}
                                      />
                                    ) : null}
                                  </button>
                                  <span className={styles['playerTimeText']}>
                                    {formatSeconds(Math.floor(currentPlaybackSeconds))} /{' '}
                                    {formatSeconds(playerDurationSeconds || 45 * 60)}
                                  </span>
                                </div>
                                <div className={styles['playerSecondaryControls']}>
                                  <div className={styles['settingsAnchor']}>
                                    <button
                                      aria-expanded={activeSettingsPanel === 'speed'}
                                      aria-haspopup='dialog'
                                      aria-label='재생 설정'
                                      className={styles['playerTextButton']}
                                      onClick={() => {
                                        setActiveSettingsPanel((current) =>
                                          current === 'speed' ? null : 'speed',
                                        );
                                      }}
                                      type='button'
                                    >
                                      {playbackRate}x
                                    </button>
                                    {activeSettingsPanel === 'speed' ? (
                                      <div
                                        aria-label='재생 속도 설정 패널'
                                        className={classNames(
                                          styles['settingsPanel'],
                                          styles['settingsPanelSpeed'],
                                        )}
                                        role='dialog'
                                      >
                                        <div className={styles['settingsOptionList']}>
                                          {PLAYBACK_SPEED_OPTIONS.map((speedOption) => (
                                            <button
                                              className={classNames(
                                                styles['settingsOption'],
                                                playbackRate === speedOption &&
                                                  styles['settingsOptionActive'],
                                              )}
                                              key={speedOption}
                                              onClick={() => {
                                                applyPlaybackRate(speedOption);
                                                setActiveSettingsPanel(null);
                                              }}
                                              type='button'
                                            >
                                              {speedOption}x
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className={styles['settingsAnchor']}>
                                    <button
                                      aria-expanded={activeSettingsPanel === 'quality'}
                                      aria-haspopup='dialog'
                                      aria-label='화질 설정'
                                      className={styles['playerTextButton']}
                                      onClick={() => {
                                        setActiveSettingsPanel((current) =>
                                          current === 'quality' ? null : 'quality',
                                        );
                                      }}
                                      type='button'
                                    >
                                      화질 {selectedQualityLabel}
                                    </button>
                                    {activeSettingsPanel === 'quality' ? (
                                      <div
                                        aria-label='화질 설정 패널'
                                        className={classNames(
                                          styles['settingsPanel'],
                                          styles['settingsPanelQuality'],
                                        )}
                                        role='dialog'
                                      >
                                        <div className={styles['settingsOptionList']}>
                                          {qualityOptions.map((quality) => (
                                            <button
                                              className={classNames(
                                                styles['settingsOption'],
                                                selectedQualityLevel === quality.levelIndex &&
                                                  styles['settingsOptionActive'],
                                              )}
                                              key={`${quality.label}-${String(quality.levelIndex)}`}
                                              onClick={() => {
                                                applyQualityLevel(quality.levelIndex);
                                                setActiveSettingsPanel(null);
                                              }}
                                              type='button'
                                            >
                                              {quality.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <button
                                    aria-label='전체화면'
                                    className={styles['playerIconButton']}
                                    onClick={requestPlayerFullscreen}
                                    type='button'
                                  >
                                    <span
                                      aria-hidden='true'
                                      className={styles['playerControlIcon']}
                                      style={playerFullscreenIconStyle}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    {renderPracticumPanel()}
                  </>
                ) : null}

                {isQuizMode ? (
                  <section className={classNames(styles['stageCard'], styles['quizStageCard'])}>
                    <div className={classNames(styles['stageHeader'], styles['quizStageHeader'])}>
                      <div className={styles['stageCopy']}>
                        <h1 className={styles['lessonTitle']}>{selectedLesson?.title}</h1>
                      </div>
                      <div className={styles['quizTimerCard']} aria-label='현재 강의 정보'>
                        {selectedLesson ? (
                          <span className={styles['srOnly']}>
                            {LESSON_TYPE_LABELS[selectedLesson.deliveryType]}
                          </span>
                        ) : null}
                        <span className={styles['quizTimerLabel']}>
                          <span aria-hidden='true' className={styles['quizTimerIcon']} />
                          남은 시간
                        </span>
                        <span className={styles['quizTimerValue']}>{quizRemainingTimeLabel}</span>
                      </div>
                    </div>

                    <section className={styles['quizWorkspace']}>
                      {quizQuery.isLoading ? (
                        <p className={styles['quizMutedText']}>문제 정보를 불러오는 중입니다.</p>
                      ) : quizQuery.isError ? (
                        <p className={styles['quizErrorText']}>
                          {quizQuery.error instanceof Error
                            ? quizQuery.error.message
                            : '문제 정보를 불러오지 못했습니다.'}
                        </p>
                      ) : !quizQuery.data ? (
                        <p className={styles['quizMutedText']}>
                          이 강의에는 등록된 문제가 없습니다.
                        </p>
                      ) : (
                        <>
                          {shouldShowQuizStartPrompt ? (
                            <section className={styles['quizStartCard']}>
                              <div className={styles['quizResultHeader']}>
                                <div>
                                  <strong className={styles['quizResultTitle']}>
                                    문제 풀이를 시작할까요?
                                  </strong>
                                  <p className={styles['quizMutedText']}>
                                    시작하면 제한시간이 흐르고, 남은 시간이 끝나면 현재 저장된
                                    답안으로 자동 제출됩니다.
                                  </p>
                                </div>
                                <Button
                                  disabled={startQuizSessionMutation.isPending}
                                  onClick={handleQuizStart}
                                  size='sm'
                                  type='button'
                                >
                                  {startQuizSessionMutation.isPending ? '시작 중...' : '시작하기'}
                                </Button>
                              </div>
                              <div className={styles['quizStartMetaGrid']}>
                                <div className={styles['quizStartMetaItem']}>
                                  <span>제한시간</span>
                                  <strong>{quizRemainingTimeLabel}</strong>
                                </div>
                                <div className={styles['quizStartMetaItem']}>
                                  <span>문항수</span>
                                  <strong>{String(quizQuestions.length)}문항</strong>
                                </div>
                                <div className={styles['quizStartMetaItem']}>
                                  <span>통과 기준</span>
                                  <strong>{String(quizQuery.data?.passScore ?? 0)}점</strong>
                                </div>
                              </div>
                            </section>
                          ) : null}

                          {shouldShowQuizQuestion && currentQuizQuestion ? (
                            <section className={styles['quizQuestionCard']}>
                              <div className={styles['quizQuestionHeader']}>
                                <span className={styles['quizQuestionEyebrow']}>
                                  Question {String(resolvedQuizQuestionIndex + 1).padStart(2, '0')}
                                </span>
                                <strong className={styles['quizQuestionTitle']}>
                                  {currentQuizQuestion.questionText}
                                </strong>
                                {currentQuizResult ? (
                                  <span
                                    className={classNames(
                                      styles['quizResultState'],
                                      currentQuizResult.correct && styles['quizResultStateCorrect'],
                                    )}
                                  >
                                    {currentQuizResult.correct ? 'O' : 'X'}
                                  </span>
                                ) : null}
                              </div>
                              <div
                                className={classNames(
                                  styles['quizQuestionBody'],
                                  !(
                                    currentQuizQuestion.mediaType &&
                                    (currentQuizQuestion.mediaPreviewUrl ||
                                      currentQuizQuestion.mediaUrl)
                                  ) && styles['quizQuestionBodyTextOnly'],
                                )}
                              >
                                <div className={styles['quizOptionList']}>
                                  {currentQuizQuestion.options.map((option, optionIndex) => {
                                    const selectedOptionIds =
                                      quizAnswers[currentQuizQuestion.id] ?? [];
                                    const submittedOptionIds =
                                      currentQuizResult?.submittedOptionIds ?? selectedOptionIds;
                                    const checked = quizReviewMode
                                      ? submittedOptionIds.includes(option.id)
                                      : selectedOptionIds.includes(option.id);

                                    return (
                                      <label
                                        className={classNames(
                                          styles['quizOptionRow'],
                                          checked && styles['quizOptionRowSelected'],
                                        )}
                                        data-checked={checked ? 'true' : 'false'}
                                        data-type={currentQuizQuestion.questionType}
                                        key={option.id}
                                      >
                                        <input
                                          checked={checked}
                                          aria-label={`${String(optionIndex + 1)}. ${option.optionText}`}
                                          disabled={quizReviewMode}
                                          name={`problem-question-${String(currentQuizQuestion.id)}`}
                                          onChange={() => {
                                            updateQuizAnswer(
                                              currentQuizQuestion.id,
                                              option.id,
                                              currentQuizQuestion.questionType,
                                            );
                                          }}
                                          type={
                                            currentQuizQuestion.questionType === 'MULTIPLE'
                                              ? 'checkbox'
                                              : 'radio'
                                          }
                                        />
                                        <span
                                          aria-hidden='true'
                                          className={styles['quizOptionIndicator']}
                                        />
                                        <div className={styles['quizOptionContent']}>
                                          <span className={styles['quizOptionLabel']}>
                                            {optionIndex + 1}. {option.optionText}
                                          </span>
                                          {renderQuizMedia(
                                            option.mediaType,
                                            option.mediaPreviewUrl,
                                            option.mediaUrl,
                                            `${String(resolvedQuizQuestionIndex + 1)}번 문항 ${String(optionIndex + 1)}번 보기 미디어`,
                                            styles['quizOptionMedia'],
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>

                                {renderQuizMedia(
                                  currentQuizQuestion.mediaType,
                                  currentQuizQuestion.mediaPreviewUrl,
                                  currentQuizQuestion.mediaUrl,
                                  `${String(resolvedQuizQuestionIndex + 1)}번 문항 미디어`,
                                  styles['quizMediaImage'],
                                )}
                              </div>

                              {quizReviewMode && currentQuizResult ? (
                                <div className={styles['quizReviewSummary']}>
                                  {currentQuizResult.explanation ? (
                                    <details className={styles['quizExplanationDetails']}>
                                      <summary>해설 보기</summary>
                                      <p className={styles['quizResultExplanation']}>
                                        {currentQuizResult.explanation}
                                      </p>
                                    </details>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className={styles['quizControlBar']}>
                                {!quizReviewMode ? (
                                  <label
                                    className={styles['quizFlagToggleBottom']}
                                    data-checked={
                                      quizFlaggedQuestionIds.has(currentQuizQuestion.id)
                                        ? 'true'
                                        : 'false'
                                    }
                                  >
                                    <input
                                      checked={quizFlaggedQuestionIds.has(currentQuizQuestion.id)}
                                      onChange={(event) => {
                                        setQuizFlaggedQuestion(
                                          currentQuizQuestion.id,
                                          event.currentTarget.checked,
                                        );
                                      }}
                                      type='checkbox'
                                    />
                                    <img
                                      alt=''
                                      aria-hidden='true'
                                      className={styles['quizFlagToggleIcon']}
                                      src={iconBookmark}
                                    />
                                    <span>나중에 풀기</span>
                                  </label>
                                ) : (
                                  <span aria-hidden='true' />
                                )}
                                <div className={styles['quizControlNavigation']}>
                                  <button
                                    className={styles['quizNavButton']}
                                    disabled={resolvedQuizQuestionIndex === 0}
                                    onClick={() => {
                                      moveToQuizQuestion(resolvedQuizQuestionIndex - 1);
                                    }}
                                    type='button'
                                  >
                                    이전
                                  </button>
                                  <span className={styles['quizQuestionCounter']}>
                                    <strong>{resolvedQuizQuestionIndex + 1}</strong>
                                    <span>/</span>
                                    <span>{quizQuestions.length}</span>
                                  </span>
                                  <button
                                    className={styles['quizNavButton']}
                                    disabled={resolvedQuizQuestionIndex + 1 >= quizQuestions.length}
                                    onClick={() => {
                                      moveToQuizQuestion(resolvedQuizQuestionIndex + 1);
                                    }}
                                    type='button'
                                  >
                                    다음
                                  </button>
                                </div>
                                {quizReviewMode ? (
                                  <button
                                    className={classNames(
                                      styles['quizSubmitButton'],
                                      styles['quizSubmitButtonSecondary'],
                                    )}
                                    onClick={() => {
                                      setQuizReviewMode(false);
                                    }}
                                    type='button'
                                  >
                                    결과로 돌아가기
                                  </button>
                                ) : (
                                  <button
                                    className={styles['quizSubmitButton']}
                                    disabled={
                                      submitQuizMutation.isPending || quizRemainingSeconds === 0
                                    }
                                    onClick={handleQuizSubmit}
                                    type='button'
                                  >
                                    {submitQuizMutation.isPending ? '제출 중...' : '최종 제출'}
                                  </button>
                                )}
                              </div>
                            </section>
                          ) : !shouldShowQuizStartPrompt && !quizAttemptResult ? (
                            <p className={styles['quizMutedText']}>
                              {shouldShowSubmittedWithoutResult
                                ? '이미 제출한 문제입니다. 결과 정보를 불러오지 못했습니다.'
                                : '등록된 문제가 없습니다.'}
                            </p>
                          ) : null}

                          {quizAttemptResult && !quizReviewMode ? (
                            <div className={styles['quizResultCard']}>
                              <div className={styles['quizResultHeader']}>
                                <strong className={styles['quizResultTitle']}>채점 결과</strong>
                                <span
                                  className={classNames(
                                    styles['quizResultBadge'],
                                    quizAttemptResult.passed && styles['quizResultBadgePassed'],
                                  )}
                                >
                                  {quizAttemptResult.score}점
                                </span>
                              </div>
                              <div className={styles['quizResultActions']}>
                                <Button
                                  onClick={() => {
                                    setQuizReviewMode(true);
                                  }}
                                  size='sm'
                                  type='button'
                                  variant='secondary'
                                >
                                  문항 다시 보기
                                </Button>
                              </div>

                              <table className={styles['quizResultTable']}>
                                <thead>
                                  <tr>
                                    <th scope='col'>문항</th>
                                    <th scope='col'>결과</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quizAttemptResult.results.map((result, resultIndex) => (
                                    <tr key={result.questionId}>
                                      <td>{resultIndex + 1}번</td>
                                      <td>
                                        <span className={styles['quizResultMark']}>
                                          {result.correct ? 'O' : 'X'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                        </>
                      )}
                    </section>
                  </section>
                ) : null}
              </section>

              {isQuizMode ? (
                <aside className={styles['quizNavigatorPanel']}>
                  <div className={styles['curriculumHeader']}>
                    <div className={styles['curriculumHeaderCopy']}>
                      <h2 className={styles['curriculumTitle']}>{curriculumPanelTitle}</h2>
                    </div>
                    <div className={styles['panelSwitchRow']}>
                      <button
                        aria-label='프로그램 패널'
                        className={classNames(
                          styles['panelSwitchButton'],
                          activeQuizSidebarPanel === 'curriculum' &&
                            styles['panelSwitchButtonActive'],
                        )}
                        onClick={() => {
                          setActiveQuizSidebarPanel('curriculum');
                        }}
                        type='button'
                      >
                        <span className={styles['panelSwitchLabel']}>목록</span>
                      </button>
                      <button
                        aria-label='Q&A 패널'
                        className={classNames(
                          styles['panelSwitchButton'],
                          activeQuizSidebarPanel === 'qna' && styles['panelSwitchButtonActive'],
                        )}
                        onClick={() => {
                          setActiveQuizSidebarPanel('qna');
                        }}
                        type='button'
                      >
                        <span className={styles['panelSwitchLabel']}>Q&amp;A</span>
                      </button>
                    </div>
                  </div>

                  {activeQuizSidebarPanel === 'curriculum' ? (
                    <>
                      <div className={styles['progressPanel']}>
                        <div className={styles['progressSummary']}>
                          <strong className={styles['progressValue']}>{completedRatio}%</strong>
                          <span className={styles['progressText']}>
                            {completedLessonCount} / {totalLessonCount} 완료
                          </span>
                        </div>
                        <div aria-hidden='true' className={styles['progressTrack']}>
                          <span
                            className={styles['progressFill']}
                            style={{ width: `${String(completedRatio)}%` }}
                          />
                        </div>
                      </div>
                      <div className={styles['curriculumPanelContent']}>
                        <div className={styles['curriculumBody']}>
                          {snapshot.curriculumTrack.sections.map((section) => {
                            const isSectionOpen = expandedCurriculumSectionIds.has(section.id);

                            return (
                              <section
                                className={classNames(
                                  styles['sectionBlock'],
                                  isSectionOpen && styles['sectionBlockOpen'],
                                )}
                                key={section.id}
                                ref={(node) => {
                                  curriculumSectionRefs.current[section.id] = node;
                                }}
                              >
                                <button
                                  aria-expanded={isSectionOpen}
                                  className={styles['sectionHeader']}
                                  onClick={() => {
                                    toggleCurriculumSection(section.id);
                                  }}
                                  type='button'
                                >
                                  <h3 className={styles['sectionTitle']}>{section.title}</h3>
                                  <span className={styles['sectionToggle']}>
                                    <span
                                      aria-hidden='true'
                                      className={styles['sectionToggleIcon']}
                                      style={playerChevronDownIconStyle}
                                    />
                                  </span>
                                </button>

                                <div
                                  className={styles['sectionContent']}
                                  aria-hidden={!isSectionOpen}
                                >
                                  <div className={styles['lessonList']}>
                                    {flattenPlayerItems([
                                      {
                                        id: section.id,
                                        lessons: section.lessons,
                                        title: section.title,
                                      },
                                    ]).map((item) => {
                                      const lesson = item.lesson;
                                      const isCurrent = item.id === selectedItem.id;
                                      const isCompleted = completedLessonIds.has(lesson.id);
                                      const isProblemCompleted = quizAttemptedLessonIds.has(
                                        lesson.id,
                                      );
                                      const practicumSidebarState =
                                        lesson.deliveryType === 'practicum'
                                          ? (practicumSidebarStatesByLessonId.get(lesson.id) ??
                                            null)
                                          : null;
                                      const practicumLessonBadgeLabel =
                                        lesson.deliveryType === 'practicum'
                                          ? resolvePracticumLessonBadgeLabel(
                                              practicumLectureByLectureId.get(
                                                snapshot?.lessonPlaybackById[lesson.id]
                                                  ?.lectureId ??
                                                  lesson.lectureId ??
                                                  -1,
                                              ) ?? null,
                                            )
                                          : null;
                                      const offlineSidebarState = getOfflineSidebarState(lesson);
                                      const lessonSummaryActionLabel = getLessonSummaryActionLabel(
                                        lesson,
                                        practicumSidebarState?.label ?? null,
                                      );
                                      const lessonActionLabel =
                                        lesson.deliveryType === 'problem' && isProblemCompleted
                                          ? '문제 완료'
                                          : lessonSummaryActionLabel;
                                      const lessonMetaItems = getLessonMetaItems(lesson);
                                      const isItemCompleted =
                                        lesson.deliveryType === 'problem'
                                          ? isProblemCompleted
                                          : isCompleted;
                                      const isLocked = lockedLessonIds.has(lesson.id);

                                      return (
                                        <div
                                          className={classNames(
                                            styles['lessonLinkGroup'],
                                            isCurrent &&
                                              lesson.deliveryType === 'problem' &&
                                              styles['lessonLinkGroupExpanded'],
                                          )}
                                          key={item.id}
                                        >
                                          <Link
                                            className={classNames(
                                              styles['lessonLink'],
                                              isCurrent && styles['lessonLinkCurrent'],
                                              isLocked && styles['lessonLinkLocked'],
                                            )}
                                            tabIndex={isSectionOpen ? undefined : -1}
                                            to={routePaths.learningLesson(
                                              String(resolvedEnrollmentId),
                                              item.id,
                                            )}
                                          >
                                            <span
                                              aria-hidden='true'
                                              className={classNames(
                                                styles['lessonStatusIcon'],
                                                isItemCompleted &&
                                                  styles['lessonStatusIconCompleted'],
                                                isCurrent &&
                                                  !isItemCompleted &&
                                                  styles['lessonStatusIconCurrent'],
                                                isLocked && styles['lessonStatusIconLocked'],
                                              )}
                                              style={
                                                isItemCompleted
                                                  ? completedStatusStyle
                                                  : isCurrent
                                                    ? playerCurrentLessonIndicatorStyle
                                                    : undefined
                                              }
                                            />
                                            <div className={styles['lessonLinkBody']}>
                                              <div className={styles['lessonBadgeRow']}>
                                                <span className={styles['lessonTypeBadge']}>
                                                  {PLAYER_LESSON_TYPE_LABELS[lesson.deliveryType]}
                                                </span>
                                                {practicumSidebarState ? (
                                                  <span
                                                    className={styles['lessonPracticumBadge']}
                                                    data-tone={practicumSidebarState.tone}
                                                  >
                                                    {practicumLessonBadgeLabel ??
                                                      practicumSidebarState.label}
                                                  </span>
                                                ) : null}
                                                {offlineSidebarState ? (
                                                  <span
                                                    className={styles['lessonPracticumBadge']}
                                                    data-tone={offlineSidebarState.tone}
                                                  >
                                                    {offlineSidebarState.label}
                                                  </span>
                                                ) : null}
                                              </div>
                                              <div className={styles['lessonTitleRow']}>
                                                <strong className={styles['lessonLinkTitle']}>
                                                  {item.title}
                                                </strong>
                                                {lesson.deliveryType !== 'problem' ? (
                                                  <span className={styles['lessonSummaryAction']}>
                                                    {lessonActionLabel}
                                                  </span>
                                                ) : isProblemCompleted ? (
                                                  <span
                                                    className={styles['lessonSummaryAction']}
                                                    data-tone='completed'
                                                  >
                                                    {lessonActionLabel}
                                                  </span>
                                                ) : null}
                                              </div>
                                              {lessonMetaItems.length ? (
                                                <div className={styles['lessonLinkMeta']}>
                                                  {lessonMetaItems.map((metaItem) => (
                                                    <span
                                                      className={styles['lessonLinkDuration']}
                                                      key={`${item.id}-${metaItem}`}
                                                    >
                                                      {metaItem}
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : null}
                                            </div>
                                          </Link>

                                          {isCurrent && lesson.deliveryType === 'problem' ? (
                                            <div className={styles['quizLessonDropdown']}>
                                              {shouldShowQuizQuestionNavigator
                                                ? renderQuizQuestionNavigator()
                                                : null}
                                              {shouldShowQuizNavigatorEmptyText ? (
                                                <p className={styles['quizNavigatorEmptyText']}>
                                                  문제 풀이를 시작하면 문항 목록이 표시됩니다.
                                                </p>
                                              ) : null}
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={styles['curriculumPanelContent']}>
                      <div className={styles['qnaPanelBody']}>
                        <ProgramQnaPanel
                          allowReplies={false}
                          answerSource='adminOnly'
                          boardLayout='compact'
                          detailDisplay='answersOnly'
                          enabled
                          exclusiveWriteMode
                          hideBoardTitle
                          programId={qnaProgramId}
                          programThreadCount={qnaContext?.programThreadCount ?? null}
                          showBoardSummary={false}
                          title='Q&A'
                          variant='board'
                        />
                      </div>
                    </div>
                  )}
                </aside>
              ) : (
                <aside className={styles['curriculumPanel']}>
                  <div className={styles['curriculumHeader']}>
                    <div className={styles['curriculumHeaderCopy']}>
                      <h2 className={styles['curriculumTitle']}>{curriculumPanelTitle}</h2>
                    </div>
                    <div className={styles['panelSwitchRow']}>
                      <button
                        aria-label='프로그램 패널'
                        className={classNames(
                          styles['panelSwitchButton'],
                          activeSidebarPanel === 'curriculum' && styles['panelSwitchButtonActive'],
                        )}
                        onClick={() => {
                          setActiveSidebarPanel('curriculum');
                        }}
                        type='button'
                      >
                        <span className={styles['panelSwitchLabel']}>목록</span>
                      </button>
                      <button
                        aria-label='Q&A 패널'
                        className={classNames(
                          styles['panelSwitchButton'],
                          activeSidebarPanel === 'qna' && styles['panelSwitchButtonActive'],
                        )}
                        onClick={() => {
                          setActiveSidebarPanel('qna');
                        }}
                        type='button'
                      >
                        <span className={styles['panelSwitchLabel']}>Q&A</span>
                      </button>
                    </div>
                  </div>

                  {activeSidebarPanel === 'curriculum' ? (
                    <div className={styles['progressPanel']}>
                      <div className={styles['progressSummary']}>
                        <strong className={styles['progressValue']}>{completedRatio}%</strong>
                        <span className={styles['progressText']}>
                          {completedLessonCount} / {totalLessonCount} 완료
                        </span>
                      </div>
                      <div aria-hidden='true' className={styles['progressTrack']}>
                        <span
                          className={styles['progressFill']}
                          style={{ width: `${String(completedRatio)}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {activeSidebarPanel === 'curriculum' ? (
                    <div className={styles['curriculumPanelContent']}>
                      <div className={styles['curriculumBody']}>
                        {snapshot.curriculumTrack.sections.map((section) => {
                          const isSectionOpen = expandedCurriculumSectionIds.has(section.id);

                          return (
                            <section
                              className={classNames(
                                styles['sectionBlock'],
                                isSectionOpen && styles['sectionBlockOpen'],
                              )}
                              key={section.id}
                              ref={(node) => {
                                curriculumSectionRefs.current[section.id] = node;
                              }}
                            >
                              <button
                                aria-expanded={isSectionOpen}
                                className={styles['sectionHeader']}
                                onClick={() => {
                                  toggleCurriculumSection(section.id);
                                }}
                                type='button'
                              >
                                <h3 className={styles['sectionTitle']}>{section.title}</h3>
                                <span className={styles['sectionToggle']}>
                                  <span
                                    aria-hidden='true'
                                    className={styles['sectionToggleIcon']}
                                    style={playerChevronDownIconStyle}
                                  />
                                </span>
                              </button>

                              <div
                                className={styles['sectionContent']}
                                aria-hidden={!isSectionOpen}
                              >
                                <div className={styles['lessonList']}>
                                  {flattenPlayerItems([
                                    {
                                      id: section.id,
                                      lessons: section.lessons,
                                      title: section.title,
                                    },
                                  ]).map((item) => {
                                    const lesson = item.lesson;
                                    const isCurrent = item.id === selectedItem.id;
                                    const isCompleted = completedLessonIds.has(lesson.id);
                                    const isProblemCompleted = quizAttemptedLessonIds.has(
                                      lesson.id,
                                    );
                                    const practicumSidebarState =
                                      lesson.deliveryType === 'practicum'
                                        ? (practicumSidebarStatesByLessonId.get(lesson.id) ?? null)
                                        : null;
                                    const practicumLessonBadgeLabel =
                                      lesson.deliveryType === 'practicum'
                                        ? resolvePracticumLessonBadgeLabel(
                                            practicumLectureByLectureId.get(
                                              snapshot?.lessonPlaybackById[lesson.id]?.lectureId ??
                                                lesson.lectureId ??
                                                -1,
                                            ) ?? null,
                                          )
                                        : null;
                                    const offlineSidebarState = getOfflineSidebarState(lesson);
                                    const lessonSummaryActionLabel = getLessonSummaryActionLabel(
                                      lesson,
                                      practicumSidebarState?.label ?? null,
                                    );
                                    const lessonActionLabel =
                                      lesson.deliveryType === 'problem' && isProblemCompleted
                                        ? '문제 완료'
                                        : lessonSummaryActionLabel;
                                    const lessonMetaItems = getLessonMetaItems(lesson);
                                    const isItemCompleted =
                                      lesson.deliveryType === 'problem'
                                        ? isProblemCompleted
                                        : isCompleted;
                                    const isLocked = lockedLessonIds.has(lesson.id);
                                    const linkContent = (
                                      <>
                                        <span
                                          aria-hidden='true'
                                          className={classNames(
                                            styles['lessonStatusIcon'],
                                            isItemCompleted && styles['lessonStatusIconCompleted'],
                                            isCurrent &&
                                              !isItemCompleted &&
                                              styles['lessonStatusIconCurrent'],
                                            isLocked && styles['lessonStatusIconLocked'],
                                          )}
                                          style={
                                            isItemCompleted
                                              ? completedStatusStyle
                                              : isCurrent
                                                ? playerCurrentLessonIndicatorStyle
                                                : undefined
                                          }
                                        />
                                        <div className={styles['lessonLinkBody']}>
                                          <div className={styles['lessonBadgeRow']}>
                                            <span className={styles['lessonTypeBadge']}>
                                              {PLAYER_LESSON_TYPE_LABELS[lesson.deliveryType]}
                                            </span>
                                            {practicumSidebarState ? (
                                              <span
                                                className={styles['lessonPracticumBadge']}
                                                data-tone={practicumSidebarState.tone}
                                              >
                                                {practicumLessonBadgeLabel ??
                                                  practicumSidebarState.label}
                                              </span>
                                            ) : null}
                                            {offlineSidebarState ? (
                                              <span
                                                className={styles['lessonPracticumBadge']}
                                                data-tone={offlineSidebarState.tone}
                                              >
                                                {offlineSidebarState.label}
                                              </span>
                                            ) : null}
                                          </div>
                                          <div className={styles['lessonTitleRow']}>
                                            <strong className={styles['lessonLinkTitle']}>
                                              {item.title}
                                            </strong>
                                            <span
                                              className={styles['lessonSummaryAction']}
                                              data-tone={
                                                lesson.deliveryType === 'problem' &&
                                                isProblemCompleted
                                                  ? 'completed'
                                                  : undefined
                                              }
                                            >
                                              {lessonActionLabel}
                                            </span>
                                          </div>
                                          {lessonMetaItems.length ? (
                                            <div className={styles['lessonLinkMeta']}>
                                              {lessonMetaItems.map((metaItem) => (
                                                <span
                                                  className={styles['lessonLinkDuration']}
                                                  key={`${item.id}-${metaItem}`}
                                                >
                                                  {metaItem}
                                                </span>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      </>
                                    );

                                    return (
                                      <Link
                                        className={classNames(
                                          styles['lessonLink'],
                                          isCurrent && styles['lessonLinkCurrent'],
                                        )}
                                        key={item.id}
                                        tabIndex={isSectionOpen ? undefined : -1}
                                        to={routePaths.learningLesson(
                                          String(resolvedEnrollmentId),
                                          item.id,
                                        )}
                                      >
                                        {linkContent}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={styles['curriculumPanelContent']}>
                      <div className={styles['qnaPanelBody']}>
                        <ProgramQnaPanel
                          allowReplies={false}
                          answerSource='adminOnly'
                          boardLayout='compact'
                          detailDisplay='answersOnly'
                          enabled
                          exclusiveWriteMode
                          hideBoardTitle
                          programId={qnaProgramId}
                          programThreadCount={qnaContext?.programThreadCount ?? null}
                          showBoardSummary={false}
                          title='Q&A'
                          variant='board'
                        />
                      </div>
                    </div>
                  )}
                </aside>
              )}
            </div>
          ) : (
            <section className={styles['blockedCard']}>
              <h1 className={styles['blockedTitle']}>지금은 재생할 수 없습니다.</h1>
              <p className={styles['blockedDescription']}>
                수강 상태가 종료되었거나 재생 가능한 온라인 콘텐츠가 아직 준비되지 않았습니다.
              </p>
              <Link className={styles['dashboardLink']} to={routePaths.mypage}>
                내 강의로 돌아가기
              </Link>
            </section>
          )
        ) : null}
      </div>
    </div>
  );
};

export default PlayerPage;
