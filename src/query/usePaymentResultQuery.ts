import { useQuery } from '@tanstack/react-query';

import { fetchPaymentResult, fetchPaymentResultByToken } from '@/api/payments';

export const paymentResultQueryKey = (paymentId: number | null, resultToken: string | null) =>
  ['payments', 'result', paymentId, resultToken] as const;

export const usePaymentResultQuery = (paymentId: number | null, resultToken: string | null) => {
  return useQuery({
    enabled: paymentId !== null || resultToken !== null,
    gcTime: 10 * 60 * 1000,
    queryFn: () => {
      if (resultToken) {
        return fetchPaymentResultByToken(resultToken);
      }
      return fetchPaymentResult(paymentId as number);
    },
    queryKey: paymentResultQueryKey(paymentId, resultToken),
    staleTime: 30 * 1000,
  });
};
