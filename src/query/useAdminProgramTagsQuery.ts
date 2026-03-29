import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramTags } from '@/api/adminProgramTags';

export const adminProgramTagsQueryKey = () => ['adminProgramTags'] as const;

export const useAdminProgramTagsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramTags(),
    queryKey: adminProgramTagsQueryKey(),
    staleTime: 5 * 60 * 1000,
  });
};
