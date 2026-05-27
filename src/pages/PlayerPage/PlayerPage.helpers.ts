/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import Hls from 'hls.js/light';

import type { LearningPlayerResourceAttachment, LearningPlayerSnapshot } from '@/types/mypage';
import type {
  EnrollmentPracticumLecture,
  PracticumReservation,
  PracticumSlot,
} from '@/types/practicum';
import type {
  ProgramCurriculumLesson,
  ProgramCurriculumScheduleItem,
} from '@/types/programCatalog';
import type { StudentProblem } from '@/types/studentProblems';
import {
  buildCalendarCells,
  formatDate,
  getSlotDateKey,
  toMonthValue,
} from '@/utils/practicumCalendar';
import { formatQuizOptionLabel } from '@/utils/quizOptionLabel';

import { formatSeconds } from '../LearningPage/learningShared';

import type { QualityOption, QuizClockAnchor } from './PlayerPage.types';
import { DEFAULT_QUALITY_OPTIONS, FIXED_PLAYER_CALENDAR_CELL_COUNT } from './PlayerPage.types';

type UnknownRecord = Record<string, unknown>;

export type HlsLoaderConstructor = typeof Hls.DefaultConfig.loader;
type HlsLoaderInstance = InstanceType<HlsLoaderConstructor>;

