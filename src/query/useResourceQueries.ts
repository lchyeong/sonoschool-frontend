import { useQuery } from '@tanstack/react-query';

import { fetchGlobalResourceDetail, fetchGlobalResources } from '@/api/resources';

export const globalResourcesQueryKey = () => ['globalResources'] as const;
export const globalResourceDetailQueryKey = (resourceId: number | null) =>
  ['globalResourceDetail', resourceId] as const;

export const useGlobalResourcesQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalResources(),
    queryKey: globalResourcesQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useGlobalResourceDetailQuery = (resourceId: number | null) => {
  return useQuery({
    enabled: resourceId !== null && Number.isFinite(resourceId),
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalResourceDetail(resourceId as number),
    queryKey: globalResourceDetailQueryKey(resourceId),
    staleTime: 60 * 1000,
  });
};
