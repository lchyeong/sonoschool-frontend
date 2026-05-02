import { useQuery } from '@tanstack/react-query';

import { fetchAdminProblemAreas } from '@/api/adminProblemAreas';

export const adminProblemAreasQueryKey = (activeOnly = false) =>
  ['adminProblemAreas', activeOnly] as const;

export const useAdminProblemAreasQuery = (activeOnly = false, enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProblemAreas(activeOnly),
    queryKey: adminProblemAreasQueryKey(activeOnly),
    staleTime: 30 * 1000,
  });
};
