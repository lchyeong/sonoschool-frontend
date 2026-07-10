import type { ProgramCatalogStatus, ProgramLectureCard } from '@/types/programCatalog';
import { resolveProgramCatalogStatus } from '@/utils/programCatalogStatus';

export type ProgramHubLectureTabKey =
  | 'all'
  | 'recruiting'
  | 'alwaysRecruiting'
  | 'scheduled'
  | 'closed';

export type ProgramHubLectureCategory = Exclude<ProgramHubLectureTabKey, 'all'>;

interface ScheduleLabelRange {
  endTime: number;
  startTime: number;
}

const CLOSED_CATALOG_STATUSES = new Set<ProgramCatalogStatus>([
  'CLOSED',
  'STARTED',
  'ENDED',
  'FULL',
]);

export const parseProgramDateTime = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
};

const parseScheduleLabelRange = (scheduleLabel: string): ScheduleLabelRange | null => {
  const matches = [...scheduleLabel.matchAll(/(\d{4})\.(\d{2})(?:\.(\d{2}))?/g)];
  const firstMatch = matches.at(0);
  const lastMatch = matches.at(-1);

  if (!firstMatch || !lastMatch) {
    return null;
  }

  const startYear = Number(firstMatch[1]);
  const startMonth = Number(firstMatch[2]);
  const startDay = firstMatch[3] ? Number(firstMatch[3]) : 1;
  const endYear = Number(lastMatch[1]);
  const endMonth = Number(lastMatch[2]);
  const endDay = lastMatch[3]
    ? Number(lastMatch[3])
    : new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const startTime = Date.UTC(startYear, startMonth - 1, startDay);
  const endTime = Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return null;
  }

  return { endTime, startTime };
};

export const getProgramRecruitmentStartTime = (lecture: ProgramLectureCard): number | null => {
  return (
    parseProgramDateTime(lecture.saleStartAt) ??
    parseScheduleLabelRange(lecture.scheduleLabel)?.startTime ??
    null
  );
};

export const getProgramRecruitmentEndTime = (lecture: ProgramLectureCard): number | null => {
  return (
    parseProgramDateTime(lecture.saleEndAt) ??
    parseScheduleLabelRange(lecture.scheduleLabel)?.endTime ??
    null
  );
};

export const classifyProgramHubLecture = (
  lecture: ProgramLectureCard,
  nowTime: number,
): ProgramHubLectureCategory => {
  const catalogStatus = resolveProgramCatalogStatus(lecture);

  if (CLOSED_CATALOG_STATUSES.has(catalogStatus)) {
    return 'closed';
  }

  const recruitmentStartTime = getProgramRecruitmentStartTime(lecture);
  const recruitmentEndTime = getProgramRecruitmentEndTime(lecture);

  if (recruitmentEndTime !== null && nowTime > recruitmentEndTime) {
    return 'closed';
  }

  if (
    catalogStatus === 'SCHEDULED' ||
    (recruitmentStartTime !== null && nowTime < recruitmentStartTime)
  ) {
    return 'scheduled';
  }

  if (recruitmentStartTime === null && recruitmentEndTime === null) {
    return 'alwaysRecruiting';
  }

  return 'recruiting';
};
