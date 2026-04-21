import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { addGuestCartItem, getGuestCart, removeGuestCartItem } from '@/api/guestCart';
import { fetchPaymentHistory } from '@/api/payments';
import { env } from '@/config/env';
import { getStudentAccessToken, isStudentAuthenticated } from '@/stores/useAuthStore';
import type { ApiEnvelope, SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  AddToCartPayload,
  ApplicationSummary,
  CartSummary,
  EnrollmentDetail,
  EnrollmentReviewPayload,
  EnrollmentSummary,
  LectureProgressSaveResponse,
  LearningPlayerSnapshot,
  MyQuestionItem,
  MyQuestionPage,
  MyQuestionScope,
  ProtectedLectureStream,
  RefundHistory,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';
import { formatPaymentMethodLabel, type PaymentResult } from '@/types/payment';
import type {
  EnrollmentPracticumOverview,
  LecturePracticum,
  PracticumReservation,
} from '@/types/practicum';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

interface BackendUserProfile {
  loginId: string;
  email: string;
  name: string;
  nickname: string | null;
  displayName: string;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  role: string;
}

interface MyQuestionsQueryOptions {
  answered?: boolean | undefined;
  keyword?: string | undefined;
  page?: number;
  size?: number;
  scope?: MyQuestionScope | 'ALL';
}

const toUserProfile = (profile: BackendUserProfile): UserProfile => {
  return {
    displayName: profile.displayName,
    email: profile.email,
    loginId: profile.loginId,
    name: profile.name,
    nickname: profile.nickname,
    phoneNumber: profile.phoneNumber,
    phoneVerifiedAt: profile.phoneVerifiedAt ?? null,
    role: profile.role,
  };
};

const toRefundHistory = (payment: PaymentResult): RefundHistory | null => {
  if (payment.status !== 'CANCELLED') {
    return null;
  }

  return {
    id: payment.id,
    orderName: payment.orderName,
    paymentMethod: formatPaymentMethodLabel(payment.paymentMethod),
    processedAt: payment.cancelledAt,
    programId: payment.id,
    programTitle: payment.orderName,
    reason: payment.cancelReason,
    refundAmount: payment.approvedAmount ?? payment.amount,
    requestedAt: payment.cancelledAt ?? payment.requestedAt,
    status: 'REFUNDED',
  };
};

export const fetchMyProfile = async (): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<BackendUserProfile>>('/api/v1/users/me');
    return toUserProfile(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '내 정보를 불러오지 못했습니다.');
  }
};

export const updateMyProfile = async (payload: UserProfileUpdatePayload): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.patch<ApiEnvelope<BackendUserProfile>>(
      '/api/v1/users/me',
      {
        name: payload.name,
        nickname: payload.nickname,
      },
    );
    return toUserProfile(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '회원 정보를 수정하지 못했습니다.');
  }
};

export const sendMyPhoneVerification = async (
  payload: SmsSendPayload,
): Promise<SmsSendResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsSendResponse>>(
      '/api/v1/users/me/phone/send',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '인증번호 발송에 실패했습니다.');
  }
};

export const verifyMyPhoneChange = async (payload: SmsVerifyPayload): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<BackendUserProfile>>(
      '/api/v1/users/me/phone/verify',
      payload,
    );
    return toUserProfile(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '휴대폰 번호를 변경하지 못했습니다.');
  }
};

export const fetchMyEnrollments = async (): Promise<EnrollmentSummary[]> => {
  try {
    const response =
      await axiosInstance.get<ApiEnvelope<EnrollmentSummary[]>>('/api/v1/my/enrollments');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
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
    throw toApiError(error, '수강 상세 정보를 불러오지 못했습니다.');
  }
};

export const createMyEnrollmentReview = async (
  programId: number,
  payload: EnrollmentReviewPayload,
): Promise<void> => {
  try {
    await axiosInstance.post(`/api/v1/programs/${String(programId)}/reviews`, payload);
  } catch (error: unknown) {
    throw toApiError(error, '후기를 등록하지 못했습니다.');
  }
};

