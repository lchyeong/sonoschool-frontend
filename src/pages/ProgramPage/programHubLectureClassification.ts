import type { ProgramCatalogStatus, ProgramLectureCard } from '@/types/programCatalog';
import { resolveProgramCatalogStatus } from '@/utils/programCatalogStatus';

export type ProgramHubLectureTabKey = 'all' | 'recruiting' | 'alwaysRecruiting' | 'closed';

export type ProgramHubLectureCategory = Exclude<ProgramHubLectureTabKey, 'all'>;

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

const parseScheduleLabelEndTime = (scheduleLabel: string): number | null => {
  const matches = [...scheduleLabel.matchAll(/(\d{4})\.(\d{2})(?:\.(\d{2}))?/g)];
  const lastMatch = matches.at(-1);

  if (!lastMatch) {
    return null;
  }

  const endYear = Number(lastMatch[1]);
  const endMonth = Number(lastMatch[2]);
  const endDay = lastMatch[3]
    ? Number(lastMatch[3])
    : new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const endTime = Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

  return Number.isNaN(endTime) ? null : endTime;
};

export const getProgramRecruitmentEndTime = (lecture: ProgramLectureCard): number | null => {
  return (
    parseProgramDateTime(lecture.saleEndAt) ??
    parseScheduleLabelEndTime(lecture.scheduleLabel) ??
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

  const recruitmentEndTime = getProgramRecruitmentEndTime(lecture);

  if (recruitmentEndTime !== null && nowTime > recruitmentEndTime) {
    return 'closed';
  }

  if (parseProgramDateTime(lecture.saleStartAt) === null && recruitmentEndTime === null) {
    return 'alwaysRecruiting';
  }

  return 'recruiting';
};
