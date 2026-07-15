import type { ProgramCatalogStatus } from '@/types/programCatalog';

export interface ProgramCatalogStatusSource {
  catalogStatus?: ProgramCatalogStatus | null | undefined;
  enrollmentAvailable?: boolean | null | undefined;
  remainingSeatsCount?: number | null | undefined;
  remainingSeatsLabel?: string | null | undefined;
}

const mutedProgramThumbnailStatuses = new Set<ProgramCatalogStatus>([
  'STARTED',
  'CLOSED',
  'ENDED',
  'FULL',
]);

const hasNoRemainingSeats = (remainingSeatsLabel: string | null | undefined): boolean => {
  if (!remainingSeatsLabel) {
    return false;
  }

  const normalizedLabel = remainingSeatsLabel.replace(/\s+/g, '');

  return (
    /(^|[^\d])0명/.test(normalizedLabel) ||
    normalizedLabel.includes('정원마감') ||
    normalizedLabel.includes('모집마감')
  );
};

export const resolveProgramCatalogStatus = (
  source: ProgramCatalogStatusSource,
): ProgramCatalogStatus => {
  if (source.catalogStatus) {
    return source.catalogStatus;
  }

  if (typeof source.remainingSeatsCount === 'number') {
    return source.remainingSeatsCount <= 0 ? 'FULL' : 'OPEN';
  }

  return hasNoRemainingSeats(source.remainingSeatsLabel) ? 'FULL' : 'OPEN';
};

export const shouldMuteProgramThumbnail = (
  statusOrSource: ProgramCatalogStatus | ProgramCatalogStatusSource | null | undefined,
): boolean => {
  if (!statusOrSource) {
    return false;
  }

  if (typeof statusOrSource !== 'string' && statusOrSource.enrollmentAvailable === true) {
    return false;
  }

  const catalogStatus =
    typeof statusOrSource === 'string'
      ? statusOrSource
      : resolveProgramCatalogStatus(statusOrSource);

  return mutedProgramThumbnailStatuses.has(catalogStatus);
};
