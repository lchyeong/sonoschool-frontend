import { useQuery } from '@tanstack/react-query';

import { fetchGlobalResources } from '@/api/resources';

export const globalResourcesQueryKey = () => ['globalResources'] as const;

export const useGlobalResourcesQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalResources(),
    queryKey: globalResourcesQueryKey(),
    staleTime: 60 * 1000,
  });
};
