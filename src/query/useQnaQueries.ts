import { useQuery } from '@tanstack/react-query';

import { fetchAdminQuestions, fetchGlobalQuestions, type AdminQuestionFilters } from '@/api/qna';

export const globalQuestionsQueryKey = () => ['globalQuestions'] as const;
export const adminQuestionsQueryKey = (filters?: AdminQuestionFilters) =>
  filters ? (['adminQuestions', filters] as const) : (['adminQuestions'] as const);

export const useGlobalQuestionsQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalQuestions(),
    queryKey: globalQuestionsQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useAdminQuestionsQuery = (filters?: AdminQuestionFilters, enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminQuestions(filters),
    queryKey: adminQuestionsQueryKey(filters),
    staleTime: 30 * 1000,
  });
};
