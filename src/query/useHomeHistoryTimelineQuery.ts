import { useQuery } from '@tanstack/react-query';

import { fetchHomeHistoryTimeline } from '@/api/homeHistoryTimeline';

export const homeHistoryTimelineQueryKey = (siteKey: string) =>
  ['homeHistoryTimeline', siteKey] as const;

export const useHomeHistoryTimelineQuery = (siteKey: string) => {
  return useQuery({
    queryKey: homeHistoryTimelineQueryKey(siteKey),
    queryFn: () => fetchHomeHistoryTimeline(siteKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
