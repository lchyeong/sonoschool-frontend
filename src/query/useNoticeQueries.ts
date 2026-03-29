import { useQuery } from '@tanstack/react-query';

import {
  fetchAdminNotices,
  fetchAdminPopups,
  fetchGlobalNotices,
  fetchGlobalPopups,
  fetchNoticeDetail,
} from '@/api/notices';

export const globalNoticesQueryKey = () => ['globalNotices'] as const;
export const globalPopupsQueryKey = () => ['globalPopups'] as const;
export const noticeDetailQueryKey = (noticeId: number | null) =>
  ['noticeDetail', noticeId] as const;
export const adminNoticesQueryKey = () => ['adminNotices'] as const;
export const adminPopupsQueryKey = () => ['adminPopups'] as const;

export const useGlobalNoticesQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalNotices(),
    queryKey: globalNoticesQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useGlobalPopupsQuery = () => {
  return useQuery({
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchGlobalPopups(),
    queryKey: globalPopupsQueryKey(),
    staleTime: 60 * 1000,
  });
};

export const useNoticeDetailQuery = (noticeId: number | null) => {
  return useQuery({
    enabled: noticeId !== null && Number.isFinite(noticeId),
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchNoticeDetail(noticeId as number),
    queryKey: noticeDetailQueryKey(noticeId),
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

export const useAdminPopupsQuery = (enabled = true) => {
  return useQuery({
    enabled,
    gcTime: 5 * 60 * 1000,
    queryFn: () => fetchAdminPopups(),
    queryKey: adminPopupsQueryKey(),
    staleTime: 30 * 1000,
  });
};
