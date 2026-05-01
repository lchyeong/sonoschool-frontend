import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { isMyPageMockModeEnabled } from '@/mocks/mypage/runtime';
import { getMockedMyPaymentHistory } from '@/mocks/mypage/state';
import type { ApiEnvelope } from '@/types/auth';
import type {
  CheckoutPaymentInitiatePayload,
  KcpMobileRegisterResponse,
  KcpPcApprovePayload,
  KcpPcPrepareResponse,
  PaymentInitiatePayload,
  PaymentResult,
} from '@/types/payment';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchPaymentResult = async (paymentId: number): Promise<PaymentResult> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<PaymentResult>>(
      `/api/v1/payments/${String(paymentId)}`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '결제 결과를 불러오지 못했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const fetchPaymentResultByToken = async (token: string): Promise<PaymentResult> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<PaymentResult>>(
      '/api/v1/payments/result',
      {
        params: { token },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '결제 결과를 불러오지 못했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const fetchPaymentHistory = async (): Promise<PaymentResult[]> => {
  if (isMyPageMockModeEnabled()) {
    return getMockedMyPaymentHistory();
  }

  try {
    const response = await axiosInstance.get<ApiEnvelope<PaymentResult[]>>('/api/v1/payments');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '결제 내역을 불러오지 못했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const prepareKcpPcPayment = async (
  payload: PaymentInitiatePayload,
): Promise<KcpPcPrepareResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<KcpPcPrepareResponse>>(
      '/api/v1/payments/kcp/pc/prepare',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, 'PC 결제 준비에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const prepareKcpPcCheckoutPayment = async (
  payload: CheckoutPaymentInitiatePayload,
): Promise<KcpPcPrepareResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<KcpPcPrepareResponse>>(
      '/api/v1/payments/checkout/kcp/pc/prepare',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, 'PC 결제 준비에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const registerKcpMobilePayment = async (
  payload: PaymentInitiatePayload,
): Promise<KcpMobileRegisterResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<KcpMobileRegisterResponse>>(
      '/api/v1/payments/kcp/mobile/register',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '모바일 결제 준비에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const registerKcpMobileCheckoutPayment = async (
  payload: CheckoutPaymentInitiatePayload,
): Promise<KcpMobileRegisterResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<KcpMobileRegisterResponse>>(
      '/api/v1/payments/checkout/kcp/mobile/register',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '모바일 결제 준비에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const completeFreeCheckoutPayment = async (
  payload: CheckoutPaymentInitiatePayload,
): Promise<PaymentResult> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PaymentResult>>(
      '/api/v1/payments/checkout/free/complete',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '무료 신청 처리에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const approveKcpPcPayment = async (payload: KcpPcApprovePayload): Promise<PaymentResult> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PaymentResult>>(
      '/api/v1/payments/kcp/pc/approve',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, 'PC 결제 승인에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};

export const cancelPayment = async (
  paymentId: number,
  payload: { reason: string },
): Promise<PaymentResult> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PaymentResult>>(
      `/api/v1/payments/${String(paymentId)}/cancel`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '결제 취소 처리에 실패했습니다.', {
      preferFallbackUserMessage: true,
    });
  }
};
