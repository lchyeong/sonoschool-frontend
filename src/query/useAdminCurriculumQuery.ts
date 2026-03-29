import { useQuery } from '@tanstack/react-query';

import { fetchAdminCurriculum } from '@/api/adminCurriculum';

export const adminCurriculumQueryKey = (programId: number | null) =>
  ['adminCurriculum', programId] as const;

export const useAdminCurriculumQuery = (programId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && programId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminCurriculum(programId as number),
    queryKey: adminCurriculumQueryKey(programId),
    staleTime: 30 * 1000,
  });
};
