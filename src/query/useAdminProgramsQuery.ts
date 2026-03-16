import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramDetail, fetchAdminPrograms } from '@/api/adminConsole';
import type { AdminProgramFormat, AdminProgramStatus } from '@/types/adminConsole';

export const adminProgramsQueryKey = (
  siteKey: string,
  options?: {
    collectionPath?: string | null;
    format?: AdminProgramFormat | 'all';
    query?: string;
    status?: AdminProgramStatus | 'all';
  },
) =>
  [
    'adminPrograms',
    siteKey,
    options?.collectionPath ?? null,
    options?.status ?? 'all',
    options?.format ?? 'all',
    options?.query ?? '',
  ] as const;

export const adminProgramDetailQueryKey = (siteKey: string, programId: string) =>
  ['adminProgramDetail', siteKey, programId] as const;

export const useAdminProgramsQuery = (
  siteKey: string,
  options?: {
    collectionPath?: string | null;
    enabled?: boolean;
    format?: AdminProgramFormat | 'all';
    query?: string;
    status?: AdminProgramStatus | 'all';
  },
) => {
  return useQuery({
    enabled: options?.enabled ?? true,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminPrograms(siteKey, options),
    queryKey: adminProgramsQueryKey(siteKey, options),
    staleTime: 30 * 1000,
  });
};

export const useAdminProgramDetailQuery = (siteKey: string, programId: string | null) => {
  return useQuery({
    enabled: Boolean(programId),
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramDetail(siteKey, programId ?? ''),
    queryKey: adminProgramDetailQueryKey(siteKey, programId ?? ''),
    staleTime: 30 * 1000,
  });
};
