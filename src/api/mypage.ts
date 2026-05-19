import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { addGuestCartItem, getGuestCart, removeGuestCartItem } from '@/api/guestCart';
import { fetchPaymentHistory } from '@/api/payments';
import { fetchProgramSearchIndex } from '@/api/programSearch';
import { env } from '@/config/env';
import { getStudentAccessToken, isStudentAuthenticated } from '@/stores/useAuthStore';
import type { ApiEnvelope, SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  AddToCartPayload,
  ApplicationSummary,
  CartSummary,
  CertificateDownload,
  CertificateProfile,
  CertificateProfileCreatePayload,
  EnrollmentDetail,
  EnrollmentReviewPayload,
  EnrollmentSummary,
  LearningStartNotice,
  LectureProgressSaveResponse,
  LearningPlayerSnapshot,
  MyQuestionItem,
  MyQuestionPage,
  MyQuestionScope,
  ProtectedLectureStream,
  RefundHistory,
  UserPasswordChangePayload,
  UserPasswordVerifyPayload,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';
import { formatPaymentMethodLabel, type PaymentResult } from '@/types/payment';
import type {
  EnrollmentPracticumOverview,
  LecturePracticum,
  PracticumReservation,
} from '@/types/practicum';
import { isUnsafeStorageAssetUrl, sanitizePublicAssetUrl } from '@/utils/publicAssetUrl';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

interface BackendUserProfile {
  loginId: string;
  email: string | null;
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

const getS3PresignedUrlExpiresAt = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value);
    const signedAt = url.searchParams.get('X-Amz-Date');
    const expiresInSeconds = Number.parseInt(url.searchParams.get('X-Amz-Expires') ?? '', 10);

    if (!signedAt || !Number.isFinite(expiresInSeconds)) {
      return null;
    }

    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(signedAt);

    if (!match) {
      return null;
    }

    const [, year, month, day, hour, minute, second] = match;
    const signedAtTime = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

    return signedAtTime + expiresInSeconds * 1000;
  } catch {
    return null;
  }
};

const isExpiredS3PresignedUrl = (value: string | null | undefined): value is string => {
  const expiresAt = getS3PresignedUrlExpiresAt(value);

  if (expiresAt === null) {
    return false;
  }

  return expiresAt <= Date.now();
};

const shouldResolveCartThumbnailUrl = (value: string | null | undefined): value is string => {
  return isUnsafeStorageAssetUrl(value) || isExpiredS3PresignedUrl(value);
};

const sanitizeEnrollmentSummary = (enrollment: EnrollmentSummary): EnrollmentSummary => ({
  ...enrollment,
  programThumbnailUrl: sanitizePublicAssetUrl(enrollment.programThumbnailUrl),
});

const getProgramIdFromSearchItemId = (id: string): number | null => {
  const match = /^lecture-(\d+)$/.exec(id);

  if (!match) {
    return null;
  }

  const programId = Number(match[1]);

  return Number.isInteger(programId) && programId > 0 ? programId : null;
};

interface CartThumbnailOverride {
  thumbnailCropOffsetX?: number | null | undefined;
  thumbnailCropOffsetY?: number | null | undefined;
  thumbnailCropZoom?: number | null | undefined;
  thumbnailUrl: string | null;
}

