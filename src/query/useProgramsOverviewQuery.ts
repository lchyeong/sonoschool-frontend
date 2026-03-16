import { useQuery } from '@tanstack/react-query';

import { fetchProgramsOverview } from '@/api/programCatalog';

export const programsOverviewQueryKey = (siteKey: string) => ['programsOverview', siteKey] as const;

export const useProgramsOverviewQuery = (siteKey: string) => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchProgramsOverview(siteKey),
    queryKey: programsOverviewQueryKey(siteKey),
    staleTime: 5 * 60 * 1000,
  });
};
