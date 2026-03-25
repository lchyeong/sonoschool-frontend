import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { logoutStudent } from '@/api/auth';
import {
  createMyEnrollmentReview,
  sendMyPhoneVerification,
  updateMyEnrollmentReview,
  updateMyProfile,
  verifyMyPhoneChange,
} from '@/api/mypage';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import {
  myEnrollmentDetailQueryKey,
  myEnrollmentsQueryKey,
  myProfileQueryKey,
  useMyCouponsQuery,
  useMyEnrollmentDetailQuery,
  useMyEnrollmentsQuery,
  useMyPaymentHistoryQuery,
  useMyProfileQuery,
  useMyRefundsQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import type { SmsSendResponse } from '@/types/auth';
import type { EnrollmentReviewPayload, UserCoupon } from '@/types/mypage';
import { formatPaymentMethodLabel, paymentStatusLabels, type PaymentStatus } from '@/types/payment';
import { classNames } from '@/utils/classNames';

import styles from './MyPagePage.module.scss';

type MyPageViewKey =
  | 'learning-courses'
  | 'orders-history'
  | 'orders-coupons'
  | 'orders-refunds'
  | 'profile-basic'
  | 'support-inquiry';

interface SidebarItem {
  key: MyPageViewKey;
  label: string;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

const DEFAULT_VIEW: MyPageViewKey = 'learning-courses';

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: '학습 관리',
    items: [{ key: 'learning-courses', label: '내 강의' }],
  },
  {
    label: '주문/결제',
    items: [
      { key: 'orders-history', label: '결제 내역' },
      { key: 'orders-coupons', label: '나의 쿠폰' },
      { key: 'orders-refunds', label: '취소/환불 내역' },
    ],
  },
  {
    label: '내 정보',
    items: [{ key: 'profile-basic', label: '기본 정보' }],
  },
  {
    label: '고객지원',
    items: [{ key: 'support-inquiry', label: '1:1 문의' }],
  },
];