const resolveCartSummaryThumbnailUrls = async (
  cart: CartSummary,
  thumbnailOverrides: ReadonlyMap<number, CartThumbnailOverride> = new Map(),
): Promise<CartSummary> => {
  const hasResolvableThumbnail = cart.items.some((item) => {
    const overrideThumbnail = thumbnailOverrides.get(item.programId);

    if (overrideThumbnail) {
      return shouldResolveCartThumbnailUrl(overrideThumbnail.thumbnailUrl);
    }

    return shouldResolveCartThumbnailUrl(item.thumbnailUrl);
  });

  let catalogThumbnailByProgramId = new Map<number, CartThumbnailOverride>();

  if (hasResolvableThumbnail) {
    try {
      const searchIndex = await fetchProgramSearchIndex();
      const thumbnailEntries: Array<readonly [number, CartThumbnailOverride]> = [];

      searchIndex.items.forEach((item) => {
        const programId = getProgramIdFromSearchItemId(item.id);

        if (!programId || shouldResolveCartThumbnailUrl(item.thumbnailSrc)) {
          return;
        }

        thumbnailEntries.push([
          programId,
          {
            thumbnailCropOffsetX: item.thumbnailCropOffsetX,
            thumbnailCropOffsetY: item.thumbnailCropOffsetY,
            thumbnailCropZoom: item.thumbnailCropZoom,
            thumbnailUrl: item.thumbnailSrc,
          },
        ]);
      });

      catalogThumbnailByProgramId = new Map(thumbnailEntries);
    } catch {
      catalogThumbnailByProgramId = new Map();
    }
  }

  return {
    ...cart,
    items: cart.items.map((item) => {
      const overrideThumbnail = thumbnailOverrides.get(item.programId);

      if (overrideThumbnail && !shouldResolveCartThumbnailUrl(overrideThumbnail.thumbnailUrl)) {
        return {
          ...item,
          thumbnailCropOffsetX: overrideThumbnail.thumbnailCropOffsetX,
          thumbnailCropOffsetY: overrideThumbnail.thumbnailCropOffsetY,
          thumbnailCropZoom: overrideThumbnail.thumbnailCropZoom,
          thumbnailUrl: overrideThumbnail.thumbnailUrl,
        };
      }

      const catalogThumbnail = catalogThumbnailByProgramId.get(item.programId);

      if (catalogThumbnail) {
        return {
          ...item,
          thumbnailCropOffsetX: catalogThumbnail.thumbnailCropOffsetX,
          thumbnailCropOffsetY: catalogThumbnail.thumbnailCropOffsetY,
          thumbnailCropZoom: catalogThumbnail.thumbnailCropZoom,
          thumbnailUrl: catalogThumbnail.thumbnailUrl,
        };
      }

      if (!shouldResolveCartThumbnailUrl(item.thumbnailUrl)) {
        return item;
      }

      return {
        ...item,
        thumbnailUrl: null,
      };
    }),
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
        email: payload.email,
        nickname: payload.nickname ?? '',
      },
    );
    return toUserProfile(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '회원 정보를 수정하지 못했습니다.');
  }
};

export const verifyMyProfilePassword = async (
  payload: UserPasswordVerifyPayload,
): Promise<void> => {
  try {
    await axiosInstance.post('/api/v1/users/me/password/verify', payload);
  } catch (error: unknown) {
    throw toApiError(error, '비밀번호를 확인하지 못했습니다.');
  }
};

export const changeMyPassword = async (payload: UserPasswordChangePayload): Promise<void> => {
  try {
    await axiosInstance.patch('/api/v1/users/me/password', payload);
  } catch (error: unknown) {
    throw toApiError(error, '비밀번호를 변경하지 못했습니다.');
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

export const fetchMyCertificateProfile = async (): Promise<CertificateProfile> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<CertificateProfile>>(
      '/api/v1/users/me/certificate-profile',
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '수료증 이름 정보를 불러오지 못했습니다.');
  }
};

export const createMyCertificateProfile = async (
  payload: CertificateProfileCreatePayload,
): Promise<CertificateProfile> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<CertificateProfile>>(
      '/api/v1/users/me/certificate-profile',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '수료증 이름을 등록하지 못했습니다.');
  }
};

