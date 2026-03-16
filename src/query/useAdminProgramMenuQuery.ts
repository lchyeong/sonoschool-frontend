import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramMenuDetail, fetchAdminProgramMenuTree } from '@/api/adminConsole';

export const adminProgramMenuTreeQueryKey = (siteKey: string) =>
  ['adminProgramMenuTree', siteKey] as const;

export const adminProgramMenuDetailQueryKey = (siteKey: string, menuId: string) =>
  ['adminProgramMenuDetail', siteKey, menuId] as const;

export const useAdminProgramMenuTreeQuery = (siteKey: string) => {
  return useQuery({
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramMenuTree(siteKey),
    queryKey: adminProgramMenuTreeQueryKey(siteKey),
    staleTime: 30 * 1000,
  });
};

export const useAdminProgramMenuDetailQuery = (siteKey: string, menuId: string | null) => {
  return useQuery({
    enabled: Boolean(menuId),
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramMenuDetail(siteKey, menuId ?? ''),
    queryKey: adminProgramMenuDetailQueryKey(siteKey, menuId ?? ''),
    staleTime: 30 * 1000,
  });
};
