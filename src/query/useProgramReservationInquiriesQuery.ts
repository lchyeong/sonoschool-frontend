import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramReservationInquiries } from '@/api/programReservationInquiries';

export const adminProgramReservationInquiriesQueryKey = () =>
  ['adminProgramReservationInquiries'] as const;

export const useAdminProgramReservationInquiriesQuery = () => {
  return useQuery({
    gcTime: 5 * 60 * 1000,
    queryFn: fetchAdminProgramReservationInquiries,
    queryKey: adminProgramReservationInquiriesQueryKey(),
    staleTime: 30 * 1000,
  });
};
