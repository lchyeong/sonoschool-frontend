import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { startTransition, useEffect, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { logoutStudent } from '@/api/auth';
import { ApiError } from '@/api/errors';
import {
  createMyEnrollmentReview,
  sendMyPhoneVerification,
  updateMyEnrollmentReview,
  updateMyProfile,
  verifyMyPhoneChange,
  verifyMyProfilePassword,
} from '@/api/mypage';
import mypageCertificateDownloadIconSrc from '@/assets/icons/lucide_arrow-down-to-line.svg';
import mypageQuestionChevronDownIconSrc from '@/assets/icons/lucide_chevron-down.svg';
import mypageQuestionChevronUpIconSrc from '@/assets/icons/lucide_chevron-up.svg';
import mypageProfileCircleCheckIconSrc from '@/assets/icons/lucide_circle-check.svg';
import mypagePasswordEyeOffIconSrc from '@/assets/icons/lucide_eye-off.svg';
import mypageCertificateInfoIconSrc from '@/assets/icons/lucide_info.svg';
import mypageQuestionReplyIconSrc from '@/assets/icons/lucide_reply.svg';
import mypageReviewStarIconSrc from '@/assets/icons/lucide_star.svg';
import mypageReviewCloseIconSrc from '@/assets/icons/lucide_x.svg';
import mypageBookOpenIconSrc from '@/assets/icons/mypage-menu-book-open.svg';
import mypageLogOutIconSrc from '@/assets/icons/mypage-menu-log-out.svg';
import mypageReceiptTextIconSrc from '@/assets/icons/mypage-menu-receipt-text.svg';
import mypageSquarePenIconSrc from '@/assets/icons/mypage-menu-square-pen.svg';
import mypageUserIconSrc from '@/assets/icons/mypage-menu-user.svg';
import Modal from '@/components/overlay/Modal/Modal';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import {
  myEnrollmentDetailQueryKey,
  myEnrollmentsQueryKey,
  myProfileQueryKey,
  useMyEnrollmentDetailQuery,
  useMyEnrollmentsQuery,
  useMyPaymentHistoryQuery,
  useMyProfileQuery,
  useMyQuestionsQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import type { SmsSendResponse } from '@/types/auth';
import type {
  EnrollmentReviewPayload,
  MyQuestionAnsweredFilter,
  MyQuestionScope,
} from '@/types/mypage';
import {
  formatPaymentMethodLabel,
  paymentStatusLabels,
  type PaymentResult,
  type PaymentStatus,
} from '@/types/payment';
import { classNames } from '@/utils/classNames';

import styles from './MyPagePage.module.scss';

type MyPageViewKey = 'learning' | 'payments' | 'profile' | 'questions';

interface SidebarItem {
  key: MyPageViewKey;
  label: string;
  iconSrc: string;
}

interface ReviewFormDraftState {
  enrollmentId: number | null;
  values: ReviewFormValues;
}

interface PhoneFormErrors {
  phoneNumber?: string;
  code?: string;
}

interface ProfileFormErrors {
  nickname?: string;
}

const DEFAULT_VIEW: MyPageViewKey = 'learning';

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'learning', label: '내 강의', iconSrc: mypageBookOpenIconSrc },
  { key: 'payments', label: '결제 내역', iconSrc: mypageReceiptTextIconSrc },
  { key: 'profile', label: '내 정보 관리', iconSrc: mypageUserIconSrc },
  { key: 'questions', label: 'Q&A 관리', iconSrc: mypageSquarePenIconSrc },
];

type MaskIconStyle = CSSProperties & Record<'--mypage-menu-icon', string>;

const buildMaskIconStyle = (iconSrc: string): MaskIconStyle => {
  return {
    '--mypage-menu-icon': `url("${iconSrc}")`,
  };
};

const certificateInfoIconStyle = buildMaskIconStyle(mypageCertificateInfoIconSrc);
const certificateDownloadIconStyle = buildMaskIconStyle(mypageCertificateDownloadIconSrc);
const questionChevronDownIconStyle = buildMaskIconStyle(mypageQuestionChevronDownIconSrc);
const questionChevronUpIconStyle = buildMaskIconStyle(mypageQuestionChevronUpIconSrc);
const questionInfoIconStyle = buildMaskIconStyle(mypageCertificateInfoIconSrc);
const questionReplyIconStyle = buildMaskIconStyle(mypageQuestionReplyIconSrc);
const profileCircleCheckIconStyle = buildMaskIconStyle(mypageProfileCircleCheckIconSrc);
const profilePasswordEyeOffIconStyle = buildMaskIconStyle(mypagePasswordEyeOffIconSrc);
const reviewCloseIconStyle = buildMaskIconStyle(mypageReviewCloseIconSrc);
const reviewStarIconStyle = buildMaskIconStyle(mypageReviewStarIconSrc);

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const isMyPageViewKey = (value: string | null): value is MyPageViewKey => {
  return SIDEBAR_ITEMS.some((item) => item.key === value);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR');
};

const formatPaymentDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 || 12;

  return `${String(year)}. ${month}. ${day}. ${period} ${String(hour12)}:${minute}:${second}`;
};

const formatQuestionDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 || 12;

  return `${String(year)}.${month}.${day} ${period} ${String(hour12)}:${minute}`;
};

const formatOrderNumberPreview = (value?: string | null) => {
  if (!value) return '-';

  const normalizedValue = value.replace(/^ORD-/i, '');
  return normalizedValue.slice(0, 8);
};

const formatOrderTypeLabel = (value?: PaymentResult['orderType'] | null) => {
  if (value === 'CART_CHECKOUT') return '장바구니 결제';
  if (value === 'PROGRAM') return '단일 강의 결제';

  return '-';
};

const resolvePaymentProcessedAt = (payment: PaymentResult) => {
  switch (payment.status) {
    case 'COMPLETED':
      return payment.paidAt ?? payment.registeredAt ?? payment.requestedAt;
    case 'CANCELLED':
      return payment.cancelledAt ?? payment.paidAt ?? payment.registeredAt ?? payment.requestedAt;
    case 'FAILED':
      return payment.failedAt ?? payment.requestedAt;
    case 'REGISTERED':
      return payment.registeredAt ?? payment.requestedAt;
    case 'PENDING':
    default:
      return payment.requestedAt;
  }
};

const formatDateRange = (startValue?: string | null, endValue?: string | null) => {
  const startDate = formatDate(startValue);
  const endDate = formatDate(endValue);

  if (startDate === '-' && endDate === '-') {
    return '-';
  }

  return `${startDate} ~ ${endDate === '-' ? '기간 제한 없음' : endDate}`;
};

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const formatQuestionScopeLabel = (value: QuestionScopeFilterValue) => {
  return QUESTION_SCOPE_LABELS[value];
};

const formatQuestionAnsweredLabel = (answered: boolean) => {
  return answered ? '답변 완료' : '답변 대기';
};

const getRemainingSeconds = (expiresAt: string | null): number => {
  if (!expiresAt) return 0;

  const remainingMilliseconds = new Date(expiresAt).getTime() - Date.now();
  return remainingMilliseconds > 0 ? Math.ceil(remainingMilliseconds / 1000) : 0;
};

const formatRemainingTimeLabel = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const MY_COURSE_PAGE_SIZE = 6;
const ORDER_LIST_PAGE_SIZE = 8;
const REVIEW_MINIMUM_COMPLETION_RATE = 30;
const PHONE_ALREADY_EXISTS_ERROR_MESSAGE = '이미 등록된 휴대폰 번호입니다.';
const PHONE_UNCHANGED_ERROR_MESSAGE = '현재 사용 중인 휴대폰 번호입니다.';
const PHONE_NUMBER_INVALID_ERROR_MESSAGE = '휴대폰 번호를 정확히 입력해 주세요.';
const PHONE_CHANGE_REQUEST_INVALID_ERROR_MESSAGE = '휴대폰 인증을 다시 진행해 주세요.';
const PHONE_VERIFICATION_CODE_ERROR_MESSAGE = '인증번호를 확인해 주세요.';
const NICKNAME_ALREADY_EXISTS_ERROR_MESSAGE = '이미 사용 중인 닉네임입니다.';
const PHONE_VERIFICATION_LIMIT_SECONDS = 180;

type EnrollmentCourseTabValue = 'ACTIVE' | 'EXPIRED' | 'CERTIFICATE';
type PaymentStatusFilterValue = 'ALL' | PaymentStatus;
type QuestionScopeFilterValue = MyQuestionScope | 'ALL';
type PhoneVerificationStep = 'send' | 'verify';

const getCertificateFileName = (programTitle: string) => {
  return `${programTitle.replace(/[\\/:*?"<>|]/g, '_')}_수료증.txt`;
};

const paginateItems = <T,>(items: T[], page: number, pageSize: number): T[] => {
  const safePage = Math.max(1, page);
  const startIndex = (safePage - 1) * pageSize;

  return items.slice(startIndex, startIndex + pageSize);
};

const getPageCount = (itemCount: number, pageSize: number): number => {
  return Math.max(1, Math.ceil(itemCount / pageSize));
};

const getEnrollmentCompletionRate = (completedLectures: number, totalLectures: number): number => {
  if (totalLectures <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((completedLectures / totalLectures) * 100)));
};

