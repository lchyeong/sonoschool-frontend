import { useQuery } from '@tanstack/react-query';

import { fetchProgramSearchIndex } from '@/api/programSearch';

export const programSearchIndexQueryKey = () => ['programSearchIndex'] as const;

export const useProgramSearchIndexQuery = () => {
  return useQuery({
    queryKey: programSearchIndexQueryKey(),
    queryFn: () => fetchProgramSearchIndex(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
