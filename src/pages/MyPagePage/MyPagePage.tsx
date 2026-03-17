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
  | 'profile-consents'
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
      { key: 'orders-reservations', label: '신청 내역' },
      { key: 'orders-checkout', label: '결제 예정' },
      { key: 'orders-refunds', label: '취소/환불 내역' },
    ],
  },
  {
    label: '내 정보',
    items: [
      { key: 'profile-basic', label: '기본 정보' },
      { key: 'profile-consents', label: '선택정보 동의' },
    ],
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
  CONFIRMED: '예약 확정',
  CANCELLED: '취소됨',
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

interface ProfileFormValues {
  name: string;
  nickname: string;
}

const MyPagePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const logout = useAuthStore((state) => state.logout);
  const storeDisplayName = useAuthStore((state) => state.displayName);
  const syncProfileSnapshot = useAuthStore((state) => state.syncProfileSnapshot);
  const showToast = useToastStore((state) => state.showToast);

  const activeView = isMyPageViewKey(searchParams.get('view'))
    ? (searchParams.get('view') as MyPageViewKey)
    : DEFAULT_VIEW;

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
  const resolvedSelectedEnrollmentId =
    selectedEnrollmentId !== null &&
    (enrollmentsQuery.data?.some((enrollment) => enrollment.id === selectedEnrollmentId) ?? false)
      ? selectedEnrollmentId
      : (enrollmentsQuery.data?.[0]?.id ?? null);
  const enrollmentDetailQuery = useMyEnrollmentDetailQuery(
    resolvedSelectedEnrollmentId,
    activeView === 'learning-courses' && resolvedSelectedEnrollmentId !== null,
  );
  const reservationsQuery = useMyReservationsQuery(activeView === 'orders-reservations');
  const cartQuery = useMyCartQuery(activeView === 'orders-checkout');
  const applicationSummaryQuery = useMyApplicationSummaryQuery(activeView === 'orders-checkout');

  const accountName = profileQuery.data?.displayName || storeDisplayName || '회원';
  const lastLearningAt = getLastLearningAt(enrollmentDetailQuery.data);
  const resolvedProfileFormValues: ProfileFormValues = {
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
    (fieldName: 'name' | 'nickname') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setProfileFormValues((currentValues) => ({
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

    if (!enrollmentsQuery.data?.length) {
      return <p className={sharedStyles['mutedText']}>수강 중인 강의가 없습니다.</p>;
    }

    return (
      <section className={styles['contentSection']}>
        <h2 className={sharedStyles['sectionTitle']}>내 강의</h2>
        <div className={styles['detailSplit']}>
          <div className={styles['recordList']} role='list'>
            {enrollmentsQuery.data.map((enrollment) => {
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
                    {formatStatusLabel(enrollment.status, ENROLLMENT_STATUS_LABELS)} ·{' '}
                    {formatDate(enrollment.enrolledAt)}
                  </span>
                  <span className={styles['recordMeta']}>
                    수강 종료 {formatDate(enrollment.expireAt)}
                  </span>
                </button>
              );
            })}
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
                    <span className={styles['summaryLabel']}>수강 상태</span>
                    <strong className={styles['summaryValue']}>
                      {formatStatusLabel(
                        enrollmentDetailQuery.data.status,
                        ENROLLMENT_STATUS_LABELS,
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
                    <span className={sharedStyles['metaLabel']}>수강 시작일</span>
                    <span className={sharedStyles['metaValue']}>
                      {formatDate(enrollmentDetailQuery.data.enrolledAt)}
                    </span>
                  </div>
                  <div className={sharedStyles['metaItem']}>
                    <span className={sharedStyles['metaLabel']}>수강 종료일</span>
                    <span className={sharedStyles['metaValue']}>
                      {formatDate(enrollmentDetailQuery.data.expireAt)}
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
      </section>
    );
  };

  const renderOrderReservations = () => {
    const reservationCount = reservationsQuery.data?.length ?? 0;

    return (
      <section className={styles['contentSection']}>
        <h2 className={sharedStyles['sectionTitle']}>신청 내역</h2>

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
        reservationsQuery.data?.length ? (
          <div className={styles['stackList']}>
            {reservationsQuery.data.map((reservation) => (
              <div className={styles['stackItem']} key={reservation.id}>
                <div className={styles['stackItemHeader']}>
                  <strong className={styles['stackItemTitle']}>{reservation.programTitle}</strong>
                  <span className={styles['statusChip']}>
                    {formatStatusLabel(reservation.status, RESERVATION_STATUS_LABELS)}
                  </span>
                </div>
                <p className={styles['stackItemText']}>
                  {reservation.scheduleTitle} · {formatDateTime(reservation.scheduleStartAt)}
                </p>
                <p className={styles['stackItemText']}>
                  장소 {reservation.location || '-'} · 신청일 {formatDate(reservation.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {!reservationsQuery.isLoading && !reservationsQuery.isError && reservationCount === 0 ? (
          <p className={sharedStyles['mutedText']}>오프라인 신청 내역이 없습니다.</p>
        ) : null}
      </section>
    );
  };

  const renderOrderCheckout = () => {
    return (
      <div className={styles['detailColumn']}>
        <section className={styles['contentSection']}>
          <h2 className={sharedStyles['sectionTitle']}>결제 예정</h2>

          {cartQuery.isLoading ? (
            <p className={sharedStyles['mutedText']}>결제 예정 항목을 불러오는 중입니다.</p>
          ) : null}

          {cartQuery.isError ? (
            <p className={styles['errorText']}>
              {cartQuery.error instanceof Error
                ? cartQuery.error.message
                : '결제 예정 항목을 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && cartQuery.data?.items.length ? (
            <div className={styles['stackList']}>
              {cartQuery.data.items.map((item) => (
                <div className={styles['stackItem']} key={item.id}>
                  <div className={styles['stackItemHeader']}>
                    <strong className={styles['stackItemTitle']}>{item.title}</strong>
                    <span className={styles['statusChip']}>
                      {PROGRAM_TYPE_LABELS[item.programType] ?? '과정'}
                    </span>
                  </div>
                  <p className={styles['stackItemText']}>
                    강사 {item.instructorName || '-'} · 담은 날짜 {formatDate(item.addedAt)}
                  </p>
                  <p className={styles['stackItemText']}>
                    결제 예정 금액 {formatCurrency(item.payablePrice)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && !cartQuery.data?.items.length ? (
            <p className={sharedStyles['mutedText']}>결제 예정 항목이 없습니다.</p>
          ) : null}
        </section>

        <section className={styles['contentSection']}>
          <h3 className={styles['contentTitle']}>금액 요약</h3>

          {cartQuery.data ? (
            <div className={sharedStyles['metaList']}>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>상품 수</span>
                <span className={sharedStyles['metaValue']}>{cartQuery.data.itemCount}개</span>
              </div>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>정가 합계</span>
                <span className={sharedStyles['metaValue']}>
                  {formatCurrency(cartQuery.data.totalOriginalPrice)}
                </span>
              </div>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>할인 금액</span>
                <span className={sharedStyles['metaValue']}>
                  {formatCurrency(cartQuery.data.totalDiscountAmount)}
                </span>
              </div>
              <div className={sharedStyles['metaItem']}>
                <span className={sharedStyles['metaLabel']}>결제 예정 금액</span>
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
                <span className={styles['summaryLabel']}>온라인 결제 예정</span>
                <strong className={styles['summaryValue']}>
                  {applicationSummaryQuery.data.onlineItems.length}건
                </strong>
              </div>
              <div className={styles['summaryItem']}>
                <span className={styles['summaryLabel']}>오프라인 신청 예정</span>
                <strong className={styles['summaryValue']}>
                  {applicationSummaryQuery.data.offlineItemCount}건
                </strong>
              </div>
              <div className={styles['summaryItem']}>
                <span className={styles['summaryLabel']}>온라인 결제 금액</span>
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
    return (
      <section className={styles['contentSection']}>
        <h2 className={sharedStyles['sectionTitle']}>취소/환불 내역</h2>
        <p className={sharedStyles['mutedText']}>준비 중입니다.</p>
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
          <div className={sharedStyles['metaList']}>
            <div className={sharedStyles['metaItem']}>
              <span className={sharedStyles['metaLabel']}>아이디</span>
              <span className={sharedStyles['metaValue']}>{profileQuery.data.loginId}</span>
            </div>
            <div className={sharedStyles['metaItem']}>
              <span className={sharedStyles['metaLabel']}>이메일</span>
              <span className={sharedStyles['metaValue']}>{profileQuery.data.email}</span>
            </div>
            <div className={sharedStyles['metaItem']}>
              <span className={sharedStyles['metaLabel']}>휴대폰 번호</span>
              <div className={styles['phoneMetaRow']}>
                <div className={styles['phoneValueGroup']}>
                  <span className={sharedStyles['metaValue']}>
                    {profileQuery.data.phoneNumber || '-'}
                  </span>
                  {profileQuery.data.phoneVerifiedAt ? (
                    <span aria-label='휴대폰 인증 완료' className={styles['verifiedBadge']}>
                      ✓
                    </span>
                  ) : null}
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
                    {isPhoneEditorOpen ? '닫기' : '변경'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isPhoneEditorOpen ? (
            <div className={styles['inlineEditor']}>
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
        </section>

        <section className={styles['contentSection']}>
          <h3 className={styles['contentTitle']}>정보 수정</h3>
          <div className={sharedStyles['fieldGrid']}>
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
          </div>

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

  const renderProfileConsents = () => {
    return (
      <section className={styles['contentSection']}>
        <h2 className={sharedStyles['sectionTitle']}>선택정보 동의</h2>
        <p className={sharedStyles['mutedText']}>준비 중입니다.</p>
      </section>
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
      case 'profile-consents':
        return renderProfileConsents();
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
