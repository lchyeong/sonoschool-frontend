import { useQuery } from '@tanstack/react-query';

import { fetchAdminCategoriesTree } from '@/api/adminCategories';

export const adminCategoriesTreeQueryKey = () => ['adminCategoriesTree'] as const;

export const useAdminCategoriesTreeQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminCategoriesTree(),
    queryKey: adminCategoriesTreeQueryKey(),
    staleTime: 30 * 1000,
  });
};
