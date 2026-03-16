import { useQuery } from '@tanstack/react-query';

import { fetchAdminConsole } from '@/api/adminConsole';

export const adminConsoleQueryKey = (siteKey: string) => ['adminConsole', siteKey] as const;

export const useAdminConsoleQuery = (siteKey: string, enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminConsole(siteKey),
    queryKey: adminConsoleQueryKey(siteKey),
    staleTime: 30 * 1000,
  });
};
