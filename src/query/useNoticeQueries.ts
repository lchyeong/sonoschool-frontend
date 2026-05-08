import { useQuery } from '@tanstack/react-query';

import { fetchAdminNotices, fetchGlobalNotices, fetchNoticeDetail } from '@/api/notices';

export const globalNoticesQueryKey = () => ['globalNotices'] as const;
export const noticeDetailQueryKey = (noticeSlug: string | null) =>
  ['noticeDetail', noticeSlug] as const;
export const adminNoticesQueryKey = () => ['adminNotices'] as const;

export const useGlobalNoticesQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalNotices(),
    queryKey: globalNoticesQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useNoticeDetailQuery = (noticeSlug: string | null) => {
  return useQuery({
    enabled: noticeSlug !== null && noticeSlug.length > 0,
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchNoticeDetail(noticeSlug as string),
    queryKey: noticeDetailQueryKey(noticeSlug),
    staleTime: 60 * 1000,
  });
};

export const useAdminNoticesQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminNotices(),
    queryKey: adminNoticesQueryKey(),
    staleTime: 30 * 1000,
  });
};
