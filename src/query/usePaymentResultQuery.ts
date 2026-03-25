import { useQuery } from '@tanstack/react-query';

import { fetchPaymentResult, fetchPaymentResultByToken } from '@/api/payments';

export const paymentResultQueryKey = (paymentId: number | null, resultToken: string | null) =>
  ['payments', 'result', paymentId, resultToken] as const;

export const usePaymentResultQuery = (paymentId: number | null, resultToken: string | null) => {
  return useQuery({
    enabled: paymentId !== null || resultToken !== null,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (resultToken) {
        try {
          return await fetchPaymentResultByToken(resultToken);
        } catch (error) {
          if (paymentId !== null) {
            return await fetchPaymentResult(paymentId);
          }

          throw error;
        }
      }
      return fetchPaymentResult(paymentId as number);
    },
    queryKey: paymentResultQueryKey(paymentId, resultToken),
    staleTime: 30 * 1000,
  });
};
