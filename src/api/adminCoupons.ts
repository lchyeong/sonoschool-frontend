import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  AdminCoupon,
  AdminCouponCreatePayload,
  AdminCouponUpdatePayload,
} from '@/types/adminCoupons';
import type { ApiEnvelope } from '@/types/auth';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminCoupons = async (): Promise<AdminCoupon[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminCoupon[]>>('/api/v1/admin/coupons');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '쿠폰 목록을 불러오지 못했습니다.');
  }
};

export const createAdminCoupon = async (
  payload: AdminCouponCreatePayload,
): Promise<AdminCoupon> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCoupon>>(
      '/api/v1/admin/coupons',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '쿠폰을 등록하지 못했습니다.');
  }
};

export const updateAdminCoupon = async (
  couponId: number,
  payload: AdminCouponUpdatePayload,
): Promise<AdminCoupon> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminCoupon>>(
      `/api/v1/admin/coupons/${String(couponId)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '쿠폰을 수정하지 못했습니다.');
  }
};

export const activateAdminCoupon = async (couponId: number): Promise<AdminCoupon> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCoupon>>(
      `/api/v1/admin/coupons/${String(couponId)}/activate`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '쿠폰을 활성화하지 못했습니다.');
  }
};

export const deactivateAdminCoupon = async (couponId: number): Promise<AdminCoupon> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminCoupon>>(
      `/api/v1/admin/coupons/${String(couponId)}/deactivate`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '쿠폰을 비활성화하지 못했습니다.');
  }
};
