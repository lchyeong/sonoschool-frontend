import { describe, expect, it } from 'vitest';

import { resolveVisibleReviewPreviewIds } from './programPageDetailShared';

describe('resolveVisibleReviewPreviewIds', () => {
  it('트랙 안에 완전히 들어온 후기만 반환한다', () => {
    expect(
      resolveVisibleReviewPreviewIds({ left: 28, right: 362 }, [
        { left: 28, reviewId: 'review-1', right: 362 },
        { left: 374, reviewId: 'review-2', right: 708 },
      ]),
    ).toEqual(['review-1']);
  });

  it('완전히 보이는 후기가 여러 개면 모두 반환한다', () => {
    expect(
      resolveVisibleReviewPreviewIds({ left: 0, right: 720 }, [
        { left: 0, reviewId: 'review-1', right: 348 },
        { left: 360, reviewId: 'review-2', right: 708 },
        { left: 720, reviewId: 'review-3', right: 1068 },
      ]),
    ).toEqual(['review-1', 'review-2']);
  });

  it('완전히 보이는 후기가 없으면 가시 면적이 가장 큰 후기를 반환한다', () => {
    expect(
      resolveVisibleReviewPreviewIds({ left: 28, right: 362 }, [
        { left: -112, reviewId: 'review-1', right: 222 },
        { left: 234, reviewId: 'review-2', right: 568 },
        { left: 580, reviewId: 'review-3', right: 914 },
      ]),
    ).toEqual(['review-1']);
  });

  it('가시 면적이 같으면 DOM 순서상 앞선 후기를 안정적으로 유지한다', () => {
    expect(
      resolveVisibleReviewPreviewIds({ left: 0, right: 334 }, [
        { left: -173, reviewId: 'review-1', right: 161 },
        { left: 173, reviewId: 'review-2', right: 507 },
      ]),
    ).toEqual(['review-1']);
  });

  it('트랙과 겹치는 후기가 없으면 빈 배열을 반환한다', () => {
    expect(
      resolveVisibleReviewPreviewIds({ left: 0, right: 334 }, [
        { left: 346, reviewId: 'review-1', right: 680 },
        { left: 692, reviewId: 'review-2', right: 1026 },
      ]),
    ).toEqual([]);
  });

  it('후기가 없으면 빈 배열을 반환한다', () => {
    expect(resolveVisibleReviewPreviewIds({ left: 0, right: 334 }, [])).toEqual([]);
  });
});
