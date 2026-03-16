import { useQuery } from '@tanstack/react-query';

import { fetchSiteNavigation } from '@/api/siteNavigation';

export const siteNavigationQueryKey = (siteKey: string) => ['siteNavigation', siteKey] as const;

export const useSiteNavigationQuery = (siteKey: string) => {
  return useQuery({
    queryKey: siteNavigationQueryKey(siteKey),
    queryFn: () => fetchSiteNavigation(siteKey),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
