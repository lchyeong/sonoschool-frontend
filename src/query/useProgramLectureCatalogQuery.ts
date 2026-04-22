import { useQuery } from '@tanstack/react-query';

import { fetchProgramLectureCatalog } from '@/api/programCatalog';

export const programLectureCatalogQueryKey = () => ['programLectureCatalog'] as const;

export const useProgramLectureCatalogQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchProgramLectureCatalog(),
    queryKey: programLectureCatalogQueryKey(),
    staleTime: 5 * 60 * 1000,
  });
};
