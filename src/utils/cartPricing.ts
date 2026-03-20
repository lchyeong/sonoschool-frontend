import type {
  AppliedCoupon,
  CartItem,
  CartSummary,
  CouponAppliesTo,
  UserCoupon,
} from '@/types/mypage';
import { isOnlineProgramType, matchesProgramTypeFilter } from '@/utils/programType';

export interface CouponEvaluation {
  applicableItems: CartItem[];
  discountAmount: number;
  isApplicable: boolean;
  reason: string | null;
}

export interface SelectedCartPricing {
  selectedItems: CartItem[];
  itemCount: number;
  onlineItemCount: number;
  offlineItemCount: number;
  totalOriginalPrice: number;
  itemDiscountAmount: number;
  couponDiscountAmount: number;
  totalDiscountAmount: number;
  totalPayablePrice: number;
  appliedCoupon: AppliedCoupon | null;
}

const resolveCouponItems = (items: CartItem[], appliesTo: CouponAppliesTo) => {
  if (appliesTo === 'ALL') {
    return items;
  }

  return items.filter((item) => matchesProgramTypeFilter(item.programType, appliesTo));
};

const isCouponDateInvalid = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return Number.isNaN(new Date(value).getTime());
};

export const isCouponWithinPeriod = (
  coupon: UserCoupon,
  referenceDate = new Date(),
): { isValid: boolean; reason: string | null } => {
  if (isCouponDateInvalid(coupon.validFromAt) || isCouponDateInvalid(coupon.expiresAt)) {
    return {
      isValid: false,
      reason: '쿠폰 사용 기간 정보를 확인할 수 없습니다.',
    };
  }

  const now = referenceDate.getTime();
  const validFromTime = coupon.validFromAt ? new Date(coupon.validFromAt).getTime() : null;
  const expiresAtTime = new Date(coupon.expiresAt).getTime();

  if (validFromTime !== null && now < validFromTime) {
    return {
      isValid: false,
      reason: '아직 사용할 수 없는 쿠폰입니다.',
    };
  }

  if (now > expiresAtTime) {
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
  selectedItems: CartItem[],
  referenceDate = new Date(),
): CouponEvaluation => {
  if (!coupon.usable) {
    return {
      applicableItems: [],
      discountAmount: 0,
      isApplicable: false,
      reason: '현재 사용할 수 없는 쿠폰입니다.',
    };
  }

  const periodValidation = isCouponWithinPeriod(coupon, referenceDate);

  if (!periodValidation.isValid) {
    return {
      applicableItems: [],
      discountAmount: 0,
      isApplicable: false,
      reason: periodValidation.reason,
    };
  }

  const applicableItems = resolveCouponItems(selectedItems, coupon.appliesTo);

  if (!applicableItems.length) {
    return {
      applicableItems,
      discountAmount: 0,
      isApplicable: false,
      reason:
        coupon.appliesTo === 'ALL'
          ? '선택한 항목에 적용할 수 없습니다.'
          : `${coupon.appliesTo === 'ONLINE' ? '온라인' : '오프라인'} 항목을 선택해야 합니다.`,
    };
  }

  const applicableAmount = applicableItems.reduce((total, item) => total + item.payablePrice, 0);

  if (applicableAmount < coupon.minimumOrderAmount) {
    return {
      applicableItems,
      discountAmount: 0,
      isApplicable: false,
      reason: `${new Intl.NumberFormat('ko-KR').format(coupon.minimumOrderAmount)}원 이상 결제 시 사용할 수 있습니다.`,
    };
  }

  const discountAmount =
    coupon.discountType === 'PERCENTAGE'
      ? Math.min(Math.round((applicableAmount * coupon.discountValue) / 100), applicableAmount)
      : Math.min(coupon.discountValue, applicableAmount);

  return {
    applicableItems,
    discountAmount,
    isApplicable: discountAmount > 0,
    reason: discountAmount > 0 ? null : '할인 금액을 계산하지 못했습니다.',
  };
};

export const calculateSelectedCartPricing = (
  cart: CartSummary | null | undefined,
  selectedItemIds: number[],
  coupons: UserCoupon[],
  selectedCouponId: number | null,
): SelectedCartPricing => {
  const selectedItems = (cart?.items ?? []).filter((item) => selectedItemIds.includes(item.id));
  const totalOriginalPrice = selectedItems.reduce((total, item) => total + item.originalPrice, 0);
  const selectedPayablePrice = selectedItems.reduce((total, item) => total + item.payablePrice, 0);
  const itemDiscountAmount = totalOriginalPrice - selectedPayablePrice;
  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId) ?? null;
  const couponEvaluation = selectedCoupon
    ? evaluateCouponForItems(selectedCoupon, selectedItems)
    : null;
  const couponDiscountAmount =
    couponEvaluation?.isApplicable === true ? couponEvaluation.discountAmount : 0;

  return {
    selectedItems,
    itemCount: selectedItems.length,
    onlineItemCount: selectedItems.filter((item) => isOnlineProgramType(item.programType)).length,
    offlineItemCount: selectedItems.filter((item) => item.programType === 'OFFLINE').length,
    totalOriginalPrice,
    itemDiscountAmount,
    couponDiscountAmount,
    totalDiscountAmount: itemDiscountAmount + couponDiscountAmount,
    totalPayablePrice: Math.max(selectedPayablePrice - couponDiscountAmount, 0),
    appliedCoupon:
      selectedCoupon && couponEvaluation?.isApplicable
        ? {
            code: selectedCoupon.code,
            discountAmount: couponEvaluation.discountAmount,
            discountType: selectedCoupon.discountType,
            discountValue: selectedCoupon.discountValue,
            id: selectedCoupon.id,
            name: selectedCoupon.name,
          }
        : null,
  };
};
