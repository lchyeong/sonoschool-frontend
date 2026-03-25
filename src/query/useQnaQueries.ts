import { useQuery } from '@tanstack/react-query';

import { fetchAdminQuestions, fetchGlobalQuestions, fetchProgramQuestions } from '@/api/qna';

export const globalQuestionsQueryKey = () => ['globalQuestions'] as const;
export const programQuestionsQueryKey = (programId: number | null) =>
  ['programQuestions', programId] as const;
export const adminQuestionsQueryKey = () => ['adminQuestions'] as const;

export const useGlobalQuestionsQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalQuestions(),
    queryKey: globalQuestionsQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useProgramQuestionsQuery = (programId: number | null) => {
  return useQuery({
    enabled: programId !== null && Number.isFinite(programId),
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchProgramQuestions(programId as number),
    queryKey: programQuestionsQueryKey(programId),
    staleTime: 60 * 1000,
  });
};

export const useAdminQuestionsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminQuestions(),
    queryKey: adminQuestionsQueryKey(),
    staleTime: 30 * 1000,
  });
};
