import { useQuery } from '@tanstack/react-query';

import { fetchAdminCoupons } from '@/api/adminCoupons';

export const adminCouponsQueryKey = () => ['adminCoupons'] as const;

export const useAdminCouponsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminCoupons(),
    queryKey: adminCouponsQueryKey(),
    staleTime: 5 * 60 * 1000,
  });
};