export const formatQualityLabel = (level: {
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

export const buildQualityOptions = (
  levels: Array<{ bitrate?: number; height?: number; name?: string; width?: number }>,
) => {
  const dedupedByLabel = new Map<string, QualityOption>();

  levels.forEach((level, index) => {
    const label = formatQualityLabel(level);
    dedupedByLabel.set(label, { label, levelIndex: index });
  });

  return [...DEFAULT_QUALITY_OPTIONS, ...dedupedByLabel.values()];
};

export const createProtectedHlsLoader = (hlsKeyUrl: string): HlsLoaderConstructor => {
  const DefaultLoader = Hls.DefaultConfig.loader;
  const isEncryptedHlsKeyRequest = (url: string) => {
    try {
      return new URL(url, window.location.origin).pathname.endsWith('/enc.key');
    } catch {
      return url.endsWith('/enc.key') || url === 'enc.key';
    }
  };

  return class ProtectedHlsLoader extends DefaultLoader {
    override load: HlsLoaderInstance['load'] = (context, config, callbacks) => {
      const shouldUseProtectedKeyUrl =
        ('type' in context && context.type === 'key') || isEncryptedHlsKeyRequest(context.url);
      const nextContext = shouldUseProtectedKeyUrl
        ? {
            ...context,
            url: hlsKeyUrl,
          }
        : context;

      super.load(nextContext, config, callbacks);
    };
  };
};

export const normalizeProtectedHlsKeyUrl = (hlsKeyUrl: string): string => {
  if (!hlsKeyUrl || typeof window === 'undefined') {
    return hlsKeyUrl;
  }

  try {
    const isRootRelativeUrl = hlsKeyUrl.startsWith('/');
    const parsed = new URL(hlsKeyUrl, window.location.origin);
    if (window.location.protocol === 'https:' && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    if (isRootRelativeUrl) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return hlsKeyUrl;
  }
};

export const formatPlaybackWatermarkText = (watermarkText: string | null | undefined): string => {
  if (!watermarkText) {
    return '';
  }

  return watermarkText
    .replace(/\*/g, '')
    .replace(/\s*[·-]\s*(\d{4})\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

export const buildPlaybackRequestPrefix = (streamUrl: string): string | null => {
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

export const normalizeQuizAnswers = (answers: Record<number, number[]>) => {
  return Object.fromEntries(
    Object.entries(answers).map(([questionId, optionIds]) => {
      const uniqueSortedOptionIds = [...new Set(optionIds)].sort((left, right) => left - right);
      return [Number(questionId), uniqueSortedOptionIds];
    }),
  ) as Record<number, number[]>;
};

export const clampQuestionIndex = (index: number, questionCount: number) => {
  if (questionCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), questionCount - 1);
};

export const resolveQuizElapsedSeconds = (
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

export const formatScheduleDate = (dateValue: string | null) => {
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

export const normalizeScheduleClock = (value: string | null | undefined) => {
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

export const formatScheduleTime = (schedule: ProgramCurriculumScheduleItem) => {
  const startTime = normalizeScheduleClock(schedule.startTime);
  const endTime = normalizeScheduleClock(schedule.endTime);

  if (startTime && endTime) {
    return `${startTime}~${endTime}`;
  }

  return startTime ?? endTime ?? '';
};

export const getLessonScheduleLabel = (lesson: ProgramCurriculumLesson) => {
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

export const formatProblemTimeLimit = (seconds: number | null | undefined) => {
  if (!seconds || seconds <= 0) {
    return '시간 제한 없음';
  }

  return `제한시간 ${formatSeconds(seconds)}`;
};

export const formatProblemQuestionCount = (questionCount: number | null | undefined) => {
  return typeof questionCount === 'number' ? `${String(questionCount)}문항` : null;
};

export const formatResourceFileTypeLabel = (attachment: LearningPlayerResourceAttachment) => {
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

export const formatResourceFileSize = (fileSize: number | null | undefined) => {
  if (!fileSize || fileSize <= 0) {
    return '-';
  }

  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)}MB`;
  }

  return `${String(Math.max(1, Math.round(fileSize / 1024)))}KB`;
};

export const formatResourceUpdatedDate = (dateValue: string | null | undefined) => {
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

export const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const getStringValue = (record: UnknownRecord, keys: readonly string[]): string | null => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
};

export const getNumberValue = (record: UnknownRecord, keys: readonly string[]): number | null => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
};

export const getBooleanValue = (record: UnknownRecord, keys: readonly string[]): boolean | null => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'boolean') {
      return value;
    }
  }

  return null;
};

export const normalizeResourceAttachment = (
  value: unknown,
  fallbackIndex: number,
): LearningPlayerResourceAttachment | null => {
  if (!isRecord(value)) {
    return null;
  }

  const fileName = getStringValue(value, ['fileName', 'filename', 'name']);

  if (!fileName) {
    return null;
  }

  return {
    description: getStringValue(value, ['description']),
    downloadable: getBooleanValue(value, ['downloadable']) ?? true,
    downloadCount: getNumberValue(value, ['downloadCount']) ?? 0,
    downloadLimit: getNumberValue(value, ['downloadLimit']) ?? 3,
    fileName,
    fileSize: getNumberValue(value, ['fileSize', 'size']),
    fileUrl: getStringValue(value, ['fileUrl', 'downloadUrl', 'url']),
    id: getNumberValue(value, ['id', 'documentId', 'resourceId']) ?? fallbackIndex + 1,
    mimeType: getStringValue(value, ['mimeType', 'contentType']),
    remainingDownloadCount: getNumberValue(value, ['remainingDownloadCount']) ?? 3,
    sortOrder: getNumberValue(value, ['sortOrder', 'order']) ?? fallbackIndex,
    title: getStringValue(value, ['title']),
    updatedAt: getStringValue(value, ['updatedAt', 'createdAt']),
  };
};

export const normalizeResourceAttachmentList = (
  value: unknown,
): LearningPlayerResourceAttachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeResourceAttachment(item, index))
    .filter((item): item is LearningPlayerResourceAttachment => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
};

export const getRecordArrayByKey = (
  record: UnknownRecord,
  keys: readonly string[],
  id: number | string,
) => {
  const normalizedId = String(id);

  for (const key of keys) {
    const mapValue = record[key];

    if (!isRecord(mapValue)) {
      continue;
    }

    const attachments = normalizeResourceAttachmentList(mapValue[normalizedId]);

    if (attachments.length) {
      return attachments;
    }
  }

  return [];
};

export const resolveLessonResourceAttachments = (
  snapshot: LearningPlayerSnapshot | undefined,
  lesson: ProgramCurriculumLesson | null,
): LearningPlayerResourceAttachment[] => {
  if (!snapshot || !lesson) {
    return [];
  }

  const attachmentsByLessonId = normalizeResourceAttachmentList(
    snapshot.resourceAttachmentsByLessonId?.[lesson.id],
  );

  if (attachmentsByLessonId.length) {
    return attachmentsByLessonId;
  }

  const snapshotRecord = snapshot as unknown as UnknownRecord;
  const fallbackByLessonId = getRecordArrayByKey(
    snapshotRecord,
    ['resourcesByLessonId', 'documentsByLessonId', 'attachmentsByLessonId'],
    lesson.id,
  );

  if (fallbackByLessonId.length) {
    return fallbackByLessonId;
  }

  const lessonRecord = lesson as unknown as UnknownRecord;
  const fallbackFromLesson = normalizeResourceAttachmentList(
    lessonRecord['resourceAttachments'] ??
      lessonRecord['resources'] ??
      lessonRecord['documents'] ??
      lessonRecord['attachments'],
  );

  if (fallbackFromLesson.length) {
    return fallbackFromLesson;
  }

  const lectureId = snapshot.lessonPlaybackById[lesson.id]?.lectureId ?? lesson.lectureId ?? null;

  if (!lectureId) {
    return [];
  }

  return getRecordArrayByKey(
    snapshotRecord,
    ['resourceAttachmentsByLectureId', 'resourcesByLectureId', 'documentsByLectureId'],
    lectureId,
  );
};

export interface OfflineScheduleEntry {
  absent: boolean;
  attendanceCompleted: boolean;
  date: string | null;
  id: string;
  location: string | null;
  notes: string | null;
  ruleId: number | null;
  timeLabel: string | null;
}

export const buildOfflineScheduleEntries = (
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

export const getLessonSummaryActionLabel = (
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

export const getOfflineSidebarState = (lesson: ProgramCurriculumLesson) => {
  if (lesson.deliveryType !== 'offline') {
    return null;
  }

  return lesson.offlineSchedules?.some((schedule) => schedule.absent === true)
    ? { label: '불참', tone: 'noshow' as const }
    : null;
};

export const getQuizSidebarStatusLabel = (
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

export const formatSelectedQuizAnswerLabel = (
  question: StudentProblem['questions'][number],
  selectedOptionIds: number[],
) => {
  if (!selectedOptionIds.length) {
    return null;
  }

  const optionLabelById = new Map(
    question.options.map((option, optionIndex) => [option.id, formatQuizOptionLabel(optionIndex)]),
  );
  const selectedOptionLabels = selectedOptionIds
    .map((optionId) => optionLabelById.get(optionId))
    .filter((optionLabel): optionLabel is string => optionLabel !== undefined);

  if (!selectedOptionLabels.length) {
    return null;
  }

  return selectedOptionLabels.join(', ');
};

export const formatQuizQuestionLabel = (index: number) => {
  return `Question ${String(index + 1).padStart(2, '0')}`;
};

export const getLessonMetaItems = (lesson: ProgramCurriculumLesson) => {
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

export const formatPracticumReservationDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '예약 날짜 확인';
  }

  return date.toLocaleString('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    year: 'numeric',
  });
};

export const formatPracticumModalDate = (value: string) => {
  const date = new Date(`${value}T00:00:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return formatDate(value);
  }

  const parts = new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    year: 'numeric',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((accumulator, part) => {
      if (part.type !== 'literal') {
        accumulator[part.type] = part.value;
      }
      return accumulator;
    }, {});

  const weekday = parts['weekday'];
  return `${parts['year'] ?? ''}년 ${parts['month'] ?? ''} ${parts['day'] ?? ''}일${weekday ? ` (${weekday})` : ''}`.trim();
};

export const sortPracticumSlots = (slots: PracticumSlot[]) => {
  return [...slots].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
};

export const isPracticumSlotInPast = (slot: PracticumSlot) => Date.parse(slot.startAt) < Date.now();

export const isPracticumSlotReservable = (slot: PracticumSlot) =>
  slot.slotStatus === 'OPEN' && !slot.full && !isPracticumSlotInPast(slot);

export type PracticumSidebarStateTone = 'completed' | 'cta' | 'noshow' | 'scheduled';

export interface PracticumSidebarState {
  label: string;
  tone: PracticumSidebarStateTone;
}

export interface PendingPracticumSlot {
  mode: 'move' | 'reserve';
  slot: PracticumSlot;
}

export const getPracticumReservationKind = (reservation: PracticumReservation) => {
  if (reservation.status === 'COMPLETED') {
    return 'completed';
  }
  if (reservation.status === 'NO_SHOW') {
    return 'noshow';
  }

  return Date.parse(reservation.endAt) < Date.now() ? 'completed' : 'scheduled';
};

export const resolvePracticumSidebarState = (
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

export const resolvePracticumLessonBadgeLabel = (
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

  return `예약 날짜 ${formatPracticumReservationDateTime(latestReservation.startAt)}`;
};

export const getPracticumDefaultMonthValue = (lecture: EnrollmentPracticumLecture | null) => {
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

export const getPracticumDefaultSelectedDate = (
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

export const getMonthYear = (monthValue: string): number => {
  return Number(monthValue.split('-')[0]);
};

export const getMonthNumber = (monthValue: string): number => {
  return Number(monthValue.split('-')[1]);
};

export const buildMonthValue = (year: number, month: number): string => {
  return `${String(year)}-${String(month).padStart(2, '0')}`;
};

export const shiftMonthValue = (monthValue: string, offset: number): string => {
  const year = getMonthYear(monthValue);
  const month = getMonthNumber(monthValue);
  return toMonthValue(new Date(year, month - 1 + offset, 1));
};

export const shiftMonthYear = (monthValue: string, offset: number): string => {
  return buildMonthValue(getMonthYear(monthValue) + offset, getMonthNumber(monthValue));
};

export const buildFixedPlayerCalendarCells = (monthValue: string) => {
  const cells = buildCalendarCells(monthValue);

  return [
    ...cells,
    ...Array.from({ length: Math.max(0, FIXED_PLAYER_CALENDAR_CELL_COUNT - cells.length) }, () => ({
      date: null,
      isCurrentMonth: false,
    })),
  ];
};
