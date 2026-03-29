import { useQuery } from '@tanstack/react-query';

import {
  fetchMyApplicationSummary,
  fetchMyCart,
  fetchMyCoupons,
  fetchMyEnrollmentDetail,
  fetchMyEnrollmentPracticumOverview,
  fetchMyEnrollments,
  fetchMyLearningPlayerSnapshot,
  fetchMyProfile,
  fetchMyRefunds,
} from '@/api/mypage';
import { fetchPaymentHistory } from '@/api/payments';
import { useAuthStore } from '@/stores/useAuthStore';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';

export const myProfileQueryKey = ['mypage', 'profile'] as const;
export const myEnrollmentsQueryKey = ['mypage', 'enrollments'] as const;
export const myEnrollmentDetailQueryKey = (enrollmentId: number | null) =>
  ['mypage', 'enrollmentDetail', enrollmentId] as const;
export const myLearningPlayerQueryKey = (enrollmentId: number | null) =>
  ['mypage', 'learningPlayer', enrollmentId] as const;
export const myEnrollmentPracticumQueryKey = (enrollmentId: number | null) =>
  ['mypage', 'enrollmentPracticum', enrollmentId] as const;
export const myCartQueryKey = (scope: 'authenticated' | 'guest') =>
  ['mypage', 'cart', scope] as const;
export const myCouponsQueryKey = (scope: 'authenticated' | 'guest') =>
  ['mypage', 'coupons', scope] as const;
export const myApplicationSummaryQueryKey = ['mypage', 'applicationSummary'] as const;
export const myPaymentHistoryQueryKey = ['mypage', 'paymentHistory'] as const;
export const myRefundsQueryKey = ['mypage', 'refunds'] as const;

export const useMyProfileQuery = () => {
  return useQuery({
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyProfile,
    queryKey: myProfileQueryKey,
    staleTime: 60 * 1000,
  });
};

export const useMyEnrollmentsQuery = () => {
  return useQuery({
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyEnrollments,
    queryKey: myEnrollmentsQueryKey,
    staleTime: 60 * 1000,
  });
};

export const useMyEnrollmentDetailQuery = (enrollmentId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && enrollmentId !== null,
    gcTime: 10 * 60 * 1000,
    queryFn: () => fetchMyEnrollmentDetail(enrollmentId as number),
    queryKey: myEnrollmentDetailQueryKey(enrollmentId),
    staleTime: 60 * 1000,
  });
};

export const useMyLearningPlayerSnapshotQuery = (enrollmentId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && enrollmentId !== null,
    gcTime: 10 * 60 * 1000,
    queryFn: () => fetchMyLearningPlayerSnapshot(enrollmentId as number),
    queryKey: myLearningPlayerQueryKey(enrollmentId),
    staleTime: 60 * 1000,
  });
};

export const useMyEnrollmentPracticumQuery = (enrollmentId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && enrollmentId !== null,
    gcTime: 10 * 60 * 1000,
    queryFn: () => fetchMyEnrollmentPracticumOverview(enrollmentId as number),
    queryKey: myEnrollmentPracticumQueryKey(enrollmentId),
    staleTime: 60 * 1000,
  });
};

export const useMyCartQuery = (enabled = true) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const scope = resolveCartQueryScope(isAuthenticated);

  return useQuery({
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyCart,
    queryKey: myCartQueryKey(scope),
    staleTime: 60 * 1000,
  });
};

export const useMyCouponsQuery = (enabled = true) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const scope = resolveCartQueryScope(isAuthenticated);

  return useQuery({
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyCoupons,
    queryKey: myCouponsQueryKey(scope),
    staleTime: 60 * 1000,
  });
};

export const useMyApplicationSummaryQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyApplicationSummary,
    queryKey: myApplicationSummaryQueryKey,
    staleTime: 60 * 1000,
  });
};

export const useMyPaymentHistoryQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: fetchPaymentHistory,
    queryKey: myPaymentHistoryQueryKey,
    staleTime: 60 * 1000,
  });
};

export const useMyRefundsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyRefunds,
    queryKey: myRefundsQueryKey,
    staleTime: 60 * 1000,
  });
};
