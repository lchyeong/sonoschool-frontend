import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { shouldUseMockFallback } from '@/api/fallback';
import { env } from '@/config/env';
import {
  addMockMyCartItem,
  getMockMyApplicationSummary,
  getMockMyCart,
  getMockMyCoupons,
  getMockMyEnrollmentDetail,
  getMockMyEnrollments,
  getMockLectureStream,
  getMockLearningPlayerSnapshot,
  getMockMyProfile,
  getMockMyRefunds,
  removeMockMyCartItem,
  sendMockMyPhoneVerification,
  updateMockMyProfile,
  verifyMockMyPhoneChange,
} from '@/mocks/data/mypage';
import type { ApiEnvelope, SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  AddToCartPayload,
  ApplicationSummary,
  CartSummary,
  EnrollmentDetail,
  EnrollmentSummary,
  LectureProgressSaveResponse,
  LearningPlayerSnapshot,
  ProtectedLectureStream,
  RefundHistory,
  UserCoupon,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

const shouldPreferMockMyPage = env.VITE_ENABLE_MOCK;

export const fetchMyProfile = async (): Promise<UserProfile> => {
  if (shouldPreferMockMyPage) {
    return getMockMyProfile();
  }

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
  if (shouldPreferMockMyPage) {
    return updateMockMyProfile(payload);
  }

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
  if (shouldPreferMockMyPage) {
    const mockResponse = sendMockMyPhoneVerification(payload);

    if (mockResponse) {
      return mockResponse;
    }
  }

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
  if (shouldPreferMockMyPage) {
    const mockResponse = verifyMockMyPhoneChange(payload);

    if (mockResponse) {
      return mockResponse;
    }
  }

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
  if (shouldPreferMockMyPage) {
    return getMockMyEnrollments();
  }

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
  if (shouldPreferMockMyPage) {
    const mockDetail = getMockMyEnrollmentDetail(enrollmentId);

    if (mockDetail) {
      return mockDetail;
    }
  }

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

export const fetchMyLearningPlayerSnapshot = async (
  enrollmentId: number,
): Promise<LearningPlayerSnapshot> => {
  if (shouldPreferMockMyPage) {
    const mockSnapshot = getMockLearningPlayerSnapshot(enrollmentId);

    if (mockSnapshot) {
      return mockSnapshot;
    }
  }

  try {
    const response = await axiosInstance.get<ApiEnvelope<LearningPlayerSnapshot>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/player`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockSnapshot = getMockLearningPlayerSnapshot(enrollmentId);

      if (mockSnapshot) {
        return mockSnapshot;
      }
    }

    throw toApiError(error, '온라인 수강 정보를 불러오지 못했습니다.');
  }
};

export const fetchLectureStream = async (
  lectureId: number,
  deviceId: string,
): Promise<ProtectedLectureStream> => {
  if (shouldPreferMockMyPage) {
    const mockStream = getMockLectureStream(lectureId, deviceId);
    if (mockStream) {
      return mockStream;
    }
  }

  try {
    const response = await axiosInstance.get<ApiEnvelope<ProtectedLectureStream>>(
      `/api/v1/lectures/${String(lectureId)}/stream`,
      {
        headers: {
          'X-Playback-Device-Id': deviceId,
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockStream = getMockLectureStream(lectureId, deviceId);
      if (mockStream) {
        return mockStream;
      }
    }

    throw toApiError(error, '보호된 스트리밍 주소를 불러오지 못했습니다.');
  }
};

export const saveLectureProgress = async (
  enrollmentId: number,
  lectureId: number,
  watchedSeconds: number,
): Promise<LectureProgressSaveResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<LectureProgressSaveResponse>>(
      `/api/v1/lectures/${String(lectureId)}/progress`,
      {
        enrollmentId,
        watchedSeconds,
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '학습 진도를 저장하지 못했습니다.');
  }
};

export const sendLectureProgressBeacon = (
  enrollmentId: number,
  lectureId: number,
  watchedSeconds: number,
) => {
  if (
    shouldPreferMockMyPage ||
    typeof navigator === 'undefined' ||
    typeof navigator.sendBeacon !== 'function'
  ) {
    return false;
  }

  const payload = JSON.stringify({
    enrollmentId,
    watchedSeconds,
  });
  const body = new Blob([payload], { type: 'application/json' });

  return navigator.sendBeacon(`/api/v1/lectures/${String(lectureId)}/progress`, body);
};

export const fetchMyCart = async (): Promise<CartSummary> => {
  if (shouldPreferMockMyPage) {
    return getMockMyCart();
  }

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

export const fetchMyCoupons = async (): Promise<UserCoupon[]> => {
  if (shouldPreferMockMyPage) {
    return getMockMyCoupons();
  }

  try {
    const response = await axiosInstance.get<ApiEnvelope<UserCoupon[]>>('/api/v1/my/coupons');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockMyCoupons();
    }

    throw toApiError(error, '쿠폰 목록을 불러오지 못했습니다.');
  }
};

export const fetchMyApplicationSummary = async (): Promise<ApplicationSummary> => {
  if (shouldPreferMockMyPage) {
    return getMockMyApplicationSummary();
  }

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

export const addMyCartItem = async (payload: AddToCartPayload): Promise<CartSummary> => {
  if (shouldPreferMockMyPage) {
    return addMockMyCartItem(payload);
  }

  try {
    const response = await axiosInstance.post<ApiEnvelope<CartSummary>>('/api/v1/cart', payload);
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return addMockMyCartItem(payload);
    }

    throw toApiError(error, '장바구니에 담지 못했습니다.');
  }
};

export const removeMyCartItem = async (cartItemId: number): Promise<CartSummary> => {
  if (shouldPreferMockMyPage) {
    return removeMockMyCartItem(cartItemId);
  }

  try {
    const response = await axiosInstance.delete<ApiEnvelope<CartSummary>>(
      `/api/v1/cart/${String(cartItemId)}`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return removeMockMyCartItem(cartItemId);
    }

    throw toApiError(error, '장바구니에서 제거하지 못했습니다.');
  }
};

export const fetchMyRefunds = async (): Promise<RefundHistory[]> => {
  if (shouldPreferMockMyPage) {
    return getMockMyRefunds();
  }

  try {
    const response = await axiosInstance.get<ApiEnvelope<RefundHistory[]>>('/api/v1/refunds');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockMyRefunds();
    }

    throw toApiError(error, '취소/환불 내역을 불러오지 못했습니다.');
  }
};
