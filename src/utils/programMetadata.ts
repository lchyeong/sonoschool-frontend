import type {
  ProgramCurriculumLesson,
  ProgramCurriculumSection,
  ProgramCurriculumTrack,
} from '@/types/programCatalog';

type AdminProgramAccessPolicy = 'cohort' | 'limited-window' | 'unlimited';
type AdminProgramFormat = 'online' | 'offline' | 'hybrid';

interface ProgramWindow {
  endDate: string | null;
  startDate: string | null;
}

interface ProgramDisplayTextOptions {
  accessPolicy: AdminProgramAccessPolicy;
  curriculumTrack?: ProgramCurriculumTrack | null | undefined;
  format: AdminProgramFormat;
  learningEndDate: string | null;
  learningStartDate: string | null;
  operationFallbackLabel?: string | null;
  registrationEndDate: string | null;
  registrationFallbackLabel?: string | null;
  registrationStartDate: string | null;
}

export interface ProgramDisplayText {
  durationLabel: string;
  effectiveLearningEndDate: string | null;
  effectiveLearningStartDate: string | null;
  formatLabel: string;
  operationPeriodLabel: string | null;
  registrationPeriodLabel: string;
  scheduleLabel: string;
  tuitionLabel: string;
}

const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatIsoDateLabel = (value: string | null | undefined): string | null => {
  const parsed = parseIsoDate(value);

  if (!parsed) {
    return value?.trim() ? value.trim() : null;
  }

  return `${String(parsed.getUTCFullYear())}.${String(parsed.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}.${String(parsed.getUTCDate()).padStart(2, '0')}`;
};

const getInclusiveDayCount = (startDate: string | null, endDate: string | null): number | null => {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start || !end) {
    return null;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
};

const buildDateRangeLabel = (
  startDate: string | null,
  endDate: string | null,
  fallbackLabel: string,
): string => {
  const startLabel = formatIsoDateLabel(startDate);
  const endLabel = formatIsoDateLabel(endDate);

  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  }

  if (startLabel) {
    return `${startLabel} 시작`;
  }

  if (endLabel) {
    return `${endLabel} 종료`;
  }

  return fallbackLabel;
};

export const formatProgramMinutesLabel = (value: number): string => {
  const normalizedValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

  if (normalizedValue <= 0) {
    return '0분';
  }

  const hours = Math.floor(normalizedValue / 60);
  const minutes = normalizedValue % 60;

  if (hours === 0) {
    return `${String(minutes)}분`;
  }

  if (minutes === 0) {
    return `${String(hours)}시간`;
  }

  return `${String(hours)}시간 ${String(minutes)}분`;
};

const getFormatLabel = (
  format: AdminProgramFormat,
  accessPolicy: AdminProgramAccessPolicy,
): string => {
  if (accessPolicy === 'unlimited') {
    return '온라인 무제한';
  }

  if (format === 'online') {
    return '온라인 기간제';
  }

  if (format === 'hybrid') {
    return '온라인 과정 · 실습 포함';
  }

  return '오프라인 정규';
};

export const formatDurationFromDates = (
  format: AdminProgramFormat,
  learningStartDate: string | null,
  learningEndDate: string | null,
  accessPolicy: AdminProgramAccessPolicy,
): string => {
  if (accessPolicy === 'unlimited') {
    return '무제한 수강';
  }

  const inclusiveDayCount = getInclusiveDayCount(learningStartDate, learningEndDate);

  if (!inclusiveDayCount) {
    return format === 'online' ? '온라인 기간제' : '기간 추후 안내';
  }

  if (inclusiveDayCount % 7 === 0) {
    const weekCount = inclusiveDayCount / 7;
    return format === 'online' ? `온라인 ${String(weekCount)}주` : `${String(weekCount)}주`;
  }

  if (inclusiveDayCount <= 2 && format !== 'online') {
    return `${String(inclusiveDayCount)}일 집중`;
  }

  return format === 'online'
    ? `온라인 ${String(inclusiveDayCount)}일`
    : `${String(inclusiveDayCount)}일`;
};

export const deriveCurriculumLessonDurationLabel = (
  lesson: Pick<
    ProgramCurriculumLesson,
    'deliveryType' | 'durationMinutes' | 'endDate' | 'startDate'
  >,
): string => {
  if (lesson.deliveryType === 'online') {
    return formatProgramMinutesLabel(lesson.durationMinutes ?? 0);
  }

  if (lesson.deliveryType === 'problem') {
    return '문제 풀이';
  }

  if (lesson.deliveryType === 'resource') {
    return '첨부자료';
  }

  if (lesson.deliveryType === 'practicum') {
    return '실습 예약';
  }

  return buildDateRangeLabel(lesson.startDate, lesson.endDate, '오프라인 일정 추후 안내');
};

const getOfflineWindowFromLessons = (
  lessons: readonly Pick<ProgramCurriculumLesson, 'deliveryType' | 'endDate' | 'startDate'>[],
): ProgramWindow => {
  return lessons.reduce<ProgramWindow>(
    (accumulator, lesson) => {
      if (lesson.deliveryType !== 'offline') {
        return accumulator;
      }

      const start = lesson.startDate?.trim() ? lesson.startDate.trim() : null;
      const end = lesson.endDate?.trim() ? lesson.endDate.trim() : null;

      return {
        endDate:
          accumulator.endDate && end
            ? accumulator.endDate > end
              ? end
              : accumulator.endDate
            : (accumulator.endDate ?? end),
        startDate:
          accumulator.startDate && start
            ? accumulator.startDate < start
              ? accumulator.startDate
              : start
            : (accumulator.startDate ?? start),
      };
    },
    { endDate: null, startDate: null },
  );
};

