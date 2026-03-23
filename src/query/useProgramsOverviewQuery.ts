import { useQuery } from '@tanstack/react-query';

import { fetchProgramsOverview } from '@/api/programCatalog';

export const programsOverviewQueryKey = () => ['programsOverview'] as const;

export const useProgramsOverviewQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchProgramsOverview(),
    queryKey: programsOverviewQueryKey(),
    staleTime: 5 * 60 * 1000,
  });
};
