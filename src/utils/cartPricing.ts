import type { CartItem, CartSummary, UserCoupon } from '@/types/mypage';
import { isOnlineProgramType } from '@/utils/programType';

export interface SelectedCartPricing {
  selectedItems: CartItem[];
  itemCount: number;
  onlineItemCount: number;
  offlineItemCount: number;
  totalOriginalPrice: number;
  itemDiscountAmount: number;
  totalPayablePrice: number;
}

export interface CouponPeriodEvaluation {
  isValid: boolean;
  reason: string | null;
}

export interface CouponEvaluation extends CouponPeriodEvaluation {
  applicableItems: CartItem[];
  discountAmount: number;
  isApplicable: boolean;
}

export const calculateSelectedCartPricing = (
  cart: CartSummary | null | undefined,
  selectedItemIds: number[],
): SelectedCartPricing => {
  const selectedItems = (cart?.items ?? []).filter((item) => selectedItemIds.includes(item.id));
  const totalOriginalPrice = selectedItems.reduce((total, item) => total + item.originalPrice, 0);
  const totalPayablePrice = selectedItems.reduce((total, item) => total + item.payablePrice, 0);

  return {
    selectedItems,
    itemCount: selectedItems.length,
    onlineItemCount: selectedItems.filter((item) => isOnlineProgramType(item.programType)).length,
    offlineItemCount: selectedItems.filter((item) => item.programType === 'OFFLINE').length,
    totalOriginalPrice,
    itemDiscountAmount: totalOriginalPrice - totalPayablePrice,
    totalPayablePrice,
  };
};

const toTime = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsedTime = Date.parse(value);
  return Number.isNaN(parsedTime) ? null : parsedTime;
};

const isCouponTargetMatch = (coupon: UserCoupon, item: CartItem): boolean => {
  switch (coupon.appliesTo) {
    case 'ALL':
      return true;
    case 'ONLINE':
      return isOnlineProgramType(item.programType);
    case 'OFFLINE':
      return item.programType === 'OFFLINE';
  }
};

export const isCouponWithinPeriod = (
  coupon: UserCoupon,
  now: Date = new Date(),
): CouponPeriodEvaluation => {
  const nowTime = now.getTime();
  const validFromTime = toTime(coupon.validFromAt);
  const expiresAtTime = toTime(coupon.expiresAt);

  if (validFromTime !== null && nowTime < validFromTime) {
    return {
      isValid: false,
      reason: '아직 사용할 수 없는 쿠폰입니다.',
    };
  }

  if (expiresAtTime !== null && nowTime > expiresAtTime) {
    return {
      isValid: false,
      reason: '사용 기간이 만료된 쿠폰입니다.',
    };
  }

  return {
    isValid: true,
    reason: null,
  };
};

export const evaluateCouponForItems = (
  coupon: UserCoupon,
  items: CartItem[],
  now: Date = new Date(),
): CouponEvaluation => {
  if (!coupon.usable) {
    return {
      applicableItems: [],
      discountAmount: 0,
      isApplicable: false,
      isValid: false,
      reason: '현재 사용할 수 없는 쿠폰입니다.',
    };
  }

  const periodEvaluation = isCouponWithinPeriod(coupon, now);
  if (!periodEvaluation.isValid) {
    return {
      applicableItems: [],
      discountAmount: 0,
      isApplicable: false,
      isValid: false,
      reason: periodEvaluation.reason,
    };
  }

  const applicableItems = items.filter((item) => isCouponTargetMatch(coupon, item));
  const applicableAmount = applicableItems.reduce((total, item) => total + item.payablePrice, 0);

  if (applicableItems.length === 0) {
    return {
      applicableItems,
      discountAmount: 0,
      isApplicable: false,
      isValid: true,
      reason: '쿠폰을 적용할 수 있는 상품이 없습니다.',
    };
  }

  if (applicableAmount < coupon.minimumOrderAmount) {
    return {
      applicableItems,
      discountAmount: 0,
      isApplicable: false,
      isValid: true,
      reason: '최소 주문 금액을 충족하지 않아 쿠폰을 사용할 수 없습니다.',
    };
  }

  const rawDiscountAmount =
    coupon.discountType === 'PERCENTAGE'
      ? Math.floor((applicableAmount * coupon.discountValue) / 100)
      : coupon.discountValue;
  const cappedDiscountAmount = coupon.maxDiscountAmount
    ? Math.min(rawDiscountAmount, coupon.maxDiscountAmount)
    : rawDiscountAmount;
  const discountAmount = Math.max(0, Math.min(cappedDiscountAmount, applicableAmount));

  return {
    applicableItems,
    discountAmount,
    isApplicable: discountAmount > 0,
    isValid: true,
    reason: discountAmount > 0 ? null : '쿠폰 할인 금액을 계산할 수 없습니다.',
  };
};
