import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { addGuestCartItem, getGuestCart, removeGuestCartItem } from '@/api/guestCart';
import { fetchPaymentHistory } from '@/api/payments';
import { fetchProgramSearchIndex } from '@/api/programSearch';
import { env } from '@/config/env';
import { isMyPageMockModeEnabled } from '@/mocks/mypage/runtime';
import {
  createMockedMyEnrollmentReview,
  createMockedMyGlobalQuestion,
  deleteMockedMyQuestion,
  getMockedMyEnrollmentDetail,
  getMockedMyEnrollments,
  getMockedMyPageProfile,
  getMockedMyQuestions,
  getMockedMyRefunds,
  changeMockedMyPagePassword,
  sendMockedMyPagePhoneVerification,
  updateMockedMyEnrollmentReview,
  updateMockedMyPageProfile,
  updateMockedMyQuestion,
  verifyMockedMyPagePhoneChange,
  verifyMockedMyPagePassword,
} from '@/mocks/mypage/state';
import { isPlayerMockModeEnabled } from '@/mocks/player/runtime';
import {
  getMockedLearningPlayerSnapshot,
  getMockedLectureStream,
  saveMockedLectureProgress,
} from '@/mocks/player/state';
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

const CERTIFICATE_PROFILE_STORAGE_KEY = 'sonoschool.mock.certificateProfile';
const LEARNING_START_NOTICE_STORAGE_KEY_PREFIX = 'sonoschool.mock.learningStartNoticeAccepted';

const DEFAULT_LEARNING_START_NOTICE: LearningStartNotice = {
  accepted: false,
  acceptedAt: null,
  messages: [
    '동의 후 강의 수강을 시작하면 취소 및 환불이 제한될 수 있습니다.',
    '강의 영상, 자료, 문제 콘텐츠의 무단 복제, 녹화, 배포, 공유는 금지됩니다.',
    '무단 복제 또는 배포 시 관련 법령에 따라 민형사상 법적 책임이 발생할 수 있습니다.',
  ],
  required: true,
  title: '수강 시작 전 확인',
  version: '2026-05-08',
};

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

const getMockedLearningStartNoticeStorageKey = (enrollmentId: number): string => {
  return `${LEARNING_START_NOTICE_STORAGE_KEY_PREFIX}.${String(enrollmentId)}`;
};

const getMockedLearningStartNotice = (enrollmentId: number): LearningStartNotice => {
  if (typeof window === 'undefined') {
    return DEFAULT_LEARNING_START_NOTICE;
  }

  const acceptedAt = window.localStorage.getItem(
    getMockedLearningStartNoticeStorageKey(enrollmentId),
  );

  return {
    ...DEFAULT_LEARNING_START_NOTICE,
    accepted: acceptedAt !== null,
    acceptedAt,
    required: acceptedAt === null,
  };
};

const acceptMockedLearningStartNotice = (enrollmentId: number): LearningStartNotice => {
  const acceptedAt = new Date().toISOString();

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(getMockedLearningStartNoticeStorageKey(enrollmentId), acceptedAt);
  }

  return {
    ...DEFAULT_LEARNING_START_NOTICE,
    accepted: true,
    acceptedAt,
    required: false,
  };
};

const getMockedCertificateProfile = (): CertificateProfile => {
  if (typeof window === 'undefined') {
    return {
      englishName: null,
      koreanName: null,
      lockedAt: null,
      registered: false,
    };
  }

  const storedValue = window.localStorage.getItem(CERTIFICATE_PROFILE_STORAGE_KEY);
  if (!storedValue) {
    return {
      englishName: null,
      koreanName: null,
      lockedAt: null,
      registered: false,
    };
  }

  try {
    return JSON.parse(storedValue) as CertificateProfile;
  } catch {
    window.localStorage.removeItem(CERTIFICATE_PROFILE_STORAGE_KEY);
    return {
      englishName: null,
      koreanName: null,
      lockedAt: null,
      registered: false,
    };
  }
};

const saveMockedCertificateProfile = (
  payload: CertificateProfileCreatePayload,
): CertificateProfile => {
  const profile: CertificateProfile = {
    englishName: payload.englishName,
    koreanName: payload.koreanName,
    lockedAt: new Date().toISOString(),
    registered: true,
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CERTIFICATE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }

  return profile;
};

