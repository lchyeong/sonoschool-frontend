import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { logoutStudent } from '@/api/auth';
import { sendMyPhoneVerification, updateMyProfile, verifyMyPhoneChange } from '@/api/mypage';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import {
  myProfileQueryKey,
  useMyApplicationSummaryQuery,
  useMyCartQuery,
  useMyEnrollmentDetailQuery,
  useMyEnrollmentsQuery,
  useMyProfileQuery,
  useMyRefundsQuery,
  useMyReservationsQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import type { SmsSendResponse } from '@/types/auth';
import type { EnrollmentDetail } from '@/types/mypage';
import { classNames } from '@/utils/classNames';

import styles from './MyPagePage.module.scss';

type MyPageViewKey =
  | 'learning-courses'
  | 'orders-reservations'
  | 'orders-checkout'
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

interface OrderMediaCardProps {
  chipLabel: string;
  detailPath: string;
  metaText: string;
  note?: string | null;
  thumbnailUrl: string | null;
  title: string;
  trailingValue?: string | null;
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
      { key: 'orders-reservations', label: '신청 내역' },
      { key: 'orders-checkout', label: '장바구니' },
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
  CANCELLED: '취소/환불',
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  REQUESTED: '신청 완료',
  CONFIRMED: '신청 확정',
  CANCELLED: '취소됨',
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  REFUND_REQUESTED: '환불 진행 중',
  REFUNDED: '환불 완료',
  CANCELLED: '취소 완료',
};

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  ONLINE: '온라인',
  OFFLINE: '오프라인',
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

const OrderMediaCard = ({
  chipLabel,
  detailPath,
  metaText,
  note,
  thumbnailUrl,
  title,
  trailingValue,
}: OrderMediaCardProps) => {
  return (
    <article className={styles['orderCard']}>
      <Link className={styles['orderCardThumbnailLink']} to={detailPath}>
        {thumbnailUrl ? (
          <img
            alt={`${title} 대표 이미지`}
            className={styles['orderCardThumbnailImage']}
            loading='lazy'
            src={thumbnailUrl}
          />
        ) : (
          <div aria-hidden='true' className={styles['orderCardThumbnailFallback']}>
            <span>SS</span>
          </div>
        )}
      </Link>
      <div className={styles['orderCardBody']}>
        <div className={styles['orderCardHeader']}>
          <Link className={styles['orderCardTitleLink']} to={detailPath}>
            <strong className={styles['orderCardTitle']}>{title}</strong>
          </Link>
          <span className={styles['statusChip']}>{chipLabel}</span>
        </div>
        <div className={styles['orderCardFooter']}>
          <div className={styles['orderCardMetaGroup']}>
            <p className={styles['orderCardMeta']}>{metaText}</p>
            {note ? <p className={styles['orderCardSubMeta']}>{note}</p> : null}
          </div>
          {trailingValue ? <p className={styles['orderCardAmount']}>{trailingValue}</p> : null}
        </div>
      </div>
    </article>
  );
};

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

const getLastLearningAt = (detail?: EnrollmentDetail) => {
  if (!detail) return null;

  return detail.progress.reduce<string | null>((latest, progressItem) => {
    if (!progressItem.lastWatchedAt) return latest;
    if (!latest) return progressItem.lastWatchedAt;

    return new Date(progressItem.lastWatchedAt) > new Date(latest)
      ? progressItem.lastWatchedAt
      : latest;
  }, null);
};

const MY_COURSE_PAGE_SIZE = 5;
const ORDER_LIST_PAGE_SIZE = 4;
const CART_LIST_PAGE_SIZE = 4;

type EnrollmentFilterValue = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
type ReservationFilterValue = 'ALL' | 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';
type RefundFilterValue = 'ALL' | 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';
type CartFilterValue = 'ALL' | 'ONLINE' | 'OFFLINE';

interface SegmentOption<TValue extends string> {
  label: string;
  value: TValue;
}

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
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
}

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

  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentFilterValue>('ALL');
  const [reservationFilter, setReservationFilter] = useState<ReservationFilterValue>('ALL');
  const [refundFilter, setRefundFilter] = useState<RefundFilterValue>('ALL');
  const [cartFilter, setCartFilter] = useState<CartFilterValue>('ALL');
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [reservationPage, setReservationPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const [cartPage, setCartPage] = useState(1);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [profileFormValues, setProfileFormValues] = useState<ProfileFormValues | null>(null);
  const [phoneFormValues, setPhoneFormValues] = useState({
    phoneNumber: '',
    code: '',
  });
  const [sentVerification, setSentVerification] = useState<SmsSendResponse | null>(null);
  const [isPhoneEditorOpen, setIsPhoneEditorOpen] = useState(false);

  const profileQuery = useMyProfileQuery();
  const enrollmentsQuery = useMyEnrollmentsQuery();
  const filteredEnrollments = (enrollmentsQuery.data ?? []).filter((enrollment) => {
    return enrollmentFilter === 'ALL' || enrollment.status === enrollmentFilter;
  });
  const enrollmentPageCount = getPageCount(filteredEnrollments.length, MY_COURSE_PAGE_SIZE);
  const paginatedEnrollments = paginateItems(
    filteredEnrollments,
    enrollmentPage,
    MY_COURSE_PAGE_SIZE,
  );
  const resolvedSelectedEnrollmentId =
    selectedEnrollmentId !== null &&
    paginatedEnrollments.some((enrollment) => enrollment.id === selectedEnrollmentId)
      ? selectedEnrollmentId
      : (paginatedEnrollments[0]?.id ?? null);
  const enrollmentDetailQuery = useMyEnrollmentDetailQuery(
    resolvedSelectedEnrollmentId,
    activeView === 'learning-courses',
  );
  const reservationsQuery = useMyReservationsQuery(activeView === 'orders-reservations');
  const refundsQuery = useMyRefundsQuery(activeView === 'orders-refunds');
  const cartQuery = useMyCartQuery(activeView === 'orders-checkout');
  const applicationSummaryQuery = useMyApplicationSummaryQuery(activeView === 'orders-checkout');
  const filteredReservations = (reservationsQuery.data ?? []).filter((reservation) => {
    return reservationFilter === 'ALL' || reservation.status === reservationFilter;
  });
  const reservationPageCount = getPageCount(filteredReservations.length, ORDER_LIST_PAGE_SIZE);
  const paginatedReservations = paginateItems(
    filteredReservations,
    reservationPage,
    ORDER_LIST_PAGE_SIZE,
  );
  const filteredRefunds = (refundsQuery.data ?? []).filter((refund) => {
    return refundFilter === 'ALL' || refund.status === refundFilter;
  });
  const refundPageCount = getPageCount(filteredRefunds.length, ORDER_LIST_PAGE_SIZE);
  const paginatedRefunds = paginateItems(filteredRefunds, refundPage, ORDER_LIST_PAGE_SIZE);
  const filteredCartItems = (cartQuery.data?.items ?? []).filter((item) => {
    return cartFilter === 'ALL' || item.programType === cartFilter;
  });
  const cartPageCount = getPageCount(filteredCartItems.length, CART_LIST_PAGE_SIZE);
  const paginatedCartItems = paginateItems(filteredCartItems, cartPage, CART_LIST_PAGE_SIZE);

  const accountName = profileQuery.data?.displayName || storeDisplayName || '회원';
  const lastLearningAt = getLastLearningAt(enrollmentDetailQuery.data);
  const resolvedProfileFormValues: ProfileFormValues = {
    email: profileFormValues?.email ?? profileQuery.data?.email ?? '',
    marketingEmailOptIn:
      profileFormValues?.marketingEmailOptIn ?? profileQuery.data?.marketingEmailOptIn ?? false,
    marketingSmsOptIn:
      profileFormValues?.marketingSmsOptIn ?? profileQuery.data?.marketingSmsOptIn ?? false,
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

  const handleEnrollmentFilterChange = (nextFilter: EnrollmentFilterValue) => {
    setEnrollmentFilter(nextFilter);
    setEnrollmentPage(1);
    setSelectedEnrollmentId(null);
  };

  const handleReservationFilterChange = (nextFilter: ReservationFilterValue) => {
    setReservationFilter(nextFilter);
    setReservationPage(1);
  };

  const handleRefundFilterChange = (nextFilter: RefundFilterValue) => {
    setRefundFilter(nextFilter);
    setRefundPage(1);
  };

  const handleCartFilterChange = (nextFilter: CartFilterValue) => {
    setCartFilter(nextFilter);
    setCartPage(1);
  };

  const handleEnrollmentPageChange = (nextPage: number) => {
    setEnrollmentPage(nextPage);
    setSelectedEnrollmentId(null);
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

  const handleProfileFieldChange =
    (fieldName: 'email' | 'name' | 'nickname') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setProfileFormValues((currentValues) => ({
        email:
          fieldName === 'email'
            ? nextValue
            : (currentValues?.email ?? profileQuery.data?.email ?? ''),
        marketingEmailOptIn:
          currentValues?.marketingEmailOptIn ?? profileQuery.data?.marketingEmailOptIn ?? false,
        marketingSmsOptIn:
          currentValues?.marketingSmsOptIn ?? profileQuery.data?.marketingSmsOptIn ?? false,
        name:
          fieldName === 'name' ? nextValue : (currentValues?.name ?? profileQuery.data?.name ?? ''),
        nickname:
          fieldName === 'nickname'
            ? nextValue
            : (currentValues?.nickname ?? profileQuery.data?.nickname ?? ''),
      }));
    };

  const handleConsentChange =
    (fieldName: 'marketingEmailOptIn' | 'marketingSmsOptIn') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.checked;

      setProfileFormValues((currentValues) => ({
        email: currentValues?.email ?? profileQuery.data?.email ?? '',
        marketingEmailOptIn:
          fieldName === 'marketingEmailOptIn'
            ? nextValue
            : (currentValues?.marketingEmailOptIn ??
              profileQuery.data?.marketingEmailOptIn ??
              false),
        marketingSmsOptIn:
          fieldName === 'marketingSmsOptIn'
            ? nextValue
            : (currentValues?.marketingSmsOptIn ?? profileQuery.data?.marketingSmsOptIn ?? false),
        name: currentValues?.name ?? profileQuery.data?.name ?? '',
        nickname: currentValues?.nickname ?? profileQuery.data?.nickname ?? '',
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
        marketingEmailOptIn: updatedProfile.marketingEmailOptIn,
        marketingSmsOptIn: updatedProfile.marketingSmsOptIn,
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

  const renderLearningCourses = () => {
    const totalEnrollmentCount = enrollmentsQuery.data?.length ?? 0;

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

    if (!totalEnrollmentCount) {
      return <p className={sharedStyles['mutedText']}>수강 중인 강의가 없습니다.</p>;
    }

    return (
      <section className={styles['contentSection']}>
        <div className={sharedStyles['sectionHeader']}>
          <h2 className={sharedStyles['sectionTitle']}>내 강의</h2>
          <p className={sharedStyles['sectionDescription']}>
            전체 {totalEnrollmentCount}개 강의 중 {filteredEnrollments.length}개를 보고 있습니다.
          </p>
        </div>

        <SegmentFilter
          onChange={handleEnrollmentFilterChange}
          options={[
            { label: '전체', value: 'ALL' },
            { label: '수강 중', value: 'ACTIVE' },
            { label: '수강 종료', value: 'EXPIRED' },
            { label: '취소/환불', value: 'CANCELLED' },
          ]}
          value={enrollmentFilter}
        />

        {!filteredEnrollments.length ? (
          <p className={sharedStyles['mutedText']}>선택한 상태의 강의가 없습니다.</p>
        ) : null}

        {filteredEnrollments.length ? (
          <div className={styles['detailSplit']}>
            <div className={styles['recordColumn']}>
              <div className={styles['recordList']} role='list'>
                {paginatedEnrollments.map((enrollment) => {
                  const isActive = enrollment.id === resolvedSelectedEnrollmentId;

                  return (
                    <button
                      aria-pressed={isActive}
                      className={classNames(
                        styles['recordButton'],
                        isActive && styles['recordButtonActive'],
                      )}
                      key={enrollment.id}
                      onClick={() => {
                        setSelectedEnrollmentId(enrollment.id);
                      }}
                      type='button'
                    >
                      <span className={styles['recordTitle']}>{enrollment.programTitle}</span>
                      <span className={styles['recordMeta']}>
                        {formatStatusLabel(enrollment.status, ENROLLMENT_STATUS_LABELS)} · 수강 기간{' '}
                        {formatDateRange(enrollment.enrolledAt, enrollment.expireAt)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <PaginationControls
                currentPage={enrollmentPage}
                onChange={handleEnrollmentPageChange}
                totalPages={enrollmentPageCount}
              />
            </div>

            <div className={styles['detailBody']}>
              {enrollmentDetailQuery.isLoading ? (
                <p className={sharedStyles['mutedText']}>강의 상세를 불러오는 중입니다.</p>
              ) : null}

              {enrollmentDetailQuery.isError ? (
                <p className={styles['errorText']}>
                  {enrollmentDetailQuery.error instanceof Error
                    ? enrollmentDetailQuery.error.message
                    : '강의 상세를 불러오지 못했습니다.'}
                </p>
              ) : null}

              {enrollmentDetailQuery.data ? (
                <>
                  <h3 className={styles['contentTitle']}>
                    {enrollmentDetailQuery.data.programTitle}
                  </h3>

                  <div className={styles['summaryGrid']}>
                    <div className={styles['summaryItem']}>
                      <span className={styles['summaryLabel']}>수강 기간</span>
                      <strong className={styles['summaryValue']}>
                        {formatDateRange(
                          enrollmentDetailQuery.data.enrolledAt,
                          enrollmentDetailQuery.data.expireAt,
                        )}
                      </strong>
                    </div>
                    <div className={styles['summaryItem']}>
                      <span className={styles['summaryLabel']}>진도율</span>
                      <strong className={styles['summaryValue']}>
                        {enrollmentDetailQuery.data.completionRate}%
                      </strong>
                    </div>
                    <div className={styles['summaryItem']}>
                      <span className={styles['summaryLabel']}>완료 강의</span>
                      <strong className={styles['summaryValue']}>
                        {enrollmentDetailQuery.data.completedLectures} /{' '}
                        {enrollmentDetailQuery.data.totalLectures}
                      </strong>
                    </div>
                  </div>

                  <div className={sharedStyles['metaList']}>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>최근 학습</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatDateTime(lastLearningAt)}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>현재 상태</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatStatusLabel(
                          enrollmentDetailQuery.data.status,
                          ENROLLMENT_STATUS_LABELS,
                        )}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>수료 여부</span>
                      <span className={sharedStyles['metaValue']}>
                        {enrollmentDetailQuery.data.completed ? '수료 완료' : '수강 중'}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>수료증 발급</span>
                      <span className={sharedStyles['metaValue']}>
                        {enrollmentDetailQuery.data.certificateEligible ? '가능' : '미대상'}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  const renderOrderReservations = () => {
    const reservationCount = reservationsQuery.data?.length ?? 0;

    return (
      <section className={styles['contentSection']}>
        <div className={sharedStyles['sectionHeader']}>
          <h2 className={sharedStyles['sectionTitle']}>신청 내역</h2>
          <p className={sharedStyles['sectionDescription']}>
            전체 {reservationCount}건 중 {filteredReservations.length}건을 보고 있습니다.
          </p>
        </div>

        <SegmentFilter
          onChange={handleReservationFilterChange}
          options={[
            { label: '전체', value: 'ALL' },
            { label: '신청 완료', value: 'REQUESTED' },
            { label: '신청 확정', value: 'CONFIRMED' },
            { label: '취소됨', value: 'CANCELLED' },
          ]}
          value={reservationFilter}
        />

        {reservationsQuery.isLoading ? (
          <p className={sharedStyles['mutedText']}>신청 내역을 불러오는 중입니다.</p>
        ) : null}

        {reservationsQuery.isError ? (
          <p className={styles['errorText']}>
            {reservationsQuery.error instanceof Error
              ? reservationsQuery.error.message
              : '신청 내역을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!reservationsQuery.isLoading &&
        !reservationsQuery.isError &&
        filteredReservations.length ? (
          <div className={styles['stackList']}>
            {paginatedReservations.map((reservation) => (
              <OrderMediaCard
                chipLabel={formatStatusLabel(reservation.status, RESERVATION_STATUS_LABELS)}
                detailPath={reservation.detailPath}
                key={reservation.id}
                metaText={`${reservation.scheduleTitle} · ${formatDateTime(
                  reservation.scheduleStartAt,
                )} · ${reservation.location || '-'} · 신청일 ${formatDate(reservation.createdAt)}`}
                note={reservation.note}
                thumbnailUrl={reservation.thumbnailUrl}
                title={reservation.programTitle}
              />
            ))}
          </div>
        ) : null}

        {!reservationsQuery.isLoading &&
        !reservationsQuery.isError &&
        reservationCount > 0 &&
        filteredReservations.length === 0 ? (
          <p className={sharedStyles['mutedText']}>선택한 상태의 신청 내역이 없습니다.</p>
        ) : null}

        {!reservationsQuery.isLoading &&
        !reservationsQuery.isError &&
        filteredReservations.length ? (
          <PaginationControls
            currentPage={reservationPage}
            onChange={setReservationPage}
            totalPages={reservationPageCount}
          />
        ) : null}

        {!reservationsQuery.isLoading && !reservationsQuery.isError && reservationCount === 0 ? (
          <p className={sharedStyles['mutedText']}>오프라인 신청 내역이 없습니다.</p>
        ) : null}
      </section>
    );
  };

  const renderOrderCheckout = () => {
    const totalCartItemCount = cartQuery.data?.items.length ?? 0;

    return (
      <div className={styles['detailColumn']}>
        <section className={styles['contentSection']}>
          <div className={sharedStyles['sectionHeader']}>
            <h2 className={sharedStyles['sectionTitle']}>장바구니</h2>
            <p className={sharedStyles['sectionDescription']}>
              전체 {totalCartItemCount}개 상품 중 {filteredCartItems.length}개를 보고 있습니다.
            </p>
          </div>

          <SegmentFilter
            onChange={handleCartFilterChange}
            options={[
              { label: '전체', value: 'ALL' },
              { label: '온라인', value: 'ONLINE' },
              { label: '오프라인', value: 'OFFLINE' },
            ]}
            value={cartFilter}
          />

          {cartQuery.isLoading ? (
            <p className={sharedStyles['mutedText']}>장바구니 항목을 불러오는 중입니다.</p>
          ) : null}

          {cartQuery.isError ? (
            <p className={styles['errorText']}>
              {cartQuery.error instanceof Error
                ? cartQuery.error.message
                : '장바구니 항목을 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && filteredCartItems.length ? (
            <div className={styles['stackList']}>
              {paginatedCartItems.map((item) => (
                <OrderMediaCard
                  chipLabel={PROGRAM_TYPE_LABELS[item.programType] ?? '과정'}
                  detailPath={item.detailPath}
                  key={item.id}
                  metaText={`강사 ${item.instructorName || '-'}`}
                  thumbnailUrl={item.thumbnailUrl}
                  title={item.title}
                  trailingValue={formatCurrency(item.payablePrice)}
                />
              ))}
            </div>
          ) : null}

          {!cartQuery.isLoading &&
          !cartQuery.isError &&
          totalCartItemCount > 0 &&
          filteredCartItems.length === 0 ? (
            <p className={sharedStyles['mutedText']}>선택한 유형의 상품이 없습니다.</p>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && filteredCartItems.length ? (
            <PaginationControls
              currentPage={cartPage}
              onChange={setCartPage}
              totalPages={cartPageCount}
            />
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && !totalCartItemCount ? (
            <p className={sharedStyles['mutedText']}>장바구니에 담긴 항목이 없습니다.</p>
          ) : null}
        </section>

        <section className={styles['contentSection']}>
          <h3 className={styles['contentTitle']}>합계</h3>

          {cartQuery.data ? (
            <div className={sharedStyles['metaList']}>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>총 상품 수</span>
                <span className={sharedStyles['metaValue']}>{cartQuery.data.itemCount}개</span>
              </div>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>총 상품 금액</span>
                <span className={sharedStyles['metaValue']}>
                  {formatCurrency(cartQuery.data.totalOriginalPrice)}
                </span>
              </div>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>총 할인 금액</span>
                <span className={sharedStyles['metaValue']}>
                  {formatCurrency(cartQuery.data.totalDiscountAmount)}
                </span>
              </div>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>총 결제 예상 금액</span>
                <span className={sharedStyles['metaValue']}>
                  {formatCurrency(cartQuery.data.totalPayablePrice)}
                </span>
              </div>
            </div>
          ) : null}

          {cartQuery.data?.appliedCoupon ? (
            <p className={sharedStyles['mutedText']}>
              쿠폰 {cartQuery.data.appliedCoupon.name} (
              {formatDiscountLabel(
                cartQuery.data.appliedCoupon.discountType,
                cartQuery.data.appliedCoupon.discountValue,
              )}
              )
            </p>
          ) : null}

          {applicationSummaryQuery.data ? (
            <div className={styles['summaryGrid']}>
              <div className={styles['summaryItem']}>
                <span className={styles['summaryLabel']}>온라인 장바구니</span>
                <strong className={styles['summaryValue']}>
                  {applicationSummaryQuery.data.onlineItems.length}건
                </strong>
              </div>
              <div className={styles['summaryItem']}>
                <span className={styles['summaryLabel']}>오프라인 신청 대기</span>
                <strong className={styles['summaryValue']}>
                  {applicationSummaryQuery.data.offlineItemCount}건
                </strong>
              </div>
              <div className={styles['summaryItem']}>
                <span className={styles['summaryLabel']}>온라인 결제 합계</span>
                <strong className={styles['summaryValue']}>
                  {formatCurrency(applicationSummaryQuery.data.onlinePayablePrice)}
                </strong>
              </div>
            </div>
          ) : null}
        </section>
      </div>
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
              onChange={handleProfileFieldChange('email')}
              placeholder='name@example.com'
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
            <label className={styles['checkboxRow']}>
              <input
                checked={resolvedProfileFormValues.marketingEmailOptIn}
                name='marketingEmailOptIn'
                onChange={handleConsentChange('marketingEmailOptIn')}
                type='checkbox'
              />
              <span>이메일로 이벤트/강의 소식을 받겠습니다.</span>
            </label>
            <label className={styles['checkboxRow']}>
              <input
                checked={resolvedProfileFormValues.marketingSmsOptIn}
                name='marketingSmsOptIn'
                onChange={handleConsentChange('marketingSmsOptIn')}
                type='checkbox'
              />
              <span>문자로 일정/혜택 안내를 받겠습니다.</span>
            </label>
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
                resolvedProfileFormValues.email.trim().length === 0 ||
                resolvedProfileFormValues.name.trim().length === 0
              }
              onClick={() => {
                updateProfileMutation.mutate({
                  email: resolvedProfileFormValues.email.trim(),
                  marketingEmailOptIn: resolvedProfileFormValues.marketingEmailOptIn,
                  marketingSmsOptIn: resolvedProfileFormValues.marketingSmsOptIn,
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
      case 'orders-reservations':
        return renderOrderReservations();
      case 'orders-checkout':
        return renderOrderCheckout();
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
    </section>
  );
};

export default MyPagePage;
