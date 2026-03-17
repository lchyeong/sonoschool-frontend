import { useQuery } from '@tanstack/react-query';

import {
  fetchMyApplicationSummary,
  fetchMyCart,
  fetchMyEnrollmentDetail,
  fetchMyEnrollments,
  fetchMyProfile,
  fetchMyReservations,
} from '@/api/mypage';

export const myProfileQueryKey = ['mypage', 'profile'] as const;
export const myEnrollmentsQueryKey = ['mypage', 'enrollments'] as const;
export const myEnrollmentDetailQueryKey = (enrollmentId: number | null) =>
  ['mypage', 'enrollmentDetail', enrollmentId] as const;
export const myCartQueryKey = ['mypage', 'cart'] as const;
export const myApplicationSummaryQueryKey = ['mypage', 'applicationSummary'] as const;
export const myReservationsQueryKey = ['mypage', 'reservations'] as const;

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

export const useMyCartQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyCart,
    queryKey: myCartQueryKey,
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

export const useMyReservationsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: fetchMyReservations,
    queryKey: myReservationsQueryKey,
    staleTime: 60 * 1000,
  });
};
