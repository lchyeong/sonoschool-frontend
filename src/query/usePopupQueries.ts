import { useQuery } from '@tanstack/react-query';

import { fetchAdminPopups, fetchGlobalPopups } from '@/api/popups';

export const globalPopupsQueryKey = () => ['globalPopups'] as const;
export const adminPopupsQueryKey = () => ['adminPopups'] as const;

export const useGlobalPopupsQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalPopups(),
    queryKey: globalPopupsQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useAdminPopupsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminPopups(),
    queryKey: adminPopupsQueryKey(),
    staleTime: 30 * 1000,
  });
};
