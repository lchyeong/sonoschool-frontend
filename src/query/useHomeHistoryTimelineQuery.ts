import { useQuery } from '@tanstack/react-query';

import { fetchHomeHistoryTimeline } from '@/api/homeHistoryTimeline';

export const homeHistoryTimelineQueryKey = () => ['homeHistoryTimeline'] as const;

export const useHomeHistoryTimelineQuery = () => {
  return useQuery({
    queryKey: homeHistoryTimelineQueryKey(),
    queryFn: () => fetchHomeHistoryTimeline(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
