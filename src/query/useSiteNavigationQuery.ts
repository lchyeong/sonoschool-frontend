import { useQuery } from '@tanstack/react-query';

import { fetchSiteNavigation } from '@/api/siteNavigation';

export const siteNavigationQueryKey = () => ['siteNavigation'] as const;

export const useSiteNavigationQuery = () => {
  return useQuery({
    queryKey: siteNavigationQueryKey(),
    queryFn: () => fetchSiteNavigation(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