const buildMockCertificateDownload = (
  enrollmentId: number,
  profile: CertificateProfile,
): CertificateDownload => {
  const enrollment = getMockedMyEnrollments().find((item) => item.id === enrollmentId);
  if (!enrollment || !enrollment.certificateEligible) {
    throw new Error('수료증 발급 대상 강의가 아닙니다.');
  }

  const content = [
    'SONO SCHOOL 수료증',
    '',
    `수강생: ${profile.koreanName ?? ''}`,
    `영문명: ${profile.englishName ?? ''}`,
    `강의명: ${enrollment.programTitle}`,
    `발급일: ${new Date().toISOString().slice(0, 10)}`,
    `수료일: ${enrollment.completedAt?.slice(0, 10) ?? ''}`,
  ].join('\n');

  return {
    blob: new Blob([content], { type: 'text/plain;charset=utf-8' }),
    filename: `${enrollment.programTitle.replace(/[\\/:*?"<>|\s]+/g, '-')}-certificate.txt`,
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

const resolveCartSummaryThumbnailUrls = async (
  cart: CartSummary,
  thumbnailOverrides: ReadonlyMap<number, string | null> = new Map(),
): Promise<CartSummary> => {
  const hasResolvableThumbnail = cart.items.some((item) => {
    const overrideThumbnailUrl = thumbnailOverrides.get(item.programId);

    if (overrideThumbnailUrl !== undefined) {
      return shouldResolveCartThumbnailUrl(overrideThumbnailUrl);
    }

    return shouldResolveCartThumbnailUrl(item.thumbnailUrl);
  });

  let catalogThumbnailByProgramId = new Map<number, string>();

  if (hasResolvableThumbnail) {
    try {
      const searchIndex = await fetchProgramSearchIndex();
      const thumbnailEntries: Array<readonly [number, string]> = [];

      searchIndex.items.forEach((item) => {
        const programId = getProgramIdFromSearchItemId(item.id);

        if (!programId || shouldResolveCartThumbnailUrl(item.thumbnailSrc)) {
          return;
        }

        thumbnailEntries.push([programId, item.thumbnailSrc]);
      });

      catalogThumbnailByProgramId = new Map(thumbnailEntries);
    } catch {
      catalogThumbnailByProgramId = new Map();
    }
  }

  return {
    ...cart,
    items: cart.items.map((item) => {
      const overrideThumbnailUrl = thumbnailOverrides.get(item.programId);

      if (
        overrideThumbnailUrl !== undefined &&
        !shouldResolveCartThumbnailUrl(overrideThumbnailUrl)
      ) {
        return {
          ...item,
          thumbnailUrl: overrideThumbnailUrl,
        };
      }

      const catalogThumbnailUrl = catalogThumbnailByProgramId.get(item.programId);

      if (catalogThumbnailUrl) {
        return {
          ...item,
          thumbnailUrl: catalogThumbnailUrl,
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
  if (isMyPageMockModeEnabled()) {
    return getMockedMyPageProfile();
  }

  try {
    const response = await axiosInstance.get<ApiEnvelope<BackendUserProfile>>('/api/v1/users/me');
    return toUserProfile(unwrapApiEnvelope(response.data));
  } catch (error: unknown) {
    throw toApiError(error, '내 정보를 불러오지 못했습니다.');
  }
};

export const updateMyProfile = async (payload: UserProfileUpdatePayload): Promise<UserProfile> => {
  if (isMyPageMockModeEnabled()) {
    return updateMockedMyPageProfile(payload);
  }

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
  if (isMyPageMockModeEnabled()) {
    if (!verifyMockedMyPagePassword(payload.password)) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }

    return;
  }

  try {
    await axiosInstance.post('/api/v1/users/me/password/verify', payload);
  } catch (error: unknown) {
    throw toApiError(error, '비밀번호를 확인하지 못했습니다.');
  }
};

export const changeMyPassword = async (payload: UserPasswordChangePayload): Promise<void> => {
  if (isMyPageMockModeEnabled()) {
    changeMockedMyPagePassword(payload);
    return;
  }

  try {
    await axiosInstance.patch('/api/v1/users/me/password', payload);
  } catch (error: unknown) {
    throw toApiError(error, '비밀번호를 변경하지 못했습니다.');
  }
};

export const sendMyPhoneVerification = async (
  payload: SmsSendPayload,
): Promise<SmsSendResponse> => {
  if (isMyPageMockModeEnabled()) {
    const response = sendMockedMyPagePhoneVerification(payload);

    if (!response) {
      throw new Error('인증번호 발송에 실패했습니다.');
    }

    return response;
  }

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
  if (isMyPageMockModeEnabled()) {
    const response = verifyMockedMyPagePhoneChange(payload);

    if (!response) {
      throw new Error('휴대폰 번호를 변경하지 못했습니다.');
    }

    return response;
  }

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
  if (isMyPageMockModeEnabled()) {
    return getMockedCertificateProfile();
  }

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
  if (isMyPageMockModeEnabled()) {
    const currentProfile = getMockedCertificateProfile();
    if (currentProfile.registered) {
      throw new Error('이미 등록된 수료증 이름은 관리자에게 초기화를 요청해야 합니다.');
    }
    return saveMockedCertificateProfile(payload);
  }

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
  if (isMyPageMockModeEnabled()) {
    const profile = getMockedCertificateProfile();
    if (!profile.registered) {
      throw new Error('수료증에 사용할 이름을 먼저 등록해 주세요.');
    }
    return buildMockCertificateDownload(enrollmentId, profile);
  }

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
  if (isMyPageMockModeEnabled()) {
    return getMockedMyEnrollments();
  }

  try {
    const response =
      await axiosInstance.get<ApiEnvelope<EnrollmentSummary[]>>('/api/v1/my/enrollments');
    return unwrapApiEnvelope(response.data).map(sanitizeEnrollmentSummary);
  } catch (error: unknown) {
    throw toApiError(error, '수강 내역을 불러오지 못했습니다.');
  }
};

export const fetchMyEnrollmentDetail = async (enrollmentId: number): Promise<EnrollmentDetail> => {
  if (isMyPageMockModeEnabled()) {
    const detail = getMockedMyEnrollmentDetail(enrollmentId);

    if (!detail) {
      throw new Error('수강 상세 정보를 불러오지 못했습니다.');
    }

    return detail;
  }

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
  if (isMyPageMockModeEnabled()) {
    return getMockedLearningStartNotice(enrollmentId);
  }

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
  if (isMyPageMockModeEnabled()) {
    return acceptMockedLearningStartNotice(enrollmentId);
  }

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
  if (isMyPageMockModeEnabled()) {
    createMockedMyEnrollmentReview(programId, payload);
    return;
  }

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
  if (isMyPageMockModeEnabled()) {
    updateMockedMyEnrollmentReview(reviewId, payload);
    return;
  }

  try {
    await axiosInstance.put(`/api/v1/reviews/${String(reviewId)}`, payload);
  } catch (error: unknown) {
    throw toApiError(error, '후기를 수정하지 못했습니다.');
  }
};

export const fetchMyLearningPlayerSnapshot = async (
  enrollmentId: number,
): Promise<LearningPlayerSnapshot> => {
  if (isPlayerMockModeEnabled()) {
    const snapshot = getMockedLearningPlayerSnapshot(enrollmentId);

    if (!snapshot) {
      throw new Error('플레이어 목데이터를 찾지 못했습니다.');
    }

    return snapshot;
  }

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
  if (isPlayerMockModeEnabled()) {
    const stream = getMockedLectureStream(lectureId, deviceId);

    if (!stream) {
      throw new Error('플레이어 스트림 목데이터를 찾지 못했습니다.');
    }

    return stream;
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
  if (isPlayerMockModeEnabled()) {
    return saveMockedLectureProgress(lectureId, watchedSeconds);
  }

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
  if (isPlayerMockModeEnabled()) {
    return false;
  }

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
      new Map([[payload.programId, payload.thumbnailUrl]]),
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
  if (isMyPageMockModeEnabled()) {
    return getMockedMyRefunds();
  }

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
  if (isMyPageMockModeEnabled()) {
    return getMockedMyQuestions(options);
  }

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
  if (isMyPageMockModeEnabled()) {
    return createMockedMyGlobalQuestion(payload);
  }

  try {
    const response = await axiosInstance.post<ApiEnvelope<MyQuestionItem>>('/api/v1/qna', payload);
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
  if (isMyPageMockModeEnabled()) {
    return updateMockedMyQuestion(question, payload);
  }

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
  if (isMyPageMockModeEnabled()) {
    deleteMockedMyQuestion(question);
    return;
  }

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
