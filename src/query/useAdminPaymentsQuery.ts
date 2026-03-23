import { useQuery } from '@tanstack/react-query';

import { fetchAdminPaymentDetail, fetchAdminPayments } from '@/api/adminPayments';

export const adminPaymentsQueryKey = () => ['adminPayments'] as const;

export const adminPaymentDetailQueryKey = (paymentId: number | null) =>
  ['adminPaymentDetail', paymentId] as const;

export const useAdminPaymentsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminPayments(),
    queryKey: adminPaymentsQueryKey(),
    staleTime: 30 * 1000,
  });
};

export const useAdminPaymentDetailQuery = (paymentId: number | null) => {
  return useQuery({
    enabled: paymentId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminPaymentDetail(paymentId as number),
    queryKey: adminPaymentDetailQueryKey(paymentId),
    staleTime: 30 * 1000,
  });
};
