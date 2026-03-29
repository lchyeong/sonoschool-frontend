import { useQuery } from '@tanstack/react-query';

import { fetchAdminResources } from '@/api/adminResources';

export const adminResourcesQueryKey = () => ['adminResources'] as const;

export const useAdminResourcesQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminResources(),
    queryKey: adminResourcesQueryKey(),
    staleTime: 30 * 1000,
  });
};
