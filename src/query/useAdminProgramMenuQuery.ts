import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramMenuDetail, fetchAdminProgramMenuTree } from '@/api/adminConsole';

export const adminProgramMenuTreeQueryKey = () => ['adminProgramMenuTree'] as const;

export const adminProgramMenuDetailQueryKey = (menuId: string) =>
  ['adminProgramMenuDetail', menuId] as const;

export const useAdminProgramMenuTreeQuery = () => {
  return useQuery({
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramMenuTree(),
    queryKey: adminProgramMenuTreeQueryKey(),
    staleTime: 30 * 1000,
  });
};

export const useAdminProgramMenuDetailQuery = (menuId: string | null) => {
  return useQuery({
    enabled: Boolean(menuId),
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramMenuDetail(menuId ?? ''),
    queryKey: adminProgramMenuDetailQueryKey(menuId ?? ''),
    staleTime: 30 * 1000,
  });
};
