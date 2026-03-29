import { useQuery } from '@tanstack/react-query';

import { fetchAdminQuizAttempts } from '@/api/adminQuizAttempts';
import { fetchAdminQuizLectureSummaries } from '@/api/adminQuizSummaries';
import { fetchAdminQuiz } from '@/api/adminQuizzes';

export const adminQuizQueryKey = (lectureId: number | null) => ['adminQuiz', lectureId] as const;
export const adminQuizAttemptsQueryKey = (quizId: number | null) =>
  ['adminQuizAttempts', quizId] as const;
export const adminQuizLectureSummariesQueryKey = (programId: number | null) =>
  ['adminQuizLectureSummaries', programId] as const;

export const useAdminQuizQuery = (lectureId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && lectureId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminQuiz(lectureId as number),
    queryKey: adminQuizQueryKey(lectureId),
    staleTime: 30 * 1000,
  });
};

export const useAdminQuizAttemptsQuery = (quizId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && quizId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminQuizAttempts(quizId as number),
    queryKey: adminQuizAttemptsQueryKey(quizId),
    staleTime: 30 * 1000,
  });
};

export const useAdminQuizLectureSummariesQuery = (programId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && programId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminQuizLectureSummaries(programId as number),
    queryKey: adminQuizLectureSummariesQueryKey(programId),
    staleTime: 30 * 1000,
  });
};
