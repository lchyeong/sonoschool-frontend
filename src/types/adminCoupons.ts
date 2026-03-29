export type AdminCouponDiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE';

export interface AdminCoupon {
  active: boolean;
  code: string;
  discountType: AdminCouponDiscountType;
  discountValue: number;
  id: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  name: string;
  validFrom: string | null;
  validUntil: string | null;
}

export interface AdminCouponCreatePayload {
  code: string;
  discountType: AdminCouponDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  name: string;
  validFrom: string | null;
  validUntil: string | null;
}

export interface AdminCouponUpdatePayload {
  discountType: AdminCouponDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  name: string;
  validFrom: string | null;
  validUntil: string | null;
}