export const updateMyEnrollmentReview = async (
  reviewId: number,
  payload: EnrollmentReviewPayload,
): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/reviews/${String(reviewId)}`, payload);
  } catch (error: unknown) {
    throw toApiError(error, '후기를 수정하지 못했습니다.');
  }
};

export const fetchMyLearningPlayerSnapshot = async (
  enrollmentId: number,
): Promise<LearningPlayerSnapshot> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<LearningPlayerSnapshot>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/player`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '온라인 수강 정보를 불러오지 못했습니다.');
  }
};

export const fetchMyEnrollmentPracticumOverview = async (
  enrollmentId: number,
): Promise<EnrollmentPracticumOverview> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<EnrollmentPracticumOverview>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/practicum`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약 정보를 불러오지 못했습니다.');
  }
};

export const fetchLectureStream = async (
  lectureId: number,
  deviceId: string,
): Promise<ProtectedLectureStream> => {
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

export const updateMyOfflineScheduleAbsence = async (
  enrollmentId: number,
  ruleId: number,
  absent: boolean,
): Promise<void> => {
  try {
    await axiosInstance.patch(
      `/api/v1/my/enrollments/${String(enrollmentId)}/offline-schedules/${String(ruleId)}/absence`,
      {
        absent,
      },
    );
  } catch (error: unknown) {
    throw toApiError(error, '오프라인 참석 상태를 저장하지 못했습니다.');
  }
};

export const fetchMyLecturePracticum = async (
  enrollmentId: number,
  lectureId: number,
): Promise<LecturePracticum> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<LecturePracticum>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/lectures/${String(lectureId)}/practicum`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약 정보를 불러오지 못했습니다.');
  }
};

export const reserveMyLecturePracticum = async (
  enrollmentId: number,
  slotId: number,
  lectureId?: number,
): Promise<PracticumReservation> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PracticumReservation>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/practicum-reservations`,
      {
        lectureId,
        slotId,
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습을 예약하지 못했습니다.');
  }
};

export const cancelMyLecturePracticum = async (
  enrollmentId: number,
  reservationId: number,
): Promise<void> => {
  try {
    await axiosInstance.delete(
      `/api/v1/my/enrollments/${String(enrollmentId)}/practicum-reservations/${String(reservationId)}`,
    );
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약을 취소하지 못했습니다.');
  }
};

export const moveMyLecturePracticum = async (
  enrollmentId: number,
  reservationId: number,
  slotId: number,
): Promise<PracticumReservation> => {
  try {
    const response = await axiosInstance.patch<ApiEnvelope<PracticumReservation>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/practicum-reservations/${String(reservationId)}/move`,
      {
        slotId,
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약 일정을 변경하지 못했습니다.');
  }
};

export const sendLectureProgressBeacon = (
  enrollmentId: number,
  lectureId: number,
  watchedSeconds: number,
) => {
  if (typeof fetch !== 'function') {
    return false;
  }

  const accessToken = getStudentAccessToken();
  if (!accessToken) {
    return false;
  }

  const payload = JSON.stringify({
    enrollmentId,
    watchedSeconds,
  });
  const requestUrl = env.apiBaseUrl
    ? new URL(`/api/v1/lectures/${String(lectureId)}/progress`, env.apiBaseUrl).toString()
    : `/api/v1/lectures/${String(lectureId)}/progress`;

  void fetch(requestUrl, {
    method: 'POST',
    body: payload,
    keepalive: true,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }).catch(() => {
    // 종료 시점 요청 실패는 다음 진도 저장 주기에 복구됩니다.
  });

  return true;
};

export const fetchMyCart = async (): Promise<CartSummary> => {
  if (!isStudentAuthenticated()) {
    return getGuestCart();
  }

  try {
    const response = await axiosInstance.get<ApiEnvelope<CartSummary>>('/api/v1/cart');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
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
    throw toApiError(error, '신청 요약을 불러오지 못했습니다.');
  }
};