const canManageEnrollmentReview = ({
  completionRate,
  reviewWritten,
  status,
}: {
  completionRate: number;
  reviewWritten: boolean | undefined;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}) => {
  if (reviewWritten) {
    return true;
  }

  if (status === 'EXPIRED') {
    return true;
  }

  return completionRate >= REVIEW_MINIMUM_COMPLETION_RATE;
};

const omitPhoneFormError = (
  errors: PhoneFormErrors,
  fieldName: keyof PhoneFormErrors,
): PhoneFormErrors => {
  const { [fieldName]: omittedField, ...nextErrors } = errors;
  void omittedField;
  return nextErrors;
};

const normalizePhoneDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('82') ? `0${digits.slice(2)}` : digits;
};

const getPhoneNumberValidationError = (value: string): string | null => {
  return /^01\d{8,9}$/.test(normalizePhoneDigits(value))
    ? null
    : PHONE_NUMBER_INVALID_ERROR_MESSAGE;
};

const getPhoneCodeValidationError = (value: string): string | null => {
  return /^\d{6}$/.test(value.trim()) ? null : PHONE_VERIFICATION_CODE_ERROR_MESSAGE;
};

const resolvePhoneFormApiError = (
  error: unknown,
  step: PhoneVerificationStep,
): {
  message: string;
  fieldErrors: PhoneFormErrors;
} => {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      message: error instanceof Error ? error.message : '휴대폰 번호를 처리하지 못했습니다.',
    };
  }

  switch (error.code) {
    case 'AUTH_400_SMS_PHONE':
      return {
        fieldErrors: { phoneNumber: PHONE_NUMBER_INVALID_ERROR_MESSAGE },
        message: PHONE_NUMBER_INVALID_ERROR_MESSAGE,
      };
    case 'GLOBAL_400':
      return step === 'send'
        ? {
            fieldErrors: { phoneNumber: PHONE_NUMBER_INVALID_ERROR_MESSAGE },
            message: PHONE_NUMBER_INVALID_ERROR_MESSAGE,
          }
        : {
            fieldErrors: { code: PHONE_VERIFICATION_CODE_ERROR_MESSAGE },
            message: PHONE_VERIFICATION_CODE_ERROR_MESSAGE,
          };
    case 'USER_400_PHONE':
      return {
        fieldErrors: { phoneNumber: PHONE_ALREADY_EXISTS_ERROR_MESSAGE },
        message: PHONE_ALREADY_EXISTS_ERROR_MESSAGE,
      };
    case 'USER_400_PHONE_UNCHANGED':
      return {
        fieldErrors: { phoneNumber: PHONE_UNCHANGED_ERROR_MESSAGE },
        message: PHONE_UNCHANGED_ERROR_MESSAGE,
      };
    case 'USER_400_PHONE_CHANGE_REQUEST':
      return {
        fieldErrors: { phoneNumber: PHONE_CHANGE_REQUEST_INVALID_ERROR_MESSAGE },
        message: PHONE_CHANGE_REQUEST_INVALID_ERROR_MESSAGE,
      };
    case 'AUTH_400_SMS_CODE':
    case 'AUTH_400_SMS_EXPIRED':
    case 'AUTH_429_SMS_ATTEMPTS':
      return {
        fieldErrors: { code: PHONE_VERIFICATION_CODE_ERROR_MESSAGE },
        message: PHONE_VERIFICATION_CODE_ERROR_MESSAGE,
      };
    default:
      return {
        fieldErrors: {},
        message: error.message,
      };
  }
};

const PaginationControls = ({
  currentPage,
  onChange,
  totalPages,
}: {
  currentPage: number;
  onChange: (nextPage: number) => void;
  totalPages: number;
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={sharedStyles['segmentRow']}>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => {
        const isActive = currentPage === page;

        return (
          <button
            className={classNames(
              sharedStyles['segmentButton'],
              isActive && sharedStyles['segmentButtonActive'],
            )}
            key={page}
            onClick={() => {
              onChange(page);
            }}
            type='button'
          >
            {page}
          </button>
        );
      })}
    </div>
  );
};

interface ProfileFormValues {
  email: string;
  name: string;
  nickname: string;
}

interface ReviewFormValues {
  content: string;
  rating: string;
}

const DEFAULT_REVIEW_FORM_VALUES: ReviewFormValues = {
  content: '',
  rating: '',
};

const QUESTION_SCOPE_LABELS: Record<QuestionScopeFilterValue, string> = {
  ALL: '전체',
  GLOBAL: '운영 Q&A',
  PROGRAM: '강의 Q&A',
};

const MyPagePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const logout = useAuthStore((state) => state.logout);
  const storeDisplayName = useAuthStore((state) => state.displayName);
  const syncProfileSnapshot = useAuthStore((state) => state.syncProfileSnapshot);
  const showToast = useToastStore((state) => state.showToast);
  const profilePasswordInputRef = useRef<HTMLInputElement | null>(null);

  const activeViewParam = searchParams.get('view');
  const activeView = isMyPageViewKey(activeViewParam) ? activeViewParam : DEFAULT_VIEW;

  const [courseTab, setCourseTab] = useState<EnrollmentCourseTabValue>('ACTIVE');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilterValue>('ALL');
  const [coursePage, setCoursePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [questionScopeFilter, setQuestionScopeFilter] = useState<QuestionScopeFilterValue>('ALL');
  const [questionAnsweredFilter, setQuestionAnsweredFilter] =
    useState<MyQuestionAnsweredFilter>('ALL');
  const [questionSearchInput, setQuestionSearchInput] = useState('');
  const [questionKeyword, setQuestionKeyword] = useState('');
  const [questionPage, setQuestionPage] = useState(1);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [profileFormValues, setProfileFormValues] = useState<ProfileFormValues | null>(null);
  const [profileFormErrors, setProfileFormErrors] = useState<ProfileFormErrors>({});
  const [isProfilePasswordVerified, setIsProfilePasswordVerified] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordError, setProfilePasswordError] = useState<string | null>(null);
  const [isProfilePasswordVisible, setIsProfilePasswordVisible] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [reviewFormDraft, setReviewFormDraft] = useState<ReviewFormDraftState>({
    enrollmentId: null,
    values: DEFAULT_REVIEW_FORM_VALUES,
  });
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [phoneFormValues, setPhoneFormValues] = useState({
    phoneNumber: '',
    code: '',
  });
  const [phoneFormErrors, setPhoneFormErrors] = useState<PhoneFormErrors>({});
  const [sentVerification, setSentVerification] = useState<SmsSendResponse | null>(null);
  const [phoneCountdownSeconds, setPhoneCountdownSeconds] = useState(0);
  const [optionalMarketingConsent, setOptionalMarketingConsent] = useState(false);

  const profileQuery = useMyProfileQuery();
  const enrollmentsQuery = useMyEnrollmentsQuery();
  const allEnrollments = enrollmentsQuery.data ?? [];
  const activeEnrollments = allEnrollments.filter((enrollment) => enrollment.active);
  const expiredEnrollments = allEnrollments.filter(
    (enrollment) => !enrollment.active && enrollment.status !== 'CANCELLED',
  );
  const certificateEnrollments = allEnrollments.filter(
    (enrollment) => enrollment.certificateEligible && enrollment.status !== 'CANCELLED',
  );
  const filteredEnrollments =
    courseTab === 'ACTIVE'
      ? activeEnrollments
      : courseTab === 'EXPIRED'
        ? expiredEnrollments
        : certificateEnrollments;
  const coursePageCount = getPageCount(filteredEnrollments.length, MY_COURSE_PAGE_SIZE);
  const paginatedEnrollments = paginateItems(filteredEnrollments, coursePage, MY_COURSE_PAGE_SIZE);
  const paymentHistoryQuery = useMyPaymentHistoryQuery(activeView === 'payments');
  const enrollmentDetailQuery = useMyEnrollmentDetailQuery(
    selectedEnrollmentId,
    selectedEnrollmentId !== null,
  );
  const questionsQuery = useMyQuestionsQuery(
    {
      answered:
        questionAnsweredFilter === 'ALL' ? undefined : questionAnsweredFilter === 'ANSWERED',
      keyword: questionKeyword,
      page: questionPage - 1,
      scope: questionScopeFilter,
      size: 10,
    },
    activeView === 'questions',
  );
  const visiblePayments = (paymentHistoryQuery.data ?? []).filter((payment) => {
    return payment.status === 'COMPLETED' || payment.status === 'CANCELLED';
  });
  const filteredPayments = visiblePayments.filter((payment) => {
    return paymentStatusFilter === 'ALL' || payment.status === paymentStatusFilter;
  });
  const paymentPageCount = getPageCount(filteredPayments.length, ORDER_LIST_PAGE_SIZE);
  const paginatedPayments = paginateItems(filteredPayments, paymentPage, ORDER_LIST_PAGE_SIZE);
  const selectedPayment =
    selectedPaymentId === null
      ? null
      : (visiblePayments.find((payment) => payment.id === selectedPaymentId) ?? null);

  const accountName = profileQuery.data?.displayName || storeDisplayName || '회원';
  const selectedEnrollment =
    selectedEnrollmentId === null
      ? null
      : (allEnrollments.find((enrollment) => enrollment.id === selectedEnrollmentId) ?? null);
  const resolvedProfileFormValues: ProfileFormValues = {
    email: profileFormValues?.email ?? profileQuery.data?.email ?? '',
    name: profileFormValues?.name ?? profileQuery.data?.name ?? '',
    nickname: profileFormValues?.nickname ?? profileQuery.data?.nickname ?? '',
  };
  const reviewFormValues: ReviewFormValues =
    selectedEnrollmentId !== null && reviewFormDraft.enrollmentId === selectedEnrollmentId
      ? reviewFormDraft.values
      : {
          content: enrollmentDetailQuery.data?.review?.content ?? '',
          rating: enrollmentDetailQuery.data?.review
            ? String(enrollmentDetailQuery.data.review.rating)
            : '',
        };
  const isPhoneVerificationExpired = sentVerification !== null && phoneCountdownSeconds === 0;

  useEffect(() => {
    if (!profileQuery.data) return;

    syncProfileSnapshot({
      displayName: profileQuery.data.displayName,
      loginId: profileQuery.data.loginId,
      role: profileQuery.data.role,
    });
  }, [profileQuery.data, syncProfileSnapshot]);

  useEffect(() => {
    if (!sentVerification || phoneCountdownSeconds === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setPhoneCountdownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phoneCountdownSeconds, sentVerification]);

  useEffect(() => {
    const totalPages = questionsQuery.data?.totalPages ?? 1;
    if (questionPage > totalPages) {
      startTransition(() => {
        setQuestionPage(totalPages);
      });
    }
  }, [questionPage, questionsQuery.data?.totalPages]);

  const handleCourseTabChange = (nextTab: EnrollmentCourseTabValue) => {
    setCourseTab(nextTab);
    setCoursePage(1);
  };

  const handlePaymentFilterChange = (nextFilter: PaymentStatusFilterValue) => {
    setPaymentStatusFilter(nextFilter);
    setPaymentPage(1);
  };

  const handleQuestionScopeFilterChange = (nextFilter: QuestionScopeFilterValue) => {
    setQuestionScopeFilter(nextFilter);
    setQuestionPage(1);
  };

  const handleQuestionAnsweredFilterChange = (nextFilter: MyQuestionAnsweredFilter) => {
    setQuestionAnsweredFilter(nextFilter);
    setQuestionPage(1);
  };

  const handleViewChange = (viewKey: MyPageViewKey) => {
    if (viewKey !== 'profile') {
      setIsProfilePasswordVerified(false);
      setProfilePassword('');
      setProfilePasswordError(null);
      setIsProfilePasswordVisible(false);
    }

    const nextParams = new URLSearchParams(searchParams);

    if (viewKey === DEFAULT_VIEW) {
      nextParams.delete('view');
    } else {
      nextParams.set('view', viewKey);
    }

    setSearchParams(nextParams);
  };

  const closeReviewModal = () => {
    setSelectedEnrollmentId(null);
    setReviewFormDraft({
      enrollmentId: null,
      values: DEFAULT_REVIEW_FORM_VALUES,
    });
    setReviewFormError(null);
  };

  const closePaymentDetailModal = () => {
    setSelectedPaymentId(null);
  };

  const openPaymentDetailModal = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
  };

  const openReviewModal = (enrollmentId: number) => {
    setSelectedEnrollmentId(enrollmentId);
    setReviewFormDraft({
      enrollmentId: null,
      values: DEFAULT_REVIEW_FORM_VALUES,
    });
    setReviewFormError(null);
  };

  const closeProfilePasswordModal = () => {
    setProfilePassword('');
    setProfilePasswordError(null);
    setIsProfilePasswordVisible(false);
    handleViewChange(DEFAULT_VIEW);
  };

  const handleCertificateDownload = (programTitle: string, completedAt?: string | null) => {
    const certificateContent = [
      'SONO SCHOOL 수료증',
      '',
      `수강생: ${profileQuery.data?.displayName || accountName}`,
      `강의명: ${programTitle}`,
      `발급일: ${formatDate(new Date().toISOString())}`,
      `수료일: ${formatDate(completedAt)}`,
    ].join('\n');

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      showToast({
        message: '수료증 다운로드를 지원하지 않는 환경입니다.',
        variant: 'error',
      });
      return;
    }

    if (typeof URL.createObjectURL !== 'function') {
      showToast({
        message: '현재 브라우저에서 수료증 다운로드를 지원하지 않습니다.',
        variant: 'error',
      });
      return;
    }

    const blob = new Blob([certificateContent], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = getCertificateFileName(programTitle);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);

    showToast({
      message: '수료증 다운로드를 시작했습니다.',
      variant: 'success',
    });
  };

  const handleProfileFieldChange =
    (fieldName: 'email' | 'nickname') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setProfileFormValues((currentValues) => ({
        email:
          fieldName === 'email'
            ? nextValue
            : (currentValues?.email ?? profileQuery.data?.email ?? ''),
        name: currentValues?.name ?? profileQuery.data?.name ?? '',
        nickname:
          fieldName === 'nickname'
            ? nextValue
            : (currentValues?.nickname ?? profileQuery.data?.nickname ?? ''),
      }));

      if (fieldName === 'nickname') {
        setProfileFormErrors({});
      }
    };

  const handlePhoneFieldChange =
    (fieldName: 'phoneNumber' | 'code') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setPhoneFormValues((currentValues) => ({
        ...currentValues,
        [fieldName]: nextValue,
      }));
      setPhoneFormErrors((currentErrors) => omitPhoneFormError(currentErrors, fieldName));

      if (fieldName === 'phoneNumber') {
        setSentVerification(null);
        setPhoneCountdownSeconds(0);
      }
    };

  const logoutMutation = useMutation({
    mutationFn: logoutStudent,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '로그아웃에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: () => {
      logout();
      showToast({
        message: '로그아웃되었습니다.',
        variant: 'success',
      });
      void navigate(routePaths.home);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === 'USER_400_NICKNAME') {
        setProfileFormErrors({ nickname: NICKNAME_ALREADY_EXISTS_ERROR_MESSAGE });
        showToast({
          message: NICKNAME_ALREADY_EXISTS_ERROR_MESSAGE,
          variant: 'error',
        });
        return;
      }

      showToast({
        message:
          error instanceof Error
            ? error.message
            : '회원 정보를 수정하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(myProfileQueryKey, updatedProfile);
      syncProfileSnapshot({
        displayName: updatedProfile.displayName,
        loginId: updatedProfile.loginId,
        role: updatedProfile.role,
      });
      setProfileFormValues({
        email: updatedProfile.email,
        name: updatedProfile.name,
        nickname: updatedProfile.nickname ?? '',
      });
      setProfileFormErrors({});
      showToast({
        message: '회원 정보를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const sendPhoneVerificationMutation = useMutation({
    mutationFn: sendMyPhoneVerification,
    onError: (error: unknown) => {
      const { fieldErrors, message } = resolvePhoneFormApiError(error, 'send');
      setPhoneFormErrors(fieldErrors);
      setSentVerification(null);
      setPhoneCountdownSeconds(0);
      showToast({
        message,
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      setSentVerification(response);
      setPhoneCountdownSeconds(
        Math.min(PHONE_VERIFICATION_LIMIT_SECONDS, getRemainingSeconds(response.expiresAt)),
      );
      setPhoneFormErrors({});
      showToast({
        message: '인증번호를 발송했습니다.',
        variant: 'success',
      });
    },
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: verifyMyPhoneChange,
    onError: (error: unknown) => {
      const { fieldErrors, message } = resolvePhoneFormApiError(error, 'verify');
      setPhoneFormErrors(fieldErrors);
      showToast({
        message,
        variant: 'error',
      });
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(myProfileQueryKey, updatedProfile);
      syncProfileSnapshot({
        displayName: updatedProfile.displayName,
        loginId: updatedProfile.loginId,
        role: updatedProfile.role,
      });
      setPhoneFormValues({
        code: '',
        phoneNumber: '',
      });
      setPhoneFormErrors({});
      setSentVerification(null);
      setPhoneCountdownSeconds(0);
      showToast({
        message: '휴대폰 번호를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const verifyProfilePasswordMutation = useMutation({
    mutationFn: verifyMyProfilePassword,
    onError: (error: unknown) => {
      setProfilePasswordError(
        error instanceof Error ? error.message : '비밀번호를 확인하지 못했습니다.',
      );
    },
    onSuccess: () => {
      setIsProfilePasswordVerified(true);
      setProfilePassword('');
      setProfilePasswordError(null);
      setIsProfilePasswordVisible(false);
    },
  });

  const handleProfilePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const password = profilePassword.trim();
    if (!password) {
      setProfilePasswordError('비밀번호를 입력해 주세요.');
      return;
    }

    setProfilePasswordError(null);
    verifyProfilePasswordMutation.mutate({ password });
  };

  const handleSendPhoneVerification = () => {
    const phoneNumber = phoneFormValues.phoneNumber.trim();
    const phoneNumberError = getPhoneNumberValidationError(phoneNumber);

    if (phoneNumberError) {
      setSentVerification(null);
      setPhoneCountdownSeconds(0);
      setPhoneFormErrors((currentErrors) => ({
        ...omitPhoneFormError(currentErrors, 'code'),
        phoneNumber: phoneNumberError,
      }));
      showToast({
        message: phoneNumberError,
        variant: 'error',
      });
      return;
    }

    setSentVerification(null);
    setPhoneCountdownSeconds(0);
    sendPhoneVerificationMutation.mutate({ phoneNumber });
  };

  const handleVerifyPhoneChange = () => {
    const phoneNumber = phoneFormValues.phoneNumber.trim();
    const code = phoneFormValues.code.trim();
    const phoneNumberError = getPhoneNumberValidationError(phoneNumber);
    const codeError = getPhoneCodeValidationError(code);

    if (phoneNumberError || codeError) {
      setPhoneFormErrors({
        ...(phoneNumberError ? { phoneNumber: phoneNumberError } : {}),
        ...(codeError ? { code: codeError } : {}),
      });
      showToast({
        message: phoneNumberError ?? codeError ?? '입력값을 확인해 주세요.',
        variant: 'error',
      });
      return;
    }

    verifyPhoneMutation.mutate({
      code,
      phoneNumber,
    });
  };

  const reviewMutation = useMutation({
    mutationFn: async ({
      detailReviewId,
      payload,
      programId,
    }: {
      detailReviewId: number | null;
      payload: EnrollmentReviewPayload;
      programId: number;
    }) => {
      if (detailReviewId !== null) {
        await updateMyEnrollmentReview(detailReviewId, payload);
        return 'update' as const;
      }

      await createMyEnrollmentReview(programId, payload);
      return 'create' as const;
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '후기를 저장하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (mode) => {
      await queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey });
      if (selectedEnrollmentId !== null) {
        await queryClient.invalidateQueries({
          queryKey: myEnrollmentDetailQueryKey(selectedEnrollmentId),
        });
      }
      closeReviewModal();
      showToast({
        message: mode === 'update' ? '후기를 수정했습니다.' : '후기를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const handleReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const detail = enrollmentDetailQuery.data;
    if (!detail) {
      setReviewFormError('후기 대상 강의 정보를 불러오지 못했습니다.');
      return;
    }

    const rating = Number.parseInt(reviewFormValues.rating, 10);
    const content = reviewFormValues.content.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setReviewFormError('평점은 1점부터 5점 사이로 입력해 주세요.');
      return;
    }

    if (content.length === 0) {
      setReviewFormError('후기 내용을 입력해 주세요.');
      return;
    }

    setReviewFormError(null);
    reviewMutation.mutate({
      detailReviewId: detail.review?.id ?? null,
      payload: {
        content,
        rating,
      },
      programId: detail.programId,
    });
  };

  const renderReviewAction = (enrollment: (typeof allEnrollments)[number], className?: string) => {
    if (
      !canManageEnrollmentReview({
        completionRate: enrollment.completionRate,
        reviewWritten: enrollment.reviewWritten,
        status: enrollment.status,
      })
    ) {
      return null;
    }

    return (
      <Button
        className={classNames(styles['courseSecondaryAction'], className)}
        onClick={() => {
          openReviewModal(enrollment.id);
        }}
        size='sm'
        type='button'
        variant='secondary'
      >
        {enrollment.reviewWritten ? '후기 수정' : '후기 작성'}
      </Button>
    );
  };

  const renderLearningCourses = () => {
    const activeCount = activeEnrollments.length;
    const expiredCount = expiredEnrollments.length;
    const certificateCount = certificateEnrollments.length;
    const courseOverviewItems: Array<{
      count: number;
      key: EnrollmentCourseTabValue;
      label: string;
    }> = [
      { count: activeCount, key: 'ACTIVE', label: '수강 중' },
      { count: expiredCount, key: 'EXPIRED', label: '수강 종료' },
      { count: certificateCount, key: 'CERTIFICATE', label: '수료증' },
    ];

    if (enrollmentsQuery.isLoading) {
      return <p className={sharedStyles['mutedText']}>수강 내역을 불러오는 중입니다.</p>;
    }

    if (enrollmentsQuery.isError) {
      return (
        <p className={styles['errorText']}>
          {enrollmentsQuery.error instanceof Error
            ? enrollmentsQuery.error.message
            : '수강 내역을 불러오지 못했습니다.'}
        </p>
      );
    }

    if (!allEnrollments.length) {
      return <p className={sharedStyles['mutedText']}>수강 중인 강의가 없습니다.</p>;
    }

    const renderCertificateEnrollments = () => {
      const hasCertificateEnrollments = filteredEnrollments.length > 0;

      return (
        <>
          <div className={styles['certificateNotice']}>
            <span
              aria-hidden='true'
              className={styles['certificateNoticeIcon']}
              style={certificateInfoIconStyle}
            />
            <p className={styles['certificateNoticeText']}>
              수료증은 진도율 100% 및 수료 기준 충족 시 발급됩니다.
            </p>
          </div>

          {!hasCertificateEnrollments ? (
            <p
              className={classNames(
                sharedStyles['mutedText'],
                styles['learningEmptyState'],
                styles['certificateEmptyState'],
              )}
            >
              다운로드 가능한 수료증이 없습니다.
            </p>
          ) : (
            <div
              className={classNames(
                styles['learningCoursesBody'],
                styles['certificateCoursesBody'],
              )}
            >
              <div className={styles['certificateList']}>
                {paginatedEnrollments.map((enrollment) => {
                  return (
                    <article className={styles['certificateListItem']} key={enrollment.id}>
                      <div className={styles['certificateRow']}>
                        <div className={styles['certificateMedia']}>
                          {enrollment.programThumbnailUrl ? (
                            <img
                              alt={`${enrollment.programTitle} 대표 이미지`}
                              className={styles['certificateImage']}
                              loading='lazy'
                              src={enrollment.programThumbnailUrl}
                            />
                          ) : (
                            <div aria-hidden='true' className={styles['certificateFallback']}>
                              <span>SS</span>
                            </div>
                          )}
                        </div>

                        <strong className={styles['certificateTitle']}>
                          {enrollment.programTitle}
                        </strong>

                        <button
                          className={styles['certificateDownloadButton']}
                          onClick={() => {
                            handleCertificateDownload(
                              enrollment.programTitle,
                              enrollment.completedAt ?? enrollment.lastLearningAt,
                            );
                          }}
                          type='button'
                        >
                          <span>수료증 다운로드</span>
                          <span
                            aria-hidden='true'
                            className={styles['certificateDownloadButtonIcon']}
                            style={certificateDownloadIconStyle}
                          />
                        </button>
                      </div>
                      <div aria-hidden='true' className={styles['certificateDivider']} />
                    </article>
                  );
                })}
              </div>

              <div className={styles['learningPagination']}>
                <PaginationControls
                  currentPage={coursePage}
                  onChange={setCoursePage}
                  totalPages={coursePageCount}
                />
              </div>
            </div>
          )}
        </>
      );
    };

    return (
      <section className={classNames(styles['contentSection'], styles['learningSection'])}>
        <div className={styles['learningHeader']}>
          <h2 className={styles['learningTitle']}>내 강의</h2>
        </div>

        <div className={styles['courseOverviewGrid']} role='tablist' aria-label='내 강의 상태'>
          {courseOverviewItems.map((item) => {
            const isActive = courseTab === item.key;

            return (
              <button
                aria-pressed={isActive}
                className={classNames(
                  styles['courseOverviewButton'],
                  isActive && styles['courseOverviewButtonActive'],
                )}
                key={item.key}
                onClick={() => {
                  handleCourseTabChange(item.key);
                }}
                type='button'
              >
                <span
                  className={classNames(
                    styles['courseOverviewLabel'],
                    isActive && styles['courseOverviewLabelActive'],
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={classNames(
                    styles['courseOverviewCount'],
                    isActive
                      ? styles['courseOverviewCountActive']
                      : styles['courseOverviewCountInactive'],
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {courseTab === 'CERTIFICATE' ? (
          renderCertificateEnrollments()
        ) : !filteredEnrollments.length ? (
          <p className={classNames(sharedStyles['mutedText'], styles['learningEmptyState'])}>
            선택한 탭에 표시할 강의가 없습니다.
          </p>
        ) : (
          <div className={styles['learningCoursesBody']}>
            <div className={styles['courseGrid']}>
              {paginatedEnrollments.map((enrollment) => {
                const completionRate = getEnrollmentCompletionRate(
                  enrollment.completedLectures,
                  enrollment.totalLectures,
                );
                const reviewAction =
                  courseTab === 'EXPIRED'
                    ? renderReviewAction(enrollment, styles['courseSecondaryActionWide'])
                    : renderReviewAction(enrollment);

                const cardBody = (
                  <>
                    <div className={styles['courseCardMedia']}>
                      {enrollment.programThumbnailUrl ? (
                        <img
                          alt={`${enrollment.programTitle} 대표 이미지`}
                          className={styles['courseCardImage']}
                          loading='lazy'
                          src={enrollment.programThumbnailUrl}
                        />
                      ) : (
                        <div aria-hidden='true' className={styles['courseCardFallback']}>
                          <span>SS</span>
                        </div>
                      )}
                    </div>

                    <div className={styles['courseCardBody']}>
                      <div className={styles['courseCardHeader']}>
                        <strong className={styles['courseCardTitle']}>
                          {enrollment.programTitle}
                        </strong>
                      </div>

                      <div className={styles['courseProgressSection']}>
                        <div className={styles['courseProgressMeta']}>
                          <span className={styles['courseProgressCount']}>
                            <span className={styles['courseProgressCountText']}>
                              {enrollment.completedLectures}
                            </span>
                            <span className={styles['courseProgressSeparator']}>/</span>
                            <span className={styles['courseProgressCountText']}>
                              {enrollment.totalLectures}강
                            </span>
                          </span>
                          <span
                            className={classNames(
                              styles['courseProgressPercent'],
                              completionRate >= 100 && styles['courseProgressPercentComplete'],
                            )}
                          >
                            {completionRate}%
                          </span>
                        </div>
                        <div aria-hidden='true' className={styles['courseProgressTrack']}>
                          <span
                            className={styles['courseProgressFill']}
                            style={{ width: `${String(completionRate)}%` }}
                          />
                        </div>
                      </div>

                      <div className={styles['courseMetaList']}>
                        {courseTab === 'EXPIRED' ? (
                          <p className={styles['courseMetaStatus']}>수강 종료</p>
                        ) : null}
                        <div className={styles['courseMetaRow']}>
                          <span className={styles['courseMetaLabel']}>수강 기간</span>
                          <span className={styles['courseMetaValue']}>
                            {formatDateRange(enrollment.enrolledAt, enrollment.expireAt)}
                          </span>
                        </div>
                        {courseTab !== 'EXPIRED' ? (
                          <div className={styles['courseMetaRow']}>
                            <span className={styles['courseMetaLabel']}>최근 학습</span>
                            <span className={styles['courseMetaValue']}>
                              {formatDate(enrollment.lastLearningAt)}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {courseTab === 'EXPIRED' ? (
                        <div
                          className={classNames(
                            styles['courseCardFooter'],
                            styles['courseCardFooterExpired'],
                          )}
                        >
                          {reviewAction}
                        </div>
                      ) : (
                        <div className={styles['courseCardFooter']}>
                          <div className={styles['courseActionGroup']}>
                            <Link
                              className={styles['learningActionLink']}
                              to={routePaths.learningPlayer(String(enrollment.id))}
                            >
                              이어보기
                            </Link>
                            {reviewAction}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );

                return (
                  <article className={styles['courseCard']} key={enrollment.id}>
                    {cardBody}
                  </article>
                );
              })}
            </div>

            <div className={styles['learningPagination']}>
              <PaginationControls
                currentPage={coursePage}
                onChange={setCoursePage}
                totalPages={coursePageCount}
              />
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderOrderHistory = () => {
    const paymentCount = visiblePayments.length;
    const completedCount = visiblePayments.filter(
      (payment) => payment.status === 'COMPLETED',
    ).length;
    const cancelledCount = visiblePayments.filter(
      (payment) => payment.status === 'CANCELLED',
    ).length;
    const paymentFilterItems: Array<{
      count: number;
      label: string;
      value: PaymentStatusFilterValue;
    }> = [
      { count: paymentCount, label: '전체', value: 'ALL' },
      { count: completedCount, label: '결제 완료', value: 'COMPLETED' },
      { count: cancelledCount, label: '결제 취소', value: 'CANCELLED' },
    ];

    return (
      <section className={classNames(styles['contentSection'], styles['paymentSection'])}>
        <div className={styles['paymentHeader']}>
          <h2 className={styles['paymentTitle']}>결제내역</h2>
        </div>

        <div className={styles['paymentOverviewGrid']} role='tablist' aria-label='결제 상태'>
          {paymentFilterItems.map((item) => {
            const isActive = item.value === paymentStatusFilter;

            return (
              <button
                aria-pressed={isActive}
                className={classNames(
                  styles['paymentOverviewButton'],
                  isActive && styles['paymentOverviewButtonActive'],
                )}
                key={item.value}
                onClick={() => {
                  handlePaymentFilterChange(item.value);
                }}
                type='button'
              >
                <span
                  className={classNames(
                    styles['paymentOverviewLabel'],
                    isActive && styles['paymentOverviewLabelActive'],
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={classNames(
                    styles['paymentOverviewCount'],
                    isActive
                      ? styles['paymentOverviewCountActive']
                      : styles['paymentOverviewCountInactive'],
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {paymentHistoryQuery.isLoading ? (
          <p className={classNames(sharedStyles['mutedText'], styles['paymentEmptyState'])}>
            결제 내역을 불러오는 중입니다.
          </p>
        ) : null}

        {paymentHistoryQuery.isError ? (
          <p className={classNames(styles['errorText'], styles['paymentEmptyState'])}>
            {paymentHistoryQuery.error instanceof Error
              ? paymentHistoryQuery.error.message
              : '결제 내역을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        filteredPayments.length ? (
          <div className={styles['paymentList']}>
            {paginatedPayments.map((payment) => {
              const statusTone = payment.status === 'CANCELLED' ? 'cancelled' : 'completed';

              return (
                <article className={styles['paymentCard']} key={payment.id}>
                  <button
                    aria-label={`${payment.orderName} 결제 상세보기`}
                    className={styles['paymentCardClickTarget']}
                    onClick={() => {
                      openPaymentDetailModal(payment.id);
                    }}
                    type='button'
                  />
                  <div className={styles['paymentCardHeader']}>
                    <div className={styles['paymentCardTitleGroup']}>
                      <strong className={styles['paymentCardTitle']}>{payment.orderName}</strong>
                      <p
                        className={styles['paymentOrderNumber']}
                        title={payment.orderNumber ?? undefined}
                      >
                        주문번호 {formatOrderNumberPreview(payment.orderNumber)}
                      </p>
                    </div>
                    <span
                      className={classNames(
                        styles['paymentStatusChip'],
                        statusTone === 'completed'
                          ? styles['paymentStatusChipCompleted']
                          : styles['paymentStatusChipCancelled'],
                      )}
                    >
                      {paymentStatusLabels[payment.status]}
                    </span>
                  </div>

                  <div className={styles['paymentMetaGrid']}>
                    <div className={styles['paymentMetaItem']}>
                      <span className={styles['paymentMetaLabel']}>결제일</span>
                      <strong className={styles['paymentMetaValue']}>
                        {formatPaymentDateTime(resolvePaymentProcessedAt(payment))}
                      </strong>
                    </div>
                    <div className={styles['paymentMetaItem']}>
                      <span className={styles['paymentMetaLabel']}>결제 수단</span>
                      <strong className={styles['paymentMetaValue']}>
                        {formatPaymentMethodLabel(payment.paymentMethod)}
                      </strong>
                    </div>
                    <div className={styles['paymentMetaItem']}>
                      <span className={styles['paymentMetaLabel']}>결제 금액</span>
                      <strong className={styles['paymentMetaValue']}>
                        {formatCurrency(payment.amount)}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        paymentCount > 0 &&
        filteredPayments.length === 0 ? (
          <p className={classNames(sharedStyles['mutedText'], styles['paymentEmptyState'])}>
            선택한 상태의 결제 내역이 없습니다.
          </p>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        filteredPayments.length ? (
          <div className={styles['paymentPagination']}>
            <PaginationControls
              currentPage={paymentPage}
              onChange={setPaymentPage}
              totalPages={paymentPageCount}
            />
          </div>
        ) : null}

        {!paymentHistoryQuery.isLoading && !paymentHistoryQuery.isError && paymentCount === 0 ? (
          <p className={classNames(sharedStyles['mutedText'], styles['paymentEmptyState'])}>
            결제 내역이 없습니다.
          </p>
        ) : null}
      </section>
    );
  };

  const renderQuestionManagement = () => {
    const questionPageData = questionsQuery.data;
    const questions = questionPageData?.content ?? [];
    const totalQuestionCount = questionPageData?.totalElements ?? 0;
    const questionTotalPages = Math.max(1, questionPageData?.totalPages ?? 1);

    return (
      <section className={styles['questionSection']}>
        <h2 className={styles['questionTitle']}>Q&A 관리</h2>

        <div className={styles['questionNotice']}>
          <span
            aria-hidden='true'
            className={styles['questionNoticeIcon']}
            style={questionInfoIconStyle}
          />
          <div className={styles['questionNoticeBody']}>
            <strong className={styles['questionNoticeTitle']}>이용 안내</strong>
            <p className={styles['questionNoticeText']}>
              운영 Q&A는 상단 헤더의 Q&A에서, 강의 Q&A는 각 과정의 강의 화면에서 남길 수 있습니다.
            </p>
            <p className={styles['questionNoticeText']}>
              마이페이지에서는 내가 남긴 질문과 답변을 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className={styles['questionFilters']}>
          <div className={styles['questionFilterRow']} role='tablist' aria-label='Q&A 유형 필터'>
            {[
              { label: '전체', value: 'ALL' },
              { label: '운영 Q&A', value: 'GLOBAL' },
              { label: '강의 Q&A', value: 'PROGRAM' },
            ].map((option) => {
              const isActive = questionScopeFilter === option.value;

              return (
                <button
                  aria-selected={isActive}
                  className={classNames(
                    styles['questionFilterButton'],
                    isActive && styles['questionFilterButtonActive'],
                  )}
                  key={option.value}
                  onClick={() => {
                    handleQuestionScopeFilterChange(option.value as QuestionScopeFilterValue);
                  }}
                  role='tab'
                  type='button'
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className={styles['questionFilterRow']} role='tablist' aria-label='답변 상태 필터'>
            {[
              { label: '전체', value: 'ALL' },
              { label: '답변 완료', value: 'ANSWERED' },
              { label: '답변 대기', value: 'WAITING' },
            ].map((option) => {
              const isActive = questionAnsweredFilter === option.value;

              return (
                <button
                  aria-selected={isActive}
                  className={classNames(
                    styles['questionFilterButton'],
                    isActive && styles['questionFilterButtonActive'],
                  )}
                  key={option.value}
                  onClick={() => {
                    handleQuestionAnsweredFilterChange(option.value as MyQuestionAnsweredFilter);
                  }}
                  role='tab'
                  type='button'
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles['questionToolbar']}>
          <p className={styles['questionTotalCount']}>
            총 <strong>{totalQuestionCount}</strong>건
          </p>
          <UnifiedSearchBar
            className={styles['questionSearchBar']}
            inputAriaLabel='내 질문 검색'
            onChange={(nextValue) => {
              setQuestionSearchInput(nextValue);
            }}
            onSubmit={() => {
              setQuestionKeyword(questionSearchInput);
              setQuestionPage(1);
            }}
            placeholder='제목, 내용, 프로그램명, 강의명을 검색해 주세요.'
            value={questionSearchInput}
          />
        </div>

        {questionsQuery.isLoading ? (
          <p className={classNames(sharedStyles['mutedText'], styles['questionEmptyState'])}>
            내 질문을 불러오는 중입니다.
          </p>
        ) : null}

        {questionsQuery.isError ? (
          <p className={classNames(styles['errorText'], styles['questionEmptyState'])}>
            {questionsQuery.error instanceof Error
              ? questionsQuery.error.message
              : '내 질문을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!questionsQuery.isLoading && !questionsQuery.isError && questions.length ? (
          <div className={styles['questionList']}>
            {questions.map((question) => {
              const isExpanded = expandedQuestionId === question.id;
              const programLabel = question.programTitle ?? '운영 문의';
              const replyCount = question.replies.length;
              const hasAnswer = replyCount > 0;
              const toggleIconStyle = isExpanded
                ? questionChevronUpIconStyle
                : questionChevronDownIconStyle;

              return (
                <article className={styles['questionCard']} key={question.id}>
                  <div className={styles['questionCardMain']}>
                    <div className={styles['questionCardHeader']}>
                      <strong className={styles['questionCardTitle']}>{question.title}</strong>
                      <span
                        className={classNames(
                          styles['questionStatusChip'],
                          hasAnswer
                            ? styles['questionStatusChipAnswered']
                            : styles['questionStatusChipWaiting'],
                        )}
                      >
                        {formatQuestionAnsweredLabel(hasAnswer)}
                      </span>
                    </div>

                    <div className={styles['questionMetaRow']}>
                      <span>{formatQuestionScopeLabel(question.scope)}</span>
                      <span aria-hidden='true' className={styles['questionMetaDot']} />
                      <span>{programLabel}</span>
                    </div>

                    <div className={styles['questionMetaRow']}>
                      <span>작성일 {formatQuestionDateTime(question.createdAt)}</span>
                      <span aria-hidden='true' className={styles['questionMetaDot']} />
                      <span>
                        답글 <strong>{replyCount}</strong>개
                      </span>
                    </div>

                    <p className={styles['questionContent']}>{question.content}</p>

                    <button
                      className={classNames(
                        styles['questionReplyToggleButton'],
                        isExpanded && styles['questionReplyToggleButtonActive'],
                      )}
                      onClick={() => {
                        setExpandedQuestionId((current) =>
                          current === question.id ? null : question.id,
                        );
                      }}
                      type='button'
                    >
                      {isExpanded ? '답변 접기' : '답변 보기'}
                      <span
                        aria-hidden='true'
                        className={styles['questionReplyToggleIcon']}
                        style={toggleIconStyle}
                      />
                    </button>
                  </div>

                  {isExpanded && hasAnswer ? (
                    <div className={styles['questionReplies']}>
                      {question.replies.map((reply) => (
                        <div className={styles['questionReply']} key={reply.id}>
                          <span
                            aria-hidden='true'
                            className={styles['questionReplyIcon']}
                            style={questionReplyIconStyle}
                          />
                          <div className={styles['questionReplyBody']}>
                            <div className={styles['questionReplyHeader']}>
                              <strong className={styles['questionReplyAuthor']}>
                                {reply.adminReply ? '관리자' : reply.authorName}
                              </strong>
                              <span className={styles['questionReplyBadge']}>
                                {reply.adminReply ? '운영 답변' : '답글'}
                              </span>
                            </div>
                            <p className={styles['questionReplyDate']}>
                              {formatQuestionDateTime(reply.createdAt)}
                            </p>
                            <p className={styles['questionReplyContent']}>{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {!questionsQuery.isLoading && !questionsQuery.isError && totalQuestionCount > 0 ? (
          <PaginationControls
            currentPage={questionPage}
            onChange={setQuestionPage}
            totalPages={questionTotalPages}
          />
        ) : null}

        {!questionsQuery.isLoading && !questionsQuery.isError && totalQuestionCount === 0 ? (
          <p className={classNames(sharedStyles['mutedText'], styles['questionEmptyState'])}>
            등록된 질문이 없습니다.
          </p>
        ) : null}
      </section>
    );
  };

  const renderProfileBasic = () => {
    if (profileQuery.isLoading) {
      return <p className={sharedStyles['mutedText']}>기본 정보를 불러오는 중입니다.</p>;
    }

    if (profileQuery.isError || !profileQuery.data) {
      return (
        <p className={styles['errorText']}>
          {profileQuery.error instanceof Error
            ? profileQuery.error.message
            : '기본 정보를 불러오지 못했습니다.'}
        </p>
      );
    }

    const resetProfileForm = () => {
      setProfileFormValues({
        email: profileQuery.data.email,
        name: profileQuery.data.name,
        nickname: profileQuery.data.nickname ?? '',
      });
      setProfileFormErrors({});
      setPhoneFormValues({
        code: '',
        phoneNumber: '',
      });
      setPhoneFormErrors({});
      setSentVerification(null);
      setPhoneCountdownSeconds(0);
    };

    return (
      <section className={styles['profileSection']}>
        <h2 className={styles['profileTitle']}>내 정보 관리</h2>

        <div className={styles['profileAccountBlock']}>
          <h3 className={styles['profileSectionTitle']}>계정 정보</h3>

          <div className={styles['profileFormRows']}>
            <div className={styles['profileFormRow']}>
              <span className={styles['profileRowLabel']}>아이디</span>
              <div className={styles['profileFieldShell']}>
                <input
                  className={classNames(styles['profileInlineInput'], styles['profileInputMuted'])}
                  name='loginId'
                  readOnly
                  value={profileQuery.data.loginId}
                />
              </div>
              <span className={styles['profileRowHint']}>변경이 불가능합니다.</span>
            </div>

            <div className={styles['profileFormRow']}>
              <span className={styles['profileRowLabel']}>이메일</span>
              <div className={styles['profileFieldShell']}>
                <input
                  className={classNames(styles['profileInlineInput'], styles['profileInputMuted'])}
                  name='email'
                  readOnly
                  type='email'
                  value={resolvedProfileFormValues.email}
                />
              </div>
              <span className={styles['profileRowHint']}>변경이 불가능합니다.</span>
            </div>

            <div className={styles['profileFormRow']}>
              <span className={styles['profileRowLabel']}>이름</span>
              <div className={styles['profileFieldShell']}>
                <input
                  className={styles['profileInlineInput']}
                  name='name'
                  readOnly
                  value={resolvedProfileFormValues.name}
                />
              </div>
            </div>

            <div className={styles['profileFormRow']}>
              <label className={styles['profileRowLabel']} htmlFor='profile_nickname'>
                닉네임
              </label>
              <div className={styles['profileFieldShell']}>
                <input
                  aria-describedby={
                    profileFormErrors.nickname ? 'profile_nickname_error' : undefined
                  }
                  aria-invalid={Boolean(profileFormErrors.nickname)}
                  className={styles['profileInlineInput']}
                  id='profile_nickname'
                  name='nickname'
                  onChange={handleProfileFieldChange('nickname')}
                  placeholder='닉네임'
                  value={resolvedProfileFormValues.nickname}
                />
                {profileFormErrors.nickname ? (
                  <p className={styles['profileFieldErrorText']} id='profile_nickname_error'>
                    {profileFormErrors.nickname}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={styles['profilePhoneBlock']}>
          <div className={styles['profileFormRows']}>
            <div className={styles['profileStaticRow']}>
              <span className={styles['profileRowLabel']}>현재 휴대폰 번호</span>
              <strong className={styles['profileStaticValue']}>
                {profileQuery.data.phoneNumber || '-'}
              </strong>
            </div>

            <div className={styles['profileStaticRow']}>
              <span className={styles['profileRowLabel']}>휴대폰 인증 상태</span>
              {profileQuery.data.phoneVerifiedAt ? (
                <span aria-label='휴대폰 인증 완료' className={styles['profileVerifiedBadge']}>
                  <span
                    aria-hidden='true'
                    className={styles['profileVerifiedIcon']}
                    style={profileCircleCheckIconStyle}
                  />
                  인증 완료
                </span>
              ) : (
                <span className={styles['profileUnverifiedText']}>휴대폰 인증 필요</span>
              )}
            </div>

            <div className={styles['profileFormRow']}>
              <label className={styles['profileRowLabel']} htmlFor='profile_new_phone'>
                새 휴대폰 번호
              </label>
              <div className={styles['profilePhoneFieldGroup']}>
                <input
                  aria-describedby={
                    phoneFormErrors.phoneNumber ? 'profile_new_phone_error' : undefined
                  }
                  aria-invalid={Boolean(phoneFormErrors.phoneNumber)}
                  className={styles['profileInlineInput']}
                  id='profile_new_phone'
                  inputMode='tel'
                  name='phoneNumber'
                  onChange={handlePhoneFieldChange('phoneNumber')}
                  placeholder='- 없이 숫자만 입력해주세요'
                  type='tel'
                  value={phoneFormValues.phoneNumber}
                />
                {phoneFormErrors.phoneNumber ? (
                  <p className={styles['profileFieldErrorText']} id='profile_new_phone_error'>
                    {phoneFormErrors.phoneNumber}
                  </p>
                ) : null}
              </div>
              <button
                className={styles['profileOutlineButton']}
                disabled={
                  sendPhoneVerificationMutation.isPending ||
                  phoneFormValues.phoneNumber.trim().length === 0 ||
                  (sentVerification !== null && !isPhoneVerificationExpired)
                }
                onClick={handleSendPhoneVerification}
                type='button'
              >
                {sendPhoneVerificationMutation.isPending
                  ? '발송 중...'
                  : sentVerification && !isPhoneVerificationExpired
                    ? '발송 완료'
                    : '인증번호 받기'}
              </button>
            </div>

            <div className={styles['profileFormRow']}>
              <label className={styles['profileRowLabel']} htmlFor='profile_phone_code'>
                인증번호 입력
              </label>
              <div className={styles['profilePhoneFieldGroup']}>
                <input
                  aria-describedby={
                    phoneFormErrors.code || sentVerification
                      ? 'profile_phone_code_status'
                      : undefined
                  }
                  aria-invalid={Boolean(phoneFormErrors.code)}
                  className={styles['profileInlineInput']}
                  id='profile_phone_code'
                  inputMode='numeric'
                  maxLength={6}
                  name='code'
                  onChange={handlePhoneFieldChange('code')}
                  pattern='[0-9]{6}'
                  placeholder='인증번호 6자리를입력해주세요'
                  value={phoneFormValues.code}
                />
                {phoneFormErrors.code ? (
                  <p className={styles['profileFieldErrorText']} id='profile_phone_code_status'>
                    {phoneFormErrors.code}
                  </p>
                ) : sentVerification ? (
                  <p className={styles['profileAssistText']} id='profile_phone_code_status'>
                    {isPhoneVerificationExpired
                      ? '인증 시간이 만료되었습니다. 다시 발송해 주세요.'
                      : `남은 시간 ${formatRemainingTimeLabel(phoneCountdownSeconds)}`}
                  </p>
                ) : null}
              </div>
              <button
                className={styles['profileDisabledButton']}
                disabled={
                  verifyPhoneMutation.isPending ||
                  isPhoneVerificationExpired ||
                  phoneFormValues.phoneNumber.trim().length === 0 ||
                  phoneFormValues.code.trim().length !== 6
                }
                onClick={handleVerifyPhoneChange}
                type='button'
              >
                {verifyPhoneMutation.isPending ? '변경 중...' : '번호 변경'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles['profileConsentBlock']}>
          <h3 className={styles['profileSectionTitle']}>선택 정보 동의</h3>

          <label className={styles['profileConsentRow']}>
            <input
              checked={optionalMarketingConsent}
              className={styles['profileConsentInput']}
              onChange={(event) => {
                setOptionalMarketingConsent(event.target.checked);
              }}
              type='checkbox'
            />
            <span className={styles['profileConsentBox']} aria-hidden='true'>
              <span className={styles['profileConsentCheck']} />
            </span>
            <span className={styles['profileConsentText']}>
              이메일 변경과 마케팅 수신 동의 변경은 현재 준비 중입니다.
            </span>
          </label>

          <button className={styles['profileConsentLink']} type='button'>
            마케팅 수신 동의서 (임시)
            <span aria-hidden='true' className={styles['profileConsentArrow']} />
          </button>
        </div>

        <div className={styles['profileActionRow']}>
          <button
            className={styles['profileCancelButton']}
            onClick={resetProfileForm}
            type='button'
          >
            취소하기
          </button>
          <button
            className={styles['profileSaveButton']}
            disabled={
              updateProfileMutation.isPending ||
              resolvedProfileFormValues.nickname.trim().length === 0
            }
            onClick={() => {
              updateProfileMutation.mutate({
                nickname: resolvedProfileFormValues.nickname.trim(),
              });
            }}
            type='button'
          >
            {updateProfileMutation.isPending ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </section>
    );
  };

  const renderActivePanel = () => {
    switch (activeView) {
      case 'learning':
        return renderLearningCourses();
      case 'payments':
        return renderOrderHistory();
      case 'profile':
        return renderProfileBasic();
      case 'questions':
        return renderQuestionManagement();
      default:
        return null;
    }
  };

  const renderProfilePasswordModal = () => {
    if (activeView !== 'profile' || isProfilePasswordVerified) {
      return null;
    }

    return (
      <Modal
        bodyClassName={styles['profilePasswordModalBody']}
        closeButtonClassName={styles['profilePasswordModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['profilePasswordModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='비밀번호 확인 모달 닫기'
        headerClassName={styles['profilePasswordModalHeader']}
        initialFocusRef={profilePasswordInputRef}
        onClose={closeProfilePasswordModal}
        panelClassName={styles['profilePasswordModalPanel']}
        title='비밀번호 확인'
        titleClassName={styles['profilePasswordModalTitle']}
      >
        <form className={styles['profilePasswordForm']} onSubmit={handleProfilePasswordSubmit}>
          <p className={styles['profilePasswordDescription']}>
            내 정보 관리에 접근하기 위해
            <br />
            비밀번호를 다시 입력해주세요.
          </p>

          <label className={styles['profilePasswordLabel']} htmlFor='profile_password_confirm'>
            비밀번호
          </label>

          <div className={styles['profilePasswordInputWrap']}>
            <input
              aria-describedby={profilePasswordError ? 'profile_password_confirm_error' : undefined}
              aria-invalid={Boolean(profilePasswordError)}
              autoComplete='current-password'
              className={styles['profilePasswordInput']}
              id='profile_password_confirm'
              onChange={(event) => {
                setProfilePassword(event.target.value);
                setProfilePasswordError(null);
              }}
              placeholder='비밀번호를 입력해 주세요.'
              ref={profilePasswordInputRef}
              type={isProfilePasswordVisible ? 'text' : 'password'}
              value={profilePassword}
            />
            <button
              aria-label={isProfilePasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
              className={styles['profilePasswordVisibilityButton']}
              onClick={() => {
                setIsProfilePasswordVisible((currentValue) => !currentValue);
              }}
              type='button'
            >
              <span
                aria-hidden='true'
                className={styles['profilePasswordEyeIcon']}
                style={profilePasswordEyeOffIconStyle}
              />
            </button>
          </div>

          {profilePasswordError ? (
            <p className={styles['profilePasswordError']} id='profile_password_confirm_error'>
              {profilePasswordError}
            </p>
          ) : null}

          <Link className={styles['profilePasswordRecoveryLink']} to={routePaths.accountRecovery}>
            비밀번호를 잊으셨나요?
          </Link>

          <div className={styles['profilePasswordActions']}>
            <button
              className={styles['profilePasswordCancelButton']}
              onClick={closeProfilePasswordModal}
              type='button'
            >
              취소
            </button>
            <button
              className={styles['profilePasswordConfirmButton']}
              disabled={verifyProfilePasswordMutation.isPending}
              type='submit'
            >
              {verifyProfilePasswordMutation.isPending ? '확인 중...' : '확인'}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const renderReviewModal = () => {
    if (selectedEnrollmentId === null) {
      return null;
    }

    const detail = enrollmentDetailQuery.data;
    const reviewWritten = Boolean(detail?.reviewWritten);
    const canManageReview = detail
      ? canManageEnrollmentReview({
          completionRate: detail.completionRate,
          reviewWritten: detail.reviewWritten,
          status: detail.status,
        })
      : false;
    const modalTitle = reviewWritten ? '후기 수정' : '후기 작성';
    const title = selectedEnrollment?.programTitle ?? detail?.programTitle ?? '강의 후기';
    const thumbnailUrl = selectedEnrollment?.programThumbnailUrl ?? null;
    const selectedRating = Number.parseInt(reviewFormValues.rating, 10);
    const normalizedRating =
      Number.isInteger(selectedRating) && selectedRating >= 1 && selectedRating <= 5
        ? selectedRating
        : 0;
    const reviewSubmitLabel = reviewWritten ? '후기 수정' : '후기 등록';
    const isReviewSubmitDisabled =
      reviewMutation.isPending ||
      normalizedRating === 0 ||
      reviewFormValues.content.trim().length === 0;

    return (
      <Modal
        bodyClassName={styles['reviewModalBody']}
        closeButtonClassName={styles['reviewModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['reviewModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='후기 모달 닫기'
        headerClassName={styles['reviewModalHeader']}
        onClose={closeReviewModal}
        panelClassName={styles['reviewModalPanel']}
        title={modalTitle}
        titleClassName={styles['reviewModalTitle']}
      >
        {enrollmentDetailQuery.isLoading ? (
          <p className={sharedStyles['mutedText']}>후기 정보를 불러오는 중입니다.</p>
        ) : null}

        {enrollmentDetailQuery.isError ? (
          <p className={styles['errorText']}>
            {enrollmentDetailQuery.error instanceof Error
              ? enrollmentDetailQuery.error.message
              : '후기 정보를 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!enrollmentDetailQuery.isLoading && !enrollmentDetailQuery.isError && detail ? (
          canManageReview ? (
            <form className={styles['reviewForm']} onSubmit={handleReviewSubmit}>
              <div className={styles['reviewSummary']}>
                <div className={styles['reviewThumbnail']}>
                  {thumbnailUrl ? (
                    <img
                      alt={`${title} 대표 이미지`}
                      className={styles['reviewThumbnailImage']}
                      loading='lazy'
                      src={thumbnailUrl}
                    />
                  ) : (
                    <div aria-hidden='true' className={styles['reviewThumbnailFallback']} />
                  )}
                </div>
                <strong className={styles['reviewProgramTitle']}>{title}</strong>
              </div>

              <div className={styles['reviewFieldGrid']}>
                <div className={styles['reviewRatingSection']}>
                  <p className={styles['reviewFieldLabel']}>평점</p>
                  <div className={styles['reviewStarRow']} role='group' aria-label='평점 선택'>
                    {Array.from({ length: 5 }, (_, index) => {
                      const ratingValue = index + 1;
                      const isSelected = ratingValue <= normalizedRating;

                      return (
                        <button
                          aria-label={`${String(ratingValue)}점`}
                          aria-pressed={ratingValue === normalizedRating}
                          className={styles['reviewStarButton']}
                          key={ratingValue}
                          onClick={() => {
                            setReviewFormDraft({
                              enrollmentId: selectedEnrollmentId,
                              values: {
                                ...reviewFormValues,
                                rating: String(ratingValue),
                              },
                            });
                            setReviewFormError(null);
                          }}
                          type='button'
                        >
                          <span
                            aria-hidden='true'
                            className={classNames(
                              styles['reviewStarIcon'],
                              isSelected && styles['reviewStarIconActive'],
                            )}
                            style={reviewStarIconStyle}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className={classNames(
                      styles['reviewRatingHint'],
                      normalizedRating === 0 && styles['reviewRatingHintHidden'],
                    )}
                  >
                    만족해요
                  </p>
                </div>

                <div className={styles['reviewContentSection']}>
                  <label className={styles['reviewFieldLabel']} htmlFor='review_content'>
                    후기 내용
                  </label>
                  <textarea
                    className={styles['reviewTextArea']}
                    id='review_content'
                    name='content'
                    onChange={(event) => {
                      setReviewFormDraft({
                        enrollmentId: selectedEnrollmentId,
                        values: {
                          ...reviewFormValues,
                          content: event.target.value,
                        },
                      });
                      setReviewFormError(null);
                    }}
                    placeholder='수강 경험과 도움이 되었던 점을 간단히 작성해 주세요.'
                    rows={6}
                    value={reviewFormValues.content}
                  />
                </div>
              </div>

              {reviewFormError ? <p className={styles['errorText']}>{reviewFormError}</p> : null}

              <div className={styles['reviewActionRow']}>
                <button
                  className={styles['reviewCancelButton']}
                  onClick={closeReviewModal}
                  type='button'
                >
                  취소
                </button>
                <button
                  className={classNames(
                    styles['reviewSubmitButton'],
                    isReviewSubmitDisabled && styles['reviewSubmitButtonDisabled'],
                  )}
                  disabled={isReviewSubmitDisabled}
                  type='submit'
                >
                  {reviewMutation.isPending ? '저장 중...' : reviewSubmitLabel}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles['reviewBlockedState']}>
              <strong className={styles['contentTitle']}>{detail.programTitle}</strong>
              <p className={sharedStyles['mutedText']}>
                후기는 수강 종료 강의이거나 진도율 {String(REVIEW_MINIMUM_COMPLETION_RATE)}% 이상인
                강의에서 관리할 수 있습니다.
              </p>
              <div className={styles['reviewActionRow']}>
                <Button
                  className={styles['compactButton']}
                  onClick={closeReviewModal}
                  type='button'
                >
                  닫기
                </Button>
              </div>
            </div>
          )
        ) : null}
      </Modal>
    );
  };

  const renderPaymentDetailModal = () => {
    if (!selectedPayment) {
      return null;
    }

    const detailItems: Array<{ label: string; value: string }> = [
      {
        label: '주문번호',
        value: formatOrderNumberPreview(selectedPayment.orderNumber),
      },
      {
        label: '주문 유형',
        value: formatOrderTypeLabel(selectedPayment.orderType),
      },
      {
        label: '상태',
        value: paymentStatusLabels[selectedPayment.status],
      },
      {
        label: '결제 수단',
        value: formatPaymentMethodLabel(selectedPayment.paymentMethod),
      },
      {
        label: '결제 금액',
        value: formatCurrency(selectedPayment.approvedAmount ?? selectedPayment.amount),
      },
      {
        label: '처리 시각',
        value: formatPaymentDateTime(resolvePaymentProcessedAt(selectedPayment)),
      },
    ];

    if (selectedPayment.cancelReason) {
      detailItems.push({
        label: '취소 사유',
        value: selectedPayment.cancelReason,
      });
    }

    const statusTone = selectedPayment.status === 'CANCELLED' ? 'cancelled' : 'completed';

    return (
      <Modal
        bodyClassName={styles['paymentDetailModalBody']}
        closeButtonClassName={styles['paymentDetailModalCloseButton']}
        closeButtonContent={
          <span
            aria-hidden='true'
            className={styles['paymentDetailModalCloseIcon']}
            style={reviewCloseIconStyle}
          />
        }
        closeButtonLabel='결제 상세 모달 닫기'
        headerClassName={styles['paymentDetailModalHeader']}
        onClose={closePaymentDetailModal}
        panelClassName={styles['paymentDetailModalPanel']}
        title='결제 상세'
        titleClassName={styles['paymentDetailModalTitle']}
      >
        <div className={styles['paymentDetailReceipt']}>
          <div className={styles['paymentDetailReceiptHeader']}>
            <div className={styles['paymentDetailTitleGroup']}>
              <p className={styles['paymentDetailEyebrow']}>결제 내역서</p>
              <strong className={styles['paymentDetailOrderTitle']}>
                {selectedPayment.orderName}
              </strong>
            </div>
            <span
              className={classNames(
                styles['paymentDetailStatusChip'],
                statusTone === 'completed'
                  ? styles['paymentDetailStatusChipCompleted']
                  : styles['paymentDetailStatusChipCancelled'],
              )}
            >
              {paymentStatusLabels[selectedPayment.status]}
            </span>
          </div>

          <div className={styles['paymentDetailDivider']} />

          <div className={styles['paymentDetailRows']}>
            {detailItems.map((item) => (
              <div className={styles['paymentDetailRow']} key={item.label}>
                <span className={styles['paymentDetailLabel']}>{item.label}</span>
                <strong className={styles['paymentDetailValue']}>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className={styles['paymentDetailDivider']} />
        </div>

        <button
          className={styles['paymentDetailCloseCta']}
          onClick={closePaymentDetailModal}
          type='button'
        >
          닫기
        </button>
      </Modal>
    );
  };

  return (
    <section className={classNames(sharedStyles['page'], styles['page'])}>
      <div className={classNames(sharedStyles['shell'], styles['shell'])}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={classNames(sharedStyles['header'], styles['pageHeader'])}>
            <h1 className={sharedStyles['title']}>마이페이지</h1>
          </header>

          <div className={styles['layout']}>
            <aside className={styles['sidebar']}>
              <div className={styles['sidebarHeader']}>
                <strong className={styles['sidebarTitle']}>{accountName}님</strong>
              </div>

              <nav aria-label='마이페이지 메뉴' className={styles['menuGroups']}>
                <div className={styles['menuList']}>
                  {SIDEBAR_ITEMS.map((item) => {
                    const isActive = item.key === activeView;

                    return (
                      <button
                        aria-pressed={isActive}
                        className={classNames(
                          styles['menuButton'],
                          isActive && styles['menuButtonActive'],
                        )}
                        key={item.key}
                        onClick={() => {
                          handleViewChange(item.key);
                        }}
                        type='button'
                      >
                        <span
                          aria-hidden='true'
                          className={styles['menuIcon']}
                          style={buildMaskIconStyle(item.iconSrc)}
                        />
                        <span className={styles['menuLabel']}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className={styles['sidebarFooter']}>
                <Button
                  className={classNames(styles['compactButton'], styles['logoutButton'])}
                  disabled={logoutMutation.isPending}
                  onClick={() => {
                    logoutMutation.mutate();
                  }}
                  variant='secondary'
                  type='button'
                >
                  <span
                    aria-hidden='true'
                    className={styles['logoutIcon']}
                    style={buildMaskIconStyle(mypageLogOutIconSrc)}
                  />
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </Button>
              </div>
            </aside>

            <div className={styles['panel']}>{renderActivePanel()}</div>
          </div>
        </div>
      </div>
      {renderReviewModal()}
      {renderPaymentDetailModal()}
      {renderProfilePasswordModal()}
    </section>
  );
};

export default MyPagePage;
