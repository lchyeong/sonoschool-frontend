import { useQuery } from '@tanstack/react-query';

import { fetchAdminProblemAttempts } from '@/api/adminProblemAttempts';
import { fetchAdminProblem } from '@/api/adminProblems';
import { fetchAdminProblemLectureSummaries } from '@/api/adminProblemSummaries';

export const adminProblemQueryKey = (lectureId: number | null) =>
  ['adminProblem', lectureId] as const;
export const adminProblemAttemptsQueryKey = (problemId: number | null) =>
  ['adminProblemAttempts', problemId] as const;
export const adminProblemLectureSummariesQueryKey = (programId: number | null) =>
  ['adminProblemLectureSummaries', programId] as const;

export const useAdminProblemQuery = (lectureId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && lectureId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProblem(lectureId as number),
    queryKey: adminProblemQueryKey(lectureId),
    staleTime: 30 * 1000,
  });
};

export const useAdminProblemAttemptsQuery = (problemId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && problemId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProblemAttempts(problemId as number),
    queryKey: adminProblemAttemptsQueryKey(problemId),
    staleTime: 30 * 1000,
  });
};

export const useAdminProblemLectureSummariesQuery = (programId: number | null, enabled = true) => {
  return useQuery({
    enabled: enabled && programId !== null,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminProblemLectureSummaries(programId as number),
    queryKey: adminProblemLectureSummariesQueryKey(programId),
    staleTime: 30 * 1000,
  });
};
