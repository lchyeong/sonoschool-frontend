import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramDetail, fetchAdminPrograms } from '@/api/adminConsole';
import type { AdminProgramFormat, AdminProgramStatus } from '@/types/adminConsole';

export const adminProgramsQueryKey = (
  options?: {
    collectionPath?: string | null;
    format?: AdminProgramFormat | 'all';
    query?: string;
    status?: AdminProgramStatus | 'all';
  },
) =>
  [
    'adminPrograms',
    options?.collectionPath ?? null,
    options?.status ?? 'all',
    options?.format ?? 'all',
    options?.query ?? '',
  ] as const;

export const adminProgramDetailQueryKey = (programId: string) =>
  ['adminProgramDetail', programId] as const;

export const useAdminProgramsQuery = (
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
    queryFn: () => fetchAdminPrograms(options),
    queryKey: adminProgramsQueryKey(options),
    staleTime: 30 * 1000,
  });
};

export const useAdminProgramDetailQuery = (programId: string | null) => {
  return useQuery({
    enabled: Boolean(programId),
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramDetail(programId ?? ''),
    queryKey: adminProgramDetailQueryKey(programId ?? ''),
    staleTime: 30 * 1000,
  });
};
