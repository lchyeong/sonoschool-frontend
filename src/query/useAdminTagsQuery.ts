import { useQuery } from '@tanstack/react-query';

import { fetchAdminTags } from '@/api/adminTags';

export const adminTagsQueryKey = () => ['adminTags'] as const;

export const useAdminTagsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminTags(),
    queryKey: adminTagsQueryKey(),
    staleTime: 5 * 60 * 1000,
  });
};
