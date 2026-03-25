import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ResourceDownloadItem, ResourceItem } from '@/types/resource';

export const fetchGlobalResources = async (): Promise<ResourceItem[]> => {
  try {
    return await http.get<ResourceItem[]>('/api/v1/resources');
  } catch (error: unknown) {
    throw toApiError(error, '자료실 목록을 불러오지 못했습니다.');
  }
};

export const fetchGlobalResourceDownload = async (
  resourceId: number,
): Promise<ResourceDownloadItem> => {
  try {
    return await http.get<ResourceDownloadItem>(`/api/v1/resources/${String(resourceId)}/download`);
  } catch (error: unknown) {
    throw toApiError(error, '자료 다운로드 링크를 준비하지 못했습니다.');
  }
};