const ALL_ITEMS = SIDEBAR_GROUPS.flatMap((group) => group.items);

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '수강 중',
  EXPIRED: '수강 종료',
  CANCELLED: '취소 완료',
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  REFUND_REQUESTED: '환불 진행 중',
  REFUNDED: '환불 완료',
  CANCELLED: '취소 완료',
};

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  FIXED_AMOUNT: '정액 할인',
  PERCENTAGE: '정률 할인',
};

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const isMyPageViewKey = (value: string | null): value is MyPageViewKey => {
  return ALL_ITEMS.some((item) => item.key === value);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('ko-KR');
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

const formatStatusLabel = (value: string, labels: Record<string, string>) => {
  return labels[value] ?? '상태 확인 필요';
};

const formatDiscountLabel = (discountType: string, discountValue: number) => {
  if (discountType === 'PERCENTAGE') {
    return `${String(discountValue)}%`;
  }

  if (discountType === 'FIXED_AMOUNT') {
    return `${currencyFormatter.format(discountValue)}원`;
  }

  return DISCOUNT_TYPE_LABELS[discountType] ?? '할인 적용';
};

const formatCouponAppliesTo = (coupon: UserCoupon) => {
  if (coupon.appliesTo === 'ALL') {
    return '전체 과정';
  }

  return coupon.appliesTo === 'ONLINE' ? '온라인 전용' : '오프라인 전용';
};

const MY_COURSE_PAGE_SIZE = 6;
const ORDER_LIST_PAGE_SIZE = 4;

type EnrollmentCourseTabValue = 'ACTIVE' | 'EXPIRED' | 'CERTIFICATE';
type PaymentStatusFilterValue = 'ALL' | PaymentStatus;
type RefundFilterValue = 'ALL' | 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';

interface SegmentOption<TValue extends string> {
  label: string;
  value: TValue;
}

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

const SegmentFilter = <TValue extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (nextValue: TValue) => void;
  options: SegmentOption<TValue>[];
  value: TValue;
}) => {
  return (
    <div className={sharedStyles['segmentRow']}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            className={classNames(
              sharedStyles['segmentButton'],
              isActive && sharedStyles['segmentButtonActive'],
            )}
            key={option.value}
            onClick={() => {
              onChange(option.value);
            }}
            type='button'
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
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
  rating: '5',
};

const MyPagePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const logout = useAuthStore((state) => state.logout);
  const storeDisplayName = useAuthStore((state) => state.displayName);
  const syncProfileSnapshot = useAuthStore((state) => state.syncProfileSnapshot);
  const showToast = useToastStore((state) => state.showToast);

  const activeViewParam = searchParams.get('view');
  const activeView = isMyPageViewKey(activeViewParam) ? activeViewParam : DEFAULT_VIEW;

  const [courseTab, setCourseTab] = useState<EnrollmentCourseTabValue>('ACTIVE');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilterValue>('ALL');
  const [refundFilter, setRefundFilter] = useState<RefundFilterValue>('ALL');
  const [coursePage, setCoursePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const [profileFormValues, setProfileFormValues] = useState<ProfileFormValues | null>(null);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [reviewFormValues, setReviewFormValues] = useState<ReviewFormValues>(
    DEFAULT_REVIEW_FORM_VALUES,
  );
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [phoneFormValues, setPhoneFormValues] = useState({
    phoneNumber: '',
    code: '',
  });
  const [sentVerification, setSentVerification] = useState<SmsSendResponse | null>(null);
  const [isPhoneEditorOpen, setIsPhoneEditorOpen] = useState(false);

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
  const paymentHistoryQuery = useMyPaymentHistoryQuery(activeView === 'orders-history');
  const refundsQuery = useMyRefundsQuery(activeView === 'orders-refunds');
  const couponsQuery = useMyCouponsQuery(activeView === 'orders-coupons');
  const enrollmentDetailQuery = useMyEnrollmentDetailQuery(
    selectedEnrollmentId,
    selectedEnrollmentId !== null,
  );
  const visiblePayments = (paymentHistoryQuery.data ?? []).filter((payment) => {
    return payment.status === 'COMPLETED' || payment.status === 'CANCELLED';
  });
  const filteredPayments = visiblePayments.filter((payment) => {
    return paymentStatusFilter === 'ALL' || payment.status === paymentStatusFilter;
  });
  const paymentPageCount = getPageCount(filteredPayments.length, ORDER_LIST_PAGE_SIZE);
  const paginatedPayments = paginateItems(filteredPayments, paymentPage, ORDER_LIST_PAGE_SIZE);
  const filteredRefunds = (refundsQuery.data ?? []).filter((refund) => {
    return refundFilter === 'ALL' || refund.status === refundFilter;
  });
  const refundPageCount = getPageCount(filteredRefunds.length, ORDER_LIST_PAGE_SIZE);
  const paginatedRefunds = paginateItems(filteredRefunds, refundPage, ORDER_LIST_PAGE_SIZE);

  const accountName = profileQuery.data?.displayName || storeDisplayName || '회원';
  const selectedEnrollment =
    selectedEnrollmentId === null
      ? null
      : allEnrollments.find((enrollment) => enrollment.id === selectedEnrollmentId) ?? null;
  const resolvedProfileFormValues: ProfileFormValues = {
    email: profileFormValues?.email ?? profileQuery.data?.email ?? '',
    name: profileFormValues?.name ?? profileQuery.data?.name ?? '',
    nickname: profileFormValues?.nickname ?? profileQuery.data?.nickname ?? '',
  };

  useEffect(() => {
    if (!profileQuery.data) return;

    syncProfileSnapshot({
      displayName: profileQuery.data.displayName,
      loginId: profileQuery.data.loginId,
      role: profileQuery.data.role,
    });
  }, [profileQuery.data, syncProfileSnapshot]);

  useEffect(() => {
    if (!selectedEnrollmentId) {
      setReviewFormValues(DEFAULT_REVIEW_FORM_VALUES);
      setReviewFormError(null);
      return;
    }

    if (!enrollmentDetailQuery.data) {
      return;
    }

    setReviewFormValues({
      content: enrollmentDetailQuery.data.review?.content ?? '',
      rating: String(enrollmentDetailQuery.data.review?.rating ?? 5),
    });
    setReviewFormError(null);
  }, [enrollmentDetailQuery.data, selectedEnrollmentId]);

  const handleCourseTabChange = (nextTab: EnrollmentCourseTabValue) => {
    setCourseTab(nextTab);
    setCoursePage(1);
  };

  const handlePaymentFilterChange = (nextFilter: PaymentStatusFilterValue) => {
    setPaymentStatusFilter(nextFilter);
    setPaymentPage(1);
  };

  const handleRefundFilterChange = (nextFilter: RefundFilterValue) => {
    setRefundFilter(nextFilter);
    setRefundPage(1);
  };

  const handleViewChange = (viewKey: MyPageViewKey) => {
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
    setReviewFormValues(DEFAULT_REVIEW_FORM_VALUES);
    setReviewFormError(null);
  };

  const openReviewModal = (enrollmentId: number) => {
    setSelectedEnrollmentId(enrollmentId);
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
    (fieldName: 'email' | 'name' | 'nickname') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setProfileFormValues((currentValues) => ({
        email:
          fieldName === 'email'
            ? nextValue
            : (currentValues?.email ?? profileQuery.data?.email ?? ''),
        name:
          fieldName === 'name' ? nextValue : (currentValues?.name ?? profileQuery.data?.name ?? ''),
        nickname:
          fieldName === 'nickname'
            ? nextValue
            : (currentValues?.nickname ?? profileQuery.data?.nickname ?? ''),
      }));
    };

  const handlePhoneFieldChange =
    (fieldName: 'phoneNumber' | 'code') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setPhoneFormValues((currentValues) => ({
        ...currentValues,
        [fieldName]: nextValue,
      }));
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
      showToast({
        message: '회원 정보를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const sendPhoneVerificationMutation = useMutation({
    mutationFn: sendMyPhoneVerification,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '인증번호 발송에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      setSentVerification(response);
      showToast({
        message: '인증번호를 발송했습니다.',
        variant: 'success',
      });
    },
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: verifyMyPhoneChange,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '휴대폰 번호를 변경하지 못했습니다. 다시 시도해 주세요.',
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
      setSentVerification(null);
      setIsPhoneEditorOpen(false);
      showToast({
        message: '휴대폰 번호를 변경했습니다.',
        variant: 'success',
      });
    },
  });

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
          error instanceof Error ? error.message : '후기를 저장하지 못했습니다. 다시 시도해 주세요.',
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

  const renderReviewAction = (enrollment: (typeof allEnrollments)[number]) => {
    if (!enrollment.reviewWritable && !enrollment.reviewWritten) {
      return null;
    }

    return (
      <Button
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

    const tabDescription =
      courseTab === 'ACTIVE'
        ? `수강 중인 ${String(filteredEnrollments.length)}개 강의를 보고 있습니다.`
        : courseTab === 'EXPIRED'
          ? `수강 종료된 ${String(filteredEnrollments.length)}개 강의를 보고 있습니다.`
          : `다운로드 가능한 수료증 ${String(filteredEnrollments.length)}개를 보고 있습니다.`;

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

    return (
      <section className={styles['contentSection']}>
        <div className={sharedStyles['sectionHeader']}>
          <h2 className={sharedStyles['sectionTitle']}>내 강의</h2>
          <p className={sharedStyles['sectionDescription']}>{tabDescription}</p>
        </div>

        <div className={styles['courseOverviewGrid']}>
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
                <span className={styles['summaryLabel']}>{item.label}</span>
                <strong className={styles['courseOverviewValue']}>{item.count}</strong>
              </button>
            );
          })}
        </div>

        {!filteredEnrollments.length ? (
          <p className={sharedStyles['mutedText']}>
            {courseTab === 'CERTIFICATE'
              ? '다운로드 가능한 수료증이 없습니다.'
              : '선택한 탭에 표시할 강의가 없습니다.'}
          </p>
        ) : (
          <div className={styles['courseGrid']}>
            {paginatedEnrollments.map((enrollment) => {
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
                    {courseTab !== 'CERTIFICATE' ? (
                      <span className={styles['courseCardBadge']}>
                        {formatStatusLabel(enrollment.status, ENROLLMENT_STATUS_LABELS)}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles['courseCardBody']}>
                    <div className={styles['courseCardHeader']}>
                      <strong className={styles['courseCardTitle']}>
                        {enrollment.programTitle}
                      </strong>
                      {courseTab === 'CERTIFICATE' ? (
                        <span className={styles['statusChip']}>다운로드 가능</span>
                      ) : null}
                    </div>

                    <div className={styles['courseProgressMeta']}>
                      <span>
                        {enrollment.completedLectures} / {enrollment.totalLectures}강
                      </span>
                      <span>{enrollment.completionRate}%</span>
                    </div>
                    <div aria-hidden='true' className={styles['courseProgressTrack']}>
                      <span
                        className={styles['courseProgressFill']}
                        style={{ width: `${String(enrollment.completionRate)}%` }}
                      />
                    </div>

                    <div className={styles['courseMetaList']}>
                      <p className={styles['courseMetaText']}>
                        수강 기간 {formatDateRange(enrollment.enrolledAt, enrollment.expireAt)}
                      </p>
                      <p className={styles['courseMetaText']}>
                        {courseTab === 'CERTIFICATE'
                          ? `수료일 ${formatDate(enrollment.completedAt)}`
                          : `최근 학습 ${formatDate(enrollment.lastLearningAt)}`}
                      </p>
                    </div>

                    {courseTab === 'CERTIFICATE' ? (
                      <div className={styles['courseCardFooter']}>
                        <div className={styles['courseActionGroup']}>
                          <Button
                            onClick={() => {
                              handleCertificateDownload(
                                enrollment.programTitle,
                                enrollment.completedAt ?? enrollment.lastLearningAt,
                              );
                            }}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            수료증 다운로드
                          </Button>
                          {renderReviewAction(enrollment)}
                        </div>
                      </div>
                    ) : courseTab === 'EXPIRED' ? (
                      <div className={styles['courseCardFooter']}>
                        <p className={styles['courseMetaText']}>
                          {enrollment.status === 'CANCELLED'
                            ? '취소된 강의입니다.'
                            : '수강 종료된 강의입니다.'}
                        </p>
                        {renderReviewAction(enrollment)}
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
                          {renderReviewAction(enrollment)}
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
        )}

        {filteredEnrollments.length ? (
          <PaginationControls
            currentPage={coursePage}
            onChange={setCoursePage}
            totalPages={coursePageCount}
          />
        ) : null}
      </section>
    );
  };

  const renderOrderHistory = () => {
    const paymentCount = visiblePayments.length;

    return (
      <section className={styles['contentSection']}>
        <div className={sharedStyles['sectionHeader']}>
          <h2 className={sharedStyles['sectionTitle']}>결제 내역</h2>
          <p className={sharedStyles['sectionDescription']}>
            전체 {paymentCount}건 중 {filteredPayments.length}건을 보고 있습니다.
          </p>
        </div>

        <SegmentFilter
          onChange={handlePaymentFilterChange}
          options={[
            { label: '전체', value: 'ALL' },
            { label: '결제 완료', value: 'COMPLETED' },
            { label: '결제 취소', value: 'CANCELLED' },
          ]}
          value={paymentStatusFilter}
        />

        {paymentHistoryQuery.isLoading ? (
          <p className={sharedStyles['mutedText']}>결제 내역을 불러오는 중입니다.</p>
        ) : null}

        {paymentHistoryQuery.isError ? (
          <p className={styles['errorText']}>
            {paymentHistoryQuery.error instanceof Error
              ? paymentHistoryQuery.error.message
              : '결제 내역을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        filteredPayments.length ? (
          <div className={styles['stackList']}>
            {paginatedPayments.map((payment) => (
              <article className={styles['paymentCard']} key={payment.id}>
                <div className={styles['paymentCardHeader']}>
                  <div className={styles['paymentCardTitleGroup']}>
                    <strong className={styles['stackItemTitle']}>{payment.orderName}</strong>
                    <p className={styles['stackItemText']}>
                      주문번호 {payment.gatewayOrderId} ·{' '}
                      {formatPaymentMethodLabel(payment.paymentMethod)}
                    </p>
                  </div>
                  <span className={styles['statusChip']}>
                    {paymentStatusLabels[payment.status]}
                  </span>
                </div>

                <div className={styles['paymentMetaGrid']}>
                  <div className={styles['paymentMetaItem']}>
                    <span className={styles['summaryLabel']}>결제일</span>
                    <strong className={styles['couponCardMetaValue']}>
                      {formatDateTime(
                        payment.paidAt ||
                          payment.cancelledAt ||
                          payment.registeredAt ||
                          payment.requestedAt,
                      )}
                    </strong>
                  </div>
                  <div className={styles['paymentMetaItem']}>
                    <span className={styles['summaryLabel']}>결제 수단</span>
                    <strong className={styles['couponCardMetaValue']}>
                      {formatPaymentMethodLabel(payment.paymentMethod)}
                    </strong>
                  </div>
                  <div className={styles['paymentMetaItem']}>
                    <span className={styles['summaryLabel']}>결제 금액</span>
                    <strong className={styles['couponCardMetaValue']}>
                      {formatCurrency(payment.amount)}
                    </strong>
                  </div>
                </div>

                <div className={styles['paymentActionRow']}>
                  <Link
                    className={styles['paymentActionLink']}
                    to={`${routePaths.paymentResult}?paymentId=${String(payment.id)}&status=${payment.status}`}
                  >
                    결제 상세 보기
                  </Link>
                  {payment.receiptUrl ? (
                    <a
                      className={styles['paymentActionLink']}
                      href={payment.receiptUrl}
                      rel='noreferrer'
                      target='_blank'
                    >
                      영수증 보기
                    </a>
                  ) : (
                    <span className={sharedStyles['mutedText']}>영수증 없음</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        paymentCount > 0 &&
        filteredPayments.length === 0 ? (
          <p className={sharedStyles['mutedText']}>선택한 상태의 결제 내역이 없습니다.</p>
        ) : null}

        {!paymentHistoryQuery.isLoading &&
        !paymentHistoryQuery.isError &&
        filteredPayments.length ? (
          <PaginationControls
            currentPage={paymentPage}
            onChange={setPaymentPage}
            totalPages={paymentPageCount}
          />
        ) : null}

        {!paymentHistoryQuery.isLoading && !paymentHistoryQuery.isError && paymentCount === 0 ? (
          <p className={sharedStyles['mutedText']}>결제 내역이 없습니다.</p>
        ) : null}
      </section>
    );
  };

  const renderOrderCoupons = () => {
    const usableCoupons = (couponsQuery.data ?? []).filter((coupon) => coupon.usable);

    return (
      <section className={styles['contentSection']}>
        <div className={sharedStyles['sectionHeader']}>
          <h2 className={sharedStyles['sectionTitle']}>나의 쿠폰</h2>
          <p className={sharedStyles['sectionDescription']}>
            보유 쿠폰 {couponsQuery.data?.length ?? 0}장 중 사용 가능한 쿠폰은{' '}
            {usableCoupons.length}
            장입니다.
          </p>
        </div>

        {couponsQuery.isLoading ? (
          <p className={sharedStyles['mutedText']}>쿠폰 목록을 불러오는 중입니다.</p>
        ) : null}

        {couponsQuery.isError ? (
          <p className={styles['errorText']}>
            {couponsQuery.error instanceof Error
              ? couponsQuery.error.message
              : '쿠폰 목록을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!couponsQuery.isLoading && !couponsQuery.isError && usableCoupons.length ? (
          <div className={styles['summaryGrid']}>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>사용 가능</span>
              <strong className={styles['summaryValue']}>{usableCoupons.length}장</strong>
            </div>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>온라인 전용</span>
              <strong className={styles['summaryValue']}>
                {usableCoupons.filter((coupon) => coupon.appliesTo === 'ONLINE').length}장
              </strong>
            </div>
            <div className={styles['summaryItem']}>
              <span className={styles['summaryLabel']}>오프라인 전용</span>
              <strong className={styles['summaryValue']}>
                {usableCoupons.filter((coupon) => coupon.appliesTo === 'OFFLINE').length}장
              </strong>
            </div>
          </div>
        ) : null}

        {!couponsQuery.isLoading && !couponsQuery.isError && couponsQuery.data?.length ? (
          <div className={styles['couponList']}>
            {couponsQuery.data.map((coupon) => (
              <article className={styles['couponCard']} key={coupon.id}>
                <div className={styles['couponCardHeader']}>
                  <div className={styles['couponCardTitleGroup']}>
                    <strong className={styles['couponCardTitle']}>{coupon.name}</strong>
                    <p className={styles['couponCardDescription']}>{coupon.description}</p>
                  </div>
                  <span className={styles['statusChip']}>
                    {coupon.usable ? '사용 가능' : '사용 불가'}
                  </span>
                </div>
                <div className={styles['couponCardMetaGrid']}>
                  <div className={styles['couponCardMetaItem']}>
                    <span className={styles['summaryLabel']}>할인</span>
                    <strong className={styles['couponCardMetaValue']}>
                      {formatDiscountLabel(coupon.discountType, coupon.discountValue)}
                    </strong>
                  </div>
                  <div className={styles['couponCardMetaItem']}>
                    <span className={styles['summaryLabel']}>사용 조건</span>
                    <strong className={styles['couponCardMetaValue']}>
                      {formatCouponAppliesTo(coupon)} · 최소{' '}
                      {formatCurrency(coupon.minimumOrderAmount)}
                    </strong>
                  </div>
                  <div className={styles['couponCardMetaItem']}>
                    <span className={styles['summaryLabel']}>유효 기간</span>
                    <strong className={styles['couponCardMetaValue']}>
                      {formatDate(coupon.issuedAt)} ~ {formatDate(coupon.expiresAt)}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!couponsQuery.isLoading && !couponsQuery.isError && !couponsQuery.data?.length ? (
          <p className={sharedStyles['mutedText']}>보유한 쿠폰이 없습니다.</p>
        ) : null}
      </section>
    );
  };

  const renderOrderRefunds = () => {
    const refundCount = refundsQuery.data?.length ?? 0;

    return (
      <section className={styles['contentSection']}>
        <div className={sharedStyles['sectionHeader']}>
          <h2 className={sharedStyles['sectionTitle']}>취소/환불 내역</h2>
          <p className={sharedStyles['sectionDescription']}>
            전체 {refundCount}건 중 {filteredRefunds.length}건을 보고 있습니다.
          </p>
        </div>

        <SegmentFilter
          onChange={handleRefundFilterChange}
          options={[
            { label: '전체', value: 'ALL' },
            { label: '환불 진행 중', value: 'REFUND_REQUESTED' },
            { label: '환불 완료', value: 'REFUNDED' },
            { label: '취소 완료', value: 'CANCELLED' },
          ]}
          value={refundFilter}
        />

        {refundsQuery.isLoading ? (
          <p className={sharedStyles['mutedText']}>취소/환불 내역을 불러오는 중입니다.</p>
        ) : null}

        {refundsQuery.isError ? (
          <p className={styles['errorText']}>
            {refundsQuery.error instanceof Error
              ? refundsQuery.error.message
              : '취소/환불 내역을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!refundsQuery.isLoading && !refundsQuery.isError && filteredRefunds.length ? (
          <div className={styles['stackList']}>
            {paginatedRefunds.map((refund) => (
              <div className={styles['stackItem']} key={refund.id}>
                <div className={styles['stackItemHeader']}>
                  <strong className={styles['stackItemTitle']}>{refund.programTitle}</strong>
                  <span className={styles['statusChip']}>
                    {formatStatusLabel(refund.status, REFUND_STATUS_LABELS)}
                  </span>
                </div>
                <p className={styles['stackItemText']}>
                  환불 금액 {formatCurrency(refund.refundAmount)} · 요청일{' '}
                  {formatDateTime(refund.requestedAt)} · 처리일 {formatDateTime(refund.processedAt)}{' '}
                  · {refund.paymentMethod || '-'} · {refund.reason || '사유 없음'}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {!refundsQuery.isLoading &&
        !refundsQuery.isError &&
        refundCount > 0 &&
        filteredRefunds.length === 0 ? (
          <p className={sharedStyles['mutedText']}>선택한 상태의 취소/환불 내역이 없습니다.</p>
        ) : null}

        {!refundsQuery.isLoading && !refundsQuery.isError && filteredRefunds.length ? (
          <PaginationControls
            currentPage={refundPage}
            onChange={setRefundPage}
            totalPages={refundPageCount}
          />
        ) : null}

        {!refundsQuery.isLoading && !refundsQuery.isError && refundCount === 0 ? (
          <p className={sharedStyles['mutedText']}>취소/환불 내역이 없습니다.</p>
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

    return (
      <div className={styles['detailColumn']}>
        <section className={styles['contentSection']}>
          <h2 className={sharedStyles['sectionTitle']}>기본 정보</h2>
          <div className={sharedStyles['fieldGrid']}>
            <TextField label='아이디' name='loginId' readOnly value={profileQuery.data.loginId} />
            <TextField
              label='이메일'
              name='email'
              placeholder='name@example.com'
              readOnly
              type='email'
              value={resolvedProfileFormValues.email}
            />
            <TextField
              label='이름'
              name='name'
              onChange={handleProfileFieldChange('name')}
              placeholder='이름'
              value={resolvedProfileFormValues.name}
            />
            <TextField
              label='닉네임'
              name='nickname'
              onChange={handleProfileFieldChange('nickname')}
              placeholder='닉네임'
              value={resolvedProfileFormValues.nickname}
            />
            <TextField
              label='휴대폰 번호'
              name='currentPhoneNumber'
              readOnly
              value={profileQuery.data.phoneNumber || '-'}
            />
          </div>

          <div className={styles['phoneMetaRow']}>
            <div className={styles['phoneValueGroup']}>
              {profileQuery.data.phoneVerifiedAt ? (
                <span aria-label='휴대폰 인증 완료' className={styles['verifiedBadge']}>
                  인증 완료
                </span>
              ) : (
                <span className={sharedStyles['mutedText']}>휴대폰 인증 필요</span>
              )}
              <button
                className={styles['metaActionButton']}
                onClick={() => {
                  setIsPhoneEditorOpen((current) => {
                    const nextValue = !current;

                    if (nextValue) {
                      setPhoneFormValues({
                        code: '',
                        phoneNumber: '',
                      });
                      setSentVerification(null);
                    }

                    return nextValue;
                  });
                }}
                type='button'
              >
                {isPhoneEditorOpen ? '닫기' : '휴대폰 번호 변경'}
              </button>
            </div>
          </div>

          <div className={styles['consentGroup']}>
            <p className={styles['consentTitle']}>선택정보 동의</p>
            <p className={sharedStyles['mutedText']}>
              이메일 변경과 마케팅 수신 동의 변경은 현재 준비 중입니다. 현재는 이름, 닉네임, 휴대폰
              번호만 수정할 수 있습니다.
            </p>
          </div>

          {isPhoneEditorOpen ? (
            <div className={styles['inlineEditor']}>
              <h3 className={styles['contentTitle']}>휴대폰 번호 변경</h3>
              <div className={sharedStyles['fieldGrid']}>
                <TextField
                  label='새 휴대폰 번호'
                  name='phoneNumber'
                  onChange={handlePhoneFieldChange('phoneNumber')}
                  placeholder='010-1234-5678'
                  value={phoneFormValues.phoneNumber}
                />
                <div className={styles['inlineFieldRow']}>
                  <TextField
                    className={styles['codeField']}
                    label='인증번호'
                    maxLength={6}
                    name='code'
                    onChange={handlePhoneFieldChange('code')}
                    placeholder='6자리 숫자'
                    value={phoneFormValues.code}
                  />
                  <Button
                    className={styles['inlineActionButton']}
                    disabled={
                      sendPhoneVerificationMutation.isPending ||
                      phoneFormValues.phoneNumber.trim().length === 0
                    }
                    onClick={() => {
                      setSentVerification(null);
                      sendPhoneVerificationMutation.mutate({
                        phoneNumber: phoneFormValues.phoneNumber.trim(),
                      });
                    }}
                    type='button'
                    variant='secondary'
                  >
                    {sendPhoneVerificationMutation.isPending ? '발송 중...' : '인증번호 받기'}
                  </Button>
                </div>
              </div>

              {sentVerification ? (
                <p className={sharedStyles['mutedText']}>인증번호를 보냈습니다.</p>
              ) : null}

              <div className={styles['actionRow']}>
                <Button
                  disabled={
                    verifyPhoneMutation.isPending ||
                    phoneFormValues.phoneNumber.trim().length === 0 ||
                    phoneFormValues.code.trim().length !== 6
                  }
                  onClick={() => {
                    verifyPhoneMutation.mutate({
                      code: phoneFormValues.code.trim(),
                      phoneNumber: phoneFormValues.phoneNumber.trim(),
                    });
                  }}
                  type='button'
                >
                  {verifyPhoneMutation.isPending ? '변경 중...' : '번호 변경'}
                </Button>
              </div>
            </div>
          ) : null}

          <div className={styles['actionRow']}>
            <Button
              disabled={
                updateProfileMutation.isPending ||
                resolvedProfileFormValues.name.trim().length === 0
              }
              onClick={() => {
                updateProfileMutation.mutate({
                  name: resolvedProfileFormValues.name.trim(),
                  nickname: resolvedProfileFormValues.nickname.trim(),
                });
              }}
              type='button'
            >
              {updateProfileMutation.isPending ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        </section>
      </div>
    );
  };

  const renderSupportInquiry = () => {
    return (
      <section className={styles['contentSection']}>
        <h2 className={sharedStyles['sectionTitle']}>1:1 문의</h2>
        <div className={styles['supportBlock']}>
          <p className={sharedStyles['mutedText']}>
            문의 내역 조회 기능은 준비 중입니다. 문의가 필요하면 문의 페이지를 이용해 주세요.
          </p>
          <Link className={sharedStyles['textLink']} to={routePaths.contact}>
            문의하기
          </Link>
        </div>
      </section>
    );
  };

  const renderActivePanel = () => {
    switch (activeView) {
      case 'learning-courses':
        return renderLearningCourses();
      case 'orders-history':
        return renderOrderHistory();
      case 'orders-coupons':
        return renderOrderCoupons();
      case 'orders-refunds':
        return renderOrderRefunds();
      case 'profile-basic':
        return renderProfileBasic();
      case 'support-inquiry':
        return renderSupportInquiry();
      default:
        return null;
    }
  };

  const renderReviewModal = () => {
    if (selectedEnrollmentId === null) {
      return null;
    }

    const detail = enrollmentDetailQuery.data;
    const reviewWritten = Boolean(detail?.reviewWritten);
    const reviewWritable = Boolean(detail?.reviewWritable);
    const canManageReview = reviewWritten || reviewWritable;
    const title = selectedEnrollment?.programTitle ?? detail?.programTitle ?? '강의 후기';

    return (
      <Modal
        description={`${title}에 대한 학습 후기를 남겨 주세요.`}
        onClose={closeReviewModal}
        title={reviewWritten ? '후기 수정' : '후기 작성'}
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
                <strong className={styles['contentTitle']}>{detail.programTitle}</strong>
                <p className={sharedStyles['mutedText']}>
                  수강 경험과 도움이 된 포인트를 간단히 정리해 주세요.
                </p>
              </div>
              <div className={styles['reviewFieldGrid']}>
                <TextField
                  label='평점'
                  max={5}
                  min={1}
                  name='rating'
                  onChange={(event) => {
                    setReviewFormValues((current) => ({
                      ...current,
                      rating: event.target.value,
                    }));
                  }}
                  type='number'
                  value={reviewFormValues.rating}
                />
                <TextAreaField
                  label='후기 내용'
                  name='content'
                  onChange={(event) => {
                    setReviewFormValues((current) => ({
                      ...current,
                      content: event.target.value,
                    }));
                  }}
                  rows={6}
                  value={reviewFormValues.content}
                />
              </div>
              {reviewFormError ? <p className={styles['errorText']}>{reviewFormError}</p> : null}
              <div className={styles['reviewActionRow']}>
                <Button onClick={closeReviewModal} type='button' variant='secondary'>
                  닫기
                </Button>
                <Button disabled={reviewMutation.isPending} type='submit'>
                  {reviewMutation.isPending
                    ? '저장 중...'
                    : reviewWritten
                      ? '후기 수정하기'
                      : '후기 등록하기'}
                </Button>
              </div>
            </form>
          ) : (
            <div className={styles['reviewBlockedState']}>
              <strong className={styles['contentTitle']}>{detail.programTitle}</strong>
              <p className={sharedStyles['mutedText']}>
                후기는 현재 수강 중이거나 이미 작성한 강의에서만 관리할 수 있습니다.
              </p>
              <div className={styles['reviewActionRow']}>
                <Button onClick={closeReviewModal} type='button' variant='secondary'>
                  닫기
                </Button>
              </div>
            </div>
          )
        ) : null}
      </Modal>
    );
  };

  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>마이페이지</h1>
          </header>

          <div className={styles['layout']}>
            <aside className={styles['sidebar']}>
              <div className={styles['sidebarHeader']}>
                <strong className={styles['sidebarTitle']}>{accountName}님</strong>
              </div>

              <nav aria-label='마이페이지 메뉴' className={styles['menuGroups']}>
                {SIDEBAR_GROUPS.map((group) => (
                  <div className={styles['menuGroup']} key={group.label}>
                    <p className={styles['menuGroupLabel']}>{group.label}</p>
                    <div className={styles['menuList']}>
                      {group.items.map((item) => {
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
                            <span className={styles['menuLabel']}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className={styles['sidebarFooter']}>
                <Button
                  className={styles['logoutButton']}
                  disabled={logoutMutation.isPending}
                  onClick={() => {
                    logoutMutation.mutate();
                  }}
                  type='button'
                  variant='secondary'
                >
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </Button>
              </div>
            </aside>

            <div className={styles['panel']}>{renderActivePanel()}</div>
          </div>
        </div>
      </div>
      {renderReviewModal()}
    </section>
  );
};

export default MyPagePage;
