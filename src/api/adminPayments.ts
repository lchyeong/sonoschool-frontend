import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/auth';
import type { AdminPaymentDetail, AdminPaymentListItem } from '@/types/adminPayment';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchAdminPayments = async (): Promise<AdminPaymentListItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminPaymentListItem[]>>(
      '/api/v1/admin/payments',
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '관리자 결제 목록을 불러오지 못했습니다.');
  }
};

export const fetchAdminPaymentDetail = async (paymentId: number): Promise<AdminPaymentDetail> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminPaymentDetail>>(
      `/api/v1/admin/payments/${String(paymentId)}`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '관리자 결제 상세를 불러오지 못했습니다.');
  }
};

export const cancelAdminPayment = async (
  paymentId: number,
  payload: { reason: string },
): Promise<AdminPaymentDetail> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminPaymentDetail>>(
      `/api/v1/admin/payments/${String(paymentId)}/cancel`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '결제 취소 처리에 실패했습니다.');
  }
};
