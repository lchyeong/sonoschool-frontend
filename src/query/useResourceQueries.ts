import { useQuery } from '@tanstack/react-query';

import { fetchGlobalResourceDetail, fetchGlobalResources } from '@/api/resources';

export const globalResourcesQueryKey = () => ['globalResources'] as const;
export const globalResourceDetailQueryKey = (resourceSlug: string | null) =>
  ['globalResourceDetail', resourceSlug] as const;

export const useGlobalResourcesQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalResources(),
    queryKey: globalResourcesQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useGlobalResourceDetailQuery = (resourceSlug: string | null) => {
  return useQuery({
    enabled: resourceSlug !== null && resourceSlug.length > 0,
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalResourceDetail(resourceSlug as string),
    queryKey: globalResourceDetailQueryKey(resourceSlug),
    staleTime: 60 * 1000,
  });
};
