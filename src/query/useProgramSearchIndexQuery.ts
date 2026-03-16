import { useQuery } from '@tanstack/react-query';

import { fetchProgramSearchIndex } from '@/api/programSearch';

export const programSearchIndexQueryKey = (siteKey: string) =>
  ['programSearchIndex', siteKey] as const;

export const useProgramSearchIndexQuery = (siteKey: string) => {
  return useQuery({
    queryKey: programSearchIndexQueryKey(siteKey),
    queryFn: () => fetchProgramSearchIndex(siteKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
