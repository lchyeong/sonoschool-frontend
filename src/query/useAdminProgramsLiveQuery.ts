import { useQuery } from '@tanstack/react-query';

import {
  fetchAdminProgramCategories,
  fetchAdminProgramDetailLive,
  fetchAdminProgramsLive,
} from '@/api/adminProgramsLive';

export const adminProgramsLiveQueryKey = () => ['adminProgramsLive'] as const;
export const adminProgramCategoriesQueryKey = () => ['adminProgramCategories'] as const;
export const adminProgramDetailLiveQueryKey = (programId: number | null) =>
  ['adminProgramDetailLive', programId] as const;

export const useAdminProgramsLiveQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramsLive(),
    queryKey: adminProgramsLiveQueryKey(),
    staleTime: 30 * 1000,
  });
};

export const useAdminProgramCategoriesQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramCategories(),
    queryKey: adminProgramCategoriesQueryKey(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAdminProgramDetailLiveQuery = (programId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && programId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramDetailLive(programId as number),
    queryKey: adminProgramDetailLiveQueryKey(programId),
    staleTime: 30 * 1000,
  });
};
