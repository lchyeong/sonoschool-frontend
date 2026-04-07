import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramEnrollments } from '@/api/adminProgramOperations';

export const adminProgramEnrollmentsQueryKey = (programId: number | null) =>
  ['adminProgramEnrollments', programId] as const;

export const useAdminProgramEnrollmentsQuery = (programId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && programId !== null,
    gcTime: 60 * 1000,
    queryFn: () => fetchAdminProgramEnrollments(programId as number),
    queryKey: adminProgramEnrollmentsQueryKey(programId),
    staleTime: 15 * 1000,
  });
};