const getSectionOfflineWindow = (
  section: Pick<ProgramCurriculumSection, 'lessons'>,
): ProgramWindow => {
  return getOfflineWindowFromLessons(section.lessons);
};

export const deriveCurriculumSectionDurationLabel = (
  section: Pick<ProgramCurriculumSection, 'lessons'>,
): string => {
  const onlineMinutesTotal = section.lessons.reduce((total, lesson) => {
    return lesson.deliveryType === 'online' ? total + (lesson.durationMinutes ?? 0) : total;
  }, 0);
  const offlineWindow = getSectionOfflineWindow(section);
  const hasOnlineLessons = section.lessons.some((lesson) => lesson.deliveryType === 'online');
  const hasOfflineLessons = section.lessons.some((lesson) => lesson.deliveryType === 'offline');

  if (hasOnlineLessons && hasOfflineLessons) {
    const offlineLabel = buildDateRangeLabel(
      offlineWindow.startDate,
      offlineWindow.endDate,
      '오프라인 일정 추후 안내',
    );

    return `오프라인 ${offlineLabel} · 온라인 ${formatProgramMinutesLabel(onlineMinutesTotal)}`;
  }

  if (hasOfflineLessons) {
    return buildDateRangeLabel(
      offlineWindow.startDate,
      offlineWindow.endDate,
      '오프라인 일정 추후 안내',
    );
  }

  if (hasOnlineLessons) {
    return `총 ${formatProgramMinutesLabel(onlineMinutesTotal)}`;
  }

  return `${String(section.lessons.length)}개 학습 항목`;
};

export const deriveCurriculumTrackOperationWindow = (
  curriculumTrack: ProgramCurriculumTrack | null | undefined,
): ProgramWindow => {
  if (!curriculumTrack) {
    return { endDate: null, startDate: null };
  }

  return getOfflineWindowFromLessons(
    curriculumTrack.sections.flatMap((section) => section.lessons),
  );
};

export const deriveProgramDisplayText = ({
  accessPolicy,
  curriculumTrack,
  format,
  learningEndDate,
  learningStartDate,
  operationFallbackLabel,
  registrationEndDate,
  registrationFallbackLabel,
  registrationStartDate,
}: ProgramDisplayTextOptions): ProgramDisplayText => {
  const providedLearningStartDate = learningStartDate?.trim() || null;
  const providedLearningEndDate = learningEndDate?.trim() || null;
  const curriculumOperationWindow =
    format === 'online'
      ? { endDate: null, startDate: null }
      : deriveCurriculumTrackOperationWindow(curriculumTrack);
  const effectiveLearningStartDate =
    format === 'online'
      ? providedLearningStartDate
      : (providedLearningStartDate ?? curriculumOperationWindow.startDate);
  const effectiveLearningEndDate =
    format === 'online'
      ? providedLearningEndDate
      : (providedLearningEndDate ?? curriculumOperationWindow.endDate);
  const formatLabel = getFormatLabel(format, accessPolicy);
  const durationLabel = formatDurationFromDates(
    format,
    effectiveLearningStartDate,
    effectiveLearningEndDate,
    accessPolicy,
  );

  let scheduleLabel = operationFallbackLabel?.trim() || '운영 일정 추후 안내';
  if (accessPolicy === 'unlimited') {
    scheduleLabel = '등록 후 바로 수강 · 무제한 시청';
  } else if (effectiveLearningStartDate && effectiveLearningEndDate) {
    scheduleLabel = `${buildDateRangeLabel(
      effectiveLearningStartDate,
      effectiveLearningEndDate,
      '운영 일정 추후 안내',
    )} 진행`;
  } else if (effectiveLearningStartDate) {
    scheduleLabel = buildDateRangeLabel(effectiveLearningStartDate, null, '운영 일정 추후 안내');
  }

  let registrationPeriodLabel = '모집 일정 추후 안내';
  if (accessPolicy === 'unlimited') {
    registrationPeriodLabel = '상시 모집';
  } else if (registrationStartDate?.trim() || registrationEndDate?.trim()) {
    registrationPeriodLabel = buildDateRangeLabel(
      registrationStartDate?.trim() || null,
      registrationEndDate?.trim() || null,
      '모집 일정 추후 안내',
    );
  } else if (registrationFallbackLabel?.trim()) {
    registrationPeriodLabel = registrationFallbackLabel.trim().replace(/^신청 기간\s*/, '');
  }

  let tuitionLabel = '수강 문의 후 상세 일정 안내';
  if (accessPolicy === 'unlimited') {
    tuitionLabel = '등록 후 즉시 수강 가능';
  } else if (registrationStartDate?.trim() && registrationEndDate?.trim()) {
    tuitionLabel = `신청 기간 ${buildDateRangeLabel(
      registrationStartDate.trim(),
      registrationEndDate.trim(),
      '모집 일정 추후 안내',
    )}`;
  } else if (format === 'online') {
    tuitionLabel = '온라인 등록 후 정해진 기간 동안 수강 가능';
  }

  const operationPeriodLabel =
    format === 'online'
      ? null
      : effectiveLearningStartDate || effectiveLearningEndDate
        ? buildDateRangeLabel(
            effectiveLearningStartDate,
            effectiveLearningEndDate,
            operationFallbackLabel?.trim() || '운영 일정 추후 안내',
          )
        : operationFallbackLabel?.trim() || '운영 일정 추후 안내';

  return {
    durationLabel,
    effectiveLearningEndDate,
    effectiveLearningStartDate,
    formatLabel,
    operationPeriodLabel,
    registrationPeriodLabel,
    scheduleLabel,
    tuitionLabel,
  };
};
