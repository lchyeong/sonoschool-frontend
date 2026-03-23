import { useQuery } from '@tanstack/react-query';

import { fetchProgramPage } from '@/api/programCatalog';

export const programPageQueryKey = (path: string) => ['programPage', path] as const;

export const useProgramPageQuery = (path: string) => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchProgramPage(path),
    queryKey: programPageQueryKey(path),
    staleTime: 5 * 60 * 1000,
  });
};
