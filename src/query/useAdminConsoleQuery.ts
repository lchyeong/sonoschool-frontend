import { useQuery } from '@tanstack/react-query';

import { fetchAdminConsole } from '@/api/adminConsole';

export const adminConsoleQueryKey = () => ['adminConsole'] as const;

export const useAdminConsoleQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminConsole(),
    queryKey: adminConsoleQueryKey(),
    staleTime: 30 * 1000,
  });
};
