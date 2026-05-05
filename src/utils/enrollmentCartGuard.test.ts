import { describe, expect, it } from 'vitest';

import { blocksProgramCartAction } from './enrollmentCartGuard';

describe('blocksProgramCartAction', () => {
  it('allows a cancelled enrollment to be added to cart again', () => {
    expect(blocksProgramCartAction({ learningStatus: 'CANCELLED', status: 'CANCELLED' })).toBe(
      false,
    );
  });

  it('allows cart action when either enrollment status marks cancellation', () => {
    expect(blocksProgramCartAction({ learningStatus: 'IN_PROGRESS', status: 'CANCELLED' })).toBe(
      false,
    );
    expect(blocksProgramCartAction({ learningStatus: 'CANCELLED', status: 'ACTIVE' })).toBe(false);
  });

  it('blocks active paid enrollments', () => {
    expect(blocksProgramCartAction({ learningStatus: 'IN_PROGRESS', status: 'ACTIVE' })).toBe(true);
    expect(blocksProgramCartAction({ learningStatus: 'PENDING', status: 'ACTIVE' })).toBe(true);
  });
});