export const addMyCartItem = async (payload: AddToCartPayload): Promise<CartSummary> => {
  if (!isStudentAuthenticated()) {
    return addGuestCartItem(payload);
  }

  try {
    const response = await axiosInstance.post<ApiEnvelope<CartSummary>>('/api/v1/cart/items', {
      programId: payload.programId,
    });
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '장바구니에 담지 못했습니다.');
  }
};

export interface MergeMyCartItemsResult {
  cart: CartSummary;
  mergedCount: number;
  skippedCount: number;
  skippedProgramIds: number[];
}

export const mergeMyCartItems = async (programIds: number[]): Promise<MergeMyCartItemsResult> => {
  if (!isStudentAuthenticated()) {
    return {
      cart: getGuestCart(),
      mergedCount: 0,
      skippedCount: 0,
      skippedProgramIds: [],
    };
  }

  try {
    const response = await axiosInstance.post<ApiEnvelope<MergeMyCartItemsResult>>(
      '/api/v1/cart/merge',
      {
        programIds,
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '장바구니를 로그인 계정에 옮기지 못했습니다.');
  }
};

export const removeMyCartItem = async (cartItemId: number): Promise<CartSummary> => {
  if (!isStudentAuthenticated()) {
    return removeGuestCartItem(cartItemId);
  }

  try {
    const response = await axiosInstance.delete<ApiEnvelope<CartSummary>>(
      `/api/v1/cart/items/${String(cartItemId)}`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '장바구니에서 제거하지 못했습니다.');
  }
};

export const fetchMyRefunds = async (): Promise<RefundHistory[]> => {
  try {
    const payments = await fetchPaymentHistory();
    return payments
      .map(toRefundHistory)
      .filter((refund): refund is RefundHistory => refund !== null);
  } catch (error: unknown) {
    throw toApiError(error, '취소/환불 내역을 불러오지 못했습니다.');
  }
};

export const fetchMyQuestions = async (
  options?: MyQuestionsQueryOptions,
): Promise<MyQuestionPage> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<MyQuestionPage>>('/api/v1/my/questions', {
      params: {
        answered: options?.answered,
        keyword: options?.keyword?.trim() || undefined,
        page: options?.page ?? 0,
        scope: options?.scope && options.scope !== 'ALL' ? options.scope : undefined,
        size: options?.size ?? 10,
      },
    });
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '내 질문을 불러오지 못했습니다.');
  }
};

export const createMyGlobalQuestion = async (payload: {
  content: string;
  title: string;
}): Promise<MyQuestionItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<MyQuestionItem>>('/api/v1/qna', payload);
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '운영 Q&A를 등록하지 못했습니다.');
  }
};

export const updateMyQuestion = async (
  question: Pick<MyQuestionItem, 'id' | 'programId' | 'scope'>,
  payload: {
    content: string;
    title: string;
  },
): Promise<MyQuestionItem> => {
  try {
    if (question.scope === 'PROGRAM') {
      const response = await axiosInstance.put<ApiEnvelope<MyQuestionItem>>(
        `/api/v1/programs/${String(question.programId)}/qna/${String(question.id)}`,
        {
          content: payload.content,
          title: payload.title,
        },
      );
      return unwrapApiEnvelope(response.data);
    }

    const response = await axiosInstance.put<ApiEnvelope<MyQuestionItem>>(
      `/api/v1/questions/${String(question.id)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '질문을 수정하지 못했습니다.');
  }
};

export const deleteMyQuestion = async (
  question: Pick<MyQuestionItem, 'id' | 'programId' | 'scope'>,
): Promise<void> => {
  try {
    if (question.scope === 'PROGRAM') {
      await axiosInstance.delete(
        `/api/v1/programs/${String(question.programId)}/qna/${String(question.id)}`,
      );
      return;
    }

    await axiosInstance.delete(`/api/v1/questions/${String(question.id)}`);
  } catch (error: unknown) {
    throw toApiError(error, '질문을 삭제하지 못했습니다.');
  }
};
