import { useQuery } from '@tanstack/react-query';

import {
  fetchMyProgramAvailabilityAlertStatus,
  type ProgramAvailabilityAlertStatusResponse,
} from '@/api/programAvailabilityAlerts';
import { useAuthStore } from '@/stores/useAuthStore';

const normalizeProgramIds = (programIds: readonly number[]) => {
  return Array.from(
    new Set(programIds.filter((programId) => Number.isInteger(programId) && programId > 0)),
  ).sort((left, right) => left - right);
};

export const programAvailabilityAlertStatusQueryKey = (programIds: readonly number[]) => {
  return ['programAvailabilityAlerts', 'status', ...normalizeProgramIds(programIds)] as const;
};

export const useProgramAvailabilityAlertStatusQuery = (programIds: readonly number[]) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const normalizedProgramIds = normalizeProgramIds(programIds);

  return useQuery<ProgramAvailabilityAlertStatusResponse>({
    enabled: isAuthenticated && normalizedProgramIds.length > 0,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchMyProgramAvailabilityAlertStatus(normalizedProgramIds),
    queryKey: programAvailabilityAlertStatusQueryKey(normalizedProgramIds),
    staleTime: 30 * 1000,
  });
};
