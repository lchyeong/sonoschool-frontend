import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { shouldUseMockFallback } from '@/api/fallback';
import {
  getMockMyApplicationSummary,
  getMockMyCart,
  getMockMyEnrollmentDetail,
  getMockMyEnrollments,
  getMockMyProfile,
  getMockMyReservations,
  sendMockMyPhoneVerification,
  updateMockMyProfile,
  verifyMockMyPhoneChange,
} from '@/mocks/data/mypage';
import type { ApiEnvelope, SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  ApplicationSummary,
  CartSummary,
  EnrollmentDetail,
  EnrollmentSummary,
  OfflineReservation,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

export const fetchMyProfile = async (): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<UserProfile>>('/api/users/me');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockMyProfile();
    }

    throw toApiError(error, '내 정보를 불러오지 못했습니다.');
  }
};

export const updateMyProfile = async (payload: UserProfileUpdatePayload): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.patch<ApiEnvelope<UserProfile>>('/api/users/me', payload);
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return updateMockMyProfile(payload);
    }

    throw toApiError(error, '회원 정보를 수정하지 못했습니다.');
  }
};

export const sendMyPhoneVerification = async (
  payload: SmsSendPayload,
): Promise<SmsSendResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsSendResponse>>(
      '/api/users/me/phone/send',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = sendMockMyPhoneVerification(payload);

      if (mockResponse) {
        return mockResponse;
      }
    }

    throw toApiError(error, '인증번호 발송에 실패했습니다.');
  }
};

export const verifyMyPhoneChange = async (payload: SmsVerifyPayload): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<UserProfile>>(
      '/api/users/me/phone/verify',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = verifyMockMyPhoneChange(payload);

      if (mockResponse) {
        return mockResponse;
      }
    }

    throw toApiError(error, '휴대폰 번호를 변경하지 못했습니다.');
  }
};

export const fetchMyEnrollments = async (): Promise<EnrollmentSummary[]> => {
  try {
    const response =
      await axiosInstance.get<ApiEnvelope<EnrollmentSummary[]>>('/api/v1/my/enrollments');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockMyEnrollments();
    }

    throw toApiError(error, '수강 내역을 불러오지 못했습니다.');
  }
};

export const fetchMyEnrollmentDetail = async (enrollmentId: number): Promise<EnrollmentDetail> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<EnrollmentDetail>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockDetail = getMockMyEnrollmentDetail(enrollmentId);

      if (mockDetail) {
        return mockDetail;
      }
    }

    throw toApiError(error, '수강 상세 정보를 불러오지 못했습니다.');
  }
};

export const fetchMyCart = async (): Promise<CartSummary> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<CartSummary>>('/api/v1/cart');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockMyCart();
    }

    throw toApiError(error, '장바구니를 불러오지 못했습니다.');
  }
};

export const fetchMyApplicationSummary = async (): Promise<ApplicationSummary> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<ApplicationSummary>>(
      '/api/v1/cart/application-summary',
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockMyApplicationSummary();
    }

    throw toApiError(error, '신청 요약을 불러오지 못했습니다.');
  }
};

export const fetchMyReservations = async (): Promise<OfflineReservation[]> => {
  try {
    const response =
      await axiosInstance.get<ApiEnvelope<OfflineReservation[]>>('/api/v1/reservations');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockMyReservations();
    }

    throw toApiError(error, '신청 내역을 불러오지 못했습니다.');
  }
};
