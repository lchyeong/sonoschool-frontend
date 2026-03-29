import { useQuery } from '@tanstack/react-query';

import { searchAdminUsers } from '@/api/adminUsers';

export const adminUserSearchQueryKey = (keyword: string) => ['adminUserSearch', keyword] as const;

export const useAdminUserSearchQuery = (keyword: string) => {
  return useQuery({
    enabled: keyword.trim().length >= 2,
    gcTime: 60 * 1000,
    queryFn: () => searchAdminUsers(keyword.trim()),
    queryKey: adminUserSearchQueryKey(keyword.trim()),
    staleTime: 15 * 1000,
  });
};
