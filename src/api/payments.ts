import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { shouldUseMockFallback } from '@/api/fallback';
import { getMockPaymentResult, getMockPaymentResultByToken } from '@/mocks/data/payments';
import type { ApiEnvelope } from '@/types/auth';
import type { PaymentResult } from '@/types/payment';

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
    if (shouldUseMockFallback(error)) {
      const mockPaymentResult = getMockPaymentResult(paymentId);

      if (mockPaymentResult) {
        return mockPaymentResult;
      }
    }

    throw toApiError(error, '결제 결과를 불러오지 못했습니다.');
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
    if (shouldUseMockFallback(error)) {
      const mockPaymentResult = getMockPaymentResultByToken(token);

      if (mockPaymentResult) {
        return mockPaymentResult;
      }
    }

    throw toApiError(error, '결제 결과를 불러오지 못했습니다.');
  }
};
