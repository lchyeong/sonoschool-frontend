import { describe, expect, it } from 'vitest';

import type { CartItem, UserCoupon } from '@/types/mypage';
import { evaluateCouponForItems, isCouponWithinPeriod } from '@/utils/cartPricing';

const testCartItems: CartItem[] = [
  {
    addedAt: '2026-03-19T09:00:00Z',
    detailPath: '/programs/test/online',
    id: 1,
    instructorName: '테스트 강사',
    originalPrice: 120000,
    payablePrice: 100000,
    programId: 1001,
    programType: 'ONLINE',
    saleEndAt: null,
    salePrice: 100000,
    saleStartAt: null,
    thumbnailUrl: null,
    title: '온라인 테스트 강의',
  },
  {
    addedAt: '2026-03-19T09:05:00Z',
    detailPath: '/programs/test/hybrid',
    id: 2,
    instructorName: '테스트 강사',
    originalPrice: 180000,
    payablePrice: 150000,
    programId: 1002,
    programType: 'HYBRID',
    saleEndAt: null,
    salePrice: 150000,
    saleStartAt: null,
    thumbnailUrl: null,
    title: '실습 포함 온라인 과정',
  },
];

const createCoupon = (overrides?: Partial<UserCoupon>): UserCoupon => {
  return {
    appliesTo: 'ONLINE',
    code: 'TEST10',
    description: '테스트 쿠폰',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    expiresAt: '2026-03-31T14:59:59Z',
    id: 1,
    issuedAt: '2026-03-10T09:00:00Z',
    minimumOrderAmount: 50000,
    name: '테스트 10%',
    usable: true,
    validFromAt: '2026-03-10T09:00:00Z',
    ...overrides,
  };
};

describe('cartPricing', () => {
  it('treats a coupon as valid only within its active period', () => {
    expect(isCouponWithinPeriod(createCoupon(), new Date('2026-03-19T09:00:00Z'))).toMatchObject({
      isValid: true,
      reason: null,
    });

    expect(
      isCouponWithinPeriod(
        createCoupon({ validFromAt: '2026-03-25T00:00:00Z' }),
        new Date('2026-03-19T09:00:00Z'),
      ),
    ).toMatchObject({
      isValid: false,
      reason: '아직 사용할 수 없는 쿠폰입니다.',
    });

    expect(
      isCouponWithinPeriod(
        createCoupon({ expiresAt: '2026-03-18T23:59:59Z' }),
        new Date('2026-03-19T09:00:00Z'),
      ),
    ).toMatchObject({
      isValid: false,
      reason: '사용 기간이 만료된 쿠폰입니다.',
    });
  });

  it('rejects coupons that are outside the valid period when evaluating a checkout', () => {
    const evaluation = evaluateCouponForItems(
      createCoupon({ expiresAt: '2026-03-18T23:59:59Z' }),
      testCartItems,
      new Date('2026-03-19T09:00:00Z'),
    );

    expect(evaluation).toMatchObject({
      discountAmount: 0,
      isApplicable: false,
      reason: '사용 기간이 만료된 쿠폰입니다.',
    });
  });

  it('treats HYBRID items as online targets for online coupons', () => {
    const evaluation = evaluateCouponForItems(
      createCoupon(),
      [testCartItems[1]],
      new Date('2026-03-19T09:00:00Z'),
    );

    expect(evaluation).toMatchObject({
      discountAmount: 15000,
      isApplicable: true,
      reason: null,
    });
    expect(evaluation.applicableItems).toHaveLength(1);
    expect(evaluation.applicableItems[0]?.programType).toBe('HYBRID');
  });
});
