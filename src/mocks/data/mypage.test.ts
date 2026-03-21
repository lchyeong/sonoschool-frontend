import { describe, expect, it } from 'vitest';

import {
  addMockMyCartItem,
  getMockMyApplicationSummary,
  getMockMyCart,
  getMockMyCoupons,
  getMockMyEnrollmentDetail,
  getMockMyEnrollments,
  getMockLearningPlayerSnapshot,
  getMockMyProfile,
  getMockMyRefunds,
  removeMockMyCartItem,
} from '@/mocks/data/mypage';

describe('mypage mock data', () => {
  it('provides expanded enrollment fixtures with matching detail data', () => {
    const enrollments = getMockMyEnrollments();

    expect(enrollments).toHaveLength(18);
    expect(enrollments.filter((item) => item.status === 'ACTIVE')).toHaveLength(8);
    expect(enrollments.filter((item) => item.status === 'EXPIRED')).toHaveLength(6);
    expect(enrollments.filter((item) => item.status === 'CANCELLED')).toHaveLength(4);

    expect(getMockMyEnrollmentDetail(104)?.programTitle).toBe('갑상선 초음파 판독 입문');
    expect(getMockMyEnrollmentDetail(105)?.completionRate).toBe(67);
    expect(getMockMyEnrollmentDetail(106)?.status).toBe('CANCELLED');
  });

  it('keeps cart totals and application summary aligned', () => {
    const cart = getMockMyCart();
    const summary = getMockMyApplicationSummary();

    expect(cart.itemCount).toBe(9);
    expect(cart.totalOriginalPrice).toBe(1574000);
    expect(cart.totalDiscountAmount).toBe(248000);
    expect(cart.totalPayablePrice).toBe(1326000);
    expect(cart.items[0]?.detailPath).toBe('/programs/doctor-course/pocus/fast/2026-mar-apr');

    expect(summary.onlineItems).toHaveLength(6);
    expect(summary.offlineItemCount).toBe(3);
    expect(summary.onlinePayablePrice).toBe(764000);
  });

  it('adds new cart items and keeps the application summary in sync', () => {
    const beforeCart = getMockMyCart();

    const updatedCart = addMockMyCartItem({
      instructorName: '장바구니 테스트 강사',
      originalPrice: 88000,
      payablePrice: 77000,
      programId: 8080,
      programType: 'HYBRID',
      salePrice: 77000,
      sourcePath: '/programs/test/detail',
      thumbnailUrl: null,
      title: '장바구니 테스트 코스',
    });
    const updatedSummary = getMockMyApplicationSummary();

    expect(updatedCart.itemCount).toBe(beforeCart.itemCount + 1);
    expect(updatedCart.items.filter((item) => item.title === '장바구니 테스트 코스')).toHaveLength(
      1,
    );
    expect(
      updatedSummary.onlineItems.filter((item) => item.title === '장바구니 테스트 코스'),
    ).toHaveLength(1);
    expect(updatedSummary.onlinePayablePrice).toBe(841000);
  });

  it('rejects duplicate cart items with a guide message', () => {
    expect(() =>
      addMockMyCartItem({
        instructorName: '중복 테스트 강사',
        originalPrice: 120000,
        payablePrice: 99000,
        programId: 2002,
        programType: 'ONLINE',
        salePrice: 99000,
        sourcePath: '/programs/duplicate/detail',
        thumbnailUrl: null,
        title: 'POCUS 워크숍',
      }),
    ).toThrowError('이미 장바구니에 담긴 강의입니다.');
  });

  it('removes cart items and keeps the application summary in sync', () => {
    const beforeCart = getMockMyCart();

    const updatedCart = removeMockMyCartItem(55);
    const updatedSummary = getMockMyApplicationSummary();

    expect(updatedCart.itemCount).toBe(beforeCart.itemCount - 1);
    expect(updatedCart.items.some((item) => item.id === 55)).toBe(false);
    expect(updatedSummary.onlineItems.some((item) => item.cartItemId === 55)).toBe(false);
    expect(updatedSummary.onlinePayablePrice).toBe(665000);
  });

  it('provides editable profile fields and refund fixtures', () => {
    const profile = getMockMyProfile();
    const coupons = getMockMyCoupons();
    const refunds = getMockMyRefunds();

    expect(profile.email).toBe('student01@example.com');
    expect(profile.marketingEmailOptIn).toBe(true);
    expect(profile.marketingSmsOptIn).toBe(false);
    expect(coupons).toHaveLength(5);
    expect(coupons[0]?.name).toBe('봄맞이 할인');

    expect(refunds).toHaveLength(6);
    expect(refunds.map((item) => item.status)).toEqual([
      'REFUNDED',
      'REFUND_REQUESTED',
      'CANCELLED',
      'REFUND_REQUESTED',
      'REFUNDED',
      'CANCELLED',
    ]);
  });

  it('provides player-ready snapshot data for active learning items only', () => {
    const activePlayerSnapshot = getMockLearningPlayerSnapshot(101);
    const cancelledPlayerSnapshot = getMockLearningPlayerSnapshot(106);

    expect(activePlayerSnapshot?.curriculumTrack.sections.length).toBeGreaterThan(0);
    expect(activePlayerSnapshot?.currentLessonId).toBe('enrollment-101-lesson-2');
    expect(activePlayerSnapshot?.completedLessonIds).toContain('enrollment-101-lesson-1');
    expect(activePlayerSnapshot?.lessonPlaybackById['enrollment-101-lesson-2']?.mimeType).toBe(
      'application/x-mpegURL',
    );
    expect(cancelledPlayerSnapshot).toBeNull();
  });
});
