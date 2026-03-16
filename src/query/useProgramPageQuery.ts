import { useQuery } from '@tanstack/react-query';

import { fetchProgramPage } from '@/api/programCatalog';

export const programPageQueryKey = (siteKey: string, path: string) =>
  ['programPage', siteKey, path] as const;

export const useProgramPageQuery = (siteKey: string, path: string) => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchProgramPage(siteKey, path),
    queryKey: programPageQueryKey(siteKey, path),
    staleTime: 5 * 60 * 1000,
  });
};
