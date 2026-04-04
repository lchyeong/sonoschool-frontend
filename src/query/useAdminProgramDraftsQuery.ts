import { useQuery } from '@tanstack/react-query';

import { fetchAdminProgramDraft, fetchAdminProgramDrafts } from '@/api/adminProgramDrafts';

export const adminProgramDraftsQueryKey = () => ['adminProgramDrafts'] as const;
export const adminProgramDraftDetailQueryKey = (draftId: number | null) =>
  ['adminProgramDraftDetail', draftId] as const;

export const useAdminProgramDraftsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramDrafts(),
    queryKey: adminProgramDraftsQueryKey(),
    staleTime: 15 * 1000,
  });
};

export const useAdminProgramDraftDetailQuery = (draftId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && draftId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProgramDraft(draftId as number),
    queryKey: adminProgramDraftDetailQueryKey(draftId),
    staleTime: 15 * 1000,
  });
};