export const downloadMyCertificate = async (enrollmentId: number): Promise<CertificateDownload> => {
  try {
    const response = await axiosInstance.get<Blob>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/certificate`,
      {
        responseType: 'blob',
      },
    );
    const disposition: unknown = response.headers['content-disposition'];
    const filename = resolveDownloadFilename(
      disposition,
      `certificate-${String(enrollmentId)}.txt`,
    );
    return {
      blob: response.data,
      filename,
    };
  } catch (error: unknown) {
    throw toApiError(error, '수료증을 다운로드하지 못했습니다.');
  }
};

const resolveDownloadFilename = (disposition: unknown, fallback: string): string => {
  if (typeof disposition !== 'string') {
    return fallback;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return asciiMatch?.[1] ?? fallback;
};

export const fetchMyEnrollments = async (): Promise<EnrollmentSummary[]> => {
  try {
    const response =
      await axiosInstance.get<ApiEnvelope<EnrollmentSummary[]>>('/api/v1/my/enrollments');
    return unwrapApiEnvelope(response.data).map(sanitizeEnrollmentSummary);
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

export const fetchLearningStartNotice = async (
  enrollmentId: number,
): Promise<LearningStartNotice> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<LearningStartNotice>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/learning-start-notice`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '수강 시작 안내를 불러오지 못했습니다.');
  }
};

export const acceptLearningStartNotice = async (
  enrollmentId: number,
): Promise<LearningStartNotice> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<LearningStartNotice>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/learning-start-notice/accept`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '수강 시작 동의 처리에 실패했습니다.');
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

export const refreshLectureStreamCookies = async (
  lectureId: number,
  deviceId: string,
  playbackSessionToken: string,
): Promise<{ expiresAt: number }> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<{ expiresAt: number }>>(
      `/api/v1/lectures/${String(lectureId)}/stream/refresh`,
      null,
      {
        headers: {
          'X-Playback-Device-Id': deviceId,
          'X-Playback-Session-Token': playbackSessionToken,
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '스트리밍 쿠키를 갱신하지 못했습니다.');
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
  startAt: string,
  lectureId?: number,
): Promise<PracticumReservation> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PracticumReservation>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/practicum-reservations`,
      {
        lectureId,
        startAt,
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
  startAt: string,
): Promise<PracticumReservation> => {
  try {
    const response = await axiosInstance.patch<ApiEnvelope<PracticumReservation>>(
      `/api/v1/my/enrollments/${String(enrollmentId)}/practicum-reservations/${String(reservationId)}/move`,
      {
        startAt,
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
    return await resolveCartSummaryThumbnailUrls(unwrapApiEnvelope(response.data));
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
    return await resolveCartSummaryThumbnailUrls(
      unwrapApiEnvelope(response.data),
      new Map([
        [
          payload.programId,
          {
            thumbnailCropOffsetX: payload.thumbnailCropOffsetX,
            thumbnailCropOffsetY: payload.thumbnailCropOffsetY,
            thumbnailCropZoom: payload.thumbnailCropZoom,
            thumbnailUrl: payload.thumbnailUrl,
          },
        ],
      ]),
    );
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
    const result = unwrapApiEnvelope(response.data);

    return {
      ...result,
      cart: await resolveCartSummaryThumbnailUrls(result.cart),
    };
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
    return await resolveCartSummaryThumbnailUrls(unwrapApiEnvelope(response.data));
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
  privateQuestion?: boolean;
  title: string;
}): Promise<MyQuestionItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<MyQuestionItem>>('/api/v1/qna', {
      content: payload.content,
      privateQuestion: payload.privateQuestion ?? false,
      title: payload.title,
    });
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '운영 Q&A를 등록하지 못했습니다.');
  }
};

export const updateMyQuestion = async (
  question: Pick<MyQuestionItem, 'id' | 'privateQuestion' | 'programId' | 'scope'>,
  payload: {
    content: string;
    privateQuestion?: boolean;
    title: string;
  },
): Promise<MyQuestionItem> => {
  try {
    if (question.scope === 'PROGRAM') {
      const response = await axiosInstance.put<ApiEnvelope<MyQuestionItem>>(
        `/api/v1/programs/${String(question.programId)}/qna/${String(question.id)}`,
        {
          content: payload.content,
          privateQuestion: payload.privateQuestion ?? question.privateQuestion,
          title: payload.title,
        },
      );
      return unwrapApiEnvelope(response.data);
    }

    const response = await axiosInstance.put<ApiEnvelope<MyQuestionItem>>(
      `/api/v1/questions/${String(question.id)}`,
      {
        content: payload.content,
        privateQuestion: payload.privateQuestion ?? question.privateQuestion,
        title: payload.title,
      },
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
