import { describe, expect, it } from 'vitest';

import { resolveProgramCatalogStatus, shouldMuteProgramThumbnail } from './programCatalogStatus';

describe('programCatalogStatus', () => {
  it('mutes thumbnails for closed or unavailable catalog statuses', () => {
    expect(shouldMuteProgramThumbnail('STARTED')).toBe(true);
    expect(shouldMuteProgramThumbnail('CLOSED')).toBe(true);
    expect(shouldMuteProgramThumbnail('ENDED')).toBe(true);
    expect(shouldMuteProgramThumbnail('FULL')).toBe(true);
  });

  it('keeps active thumbnails in color', () => {
    expect(shouldMuteProgramThumbnail('OPEN')).toBe(false);
    expect(
      shouldMuteProgramThumbnail({ catalogStatus: 'STARTED', enrollmentAvailable: true }),
    ).toBe(false);
    expect(shouldMuteProgramThumbnail(undefined)).toBe(false);
    expect(shouldMuteProgramThumbnail(null)).toBe(false);
  });

  it('keeps started but unavailable thumbnails muted', () => {
    expect(
      shouldMuteProgramThumbnail({ catalogStatus: 'STARTED', enrollmentAvailable: false }),
    ).toBe(true);
  });

  it('falls back to remaining seats only when catalog status is missing', () => {
    expect(resolveProgramCatalogStatus({ remainingSeatsCount: 0 })).toBe('FULL');
    expect(resolveProgramCatalogStatus({ remainingSeatsCount: 10 })).toBe('OPEN');
    expect(resolveProgramCatalogStatus({ remainingSeatsLabel: '수강 가능 인원 0명 남음' })).toBe(
      'FULL',
    );
    expect(resolveProgramCatalogStatus({ remainingSeatsLabel: '수강 가능 인원 10명 남음' })).toBe(
      'OPEN',
    );
    expect(resolveProgramCatalogStatus({ remainingSeatsLabel: '정원 마감' })).toBe('FULL');
  });
});
