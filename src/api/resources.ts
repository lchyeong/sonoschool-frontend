import { ApiError, toApiError } from '@/api/errors';
import { http } from '@/api/http';
import { env } from '@/config/env';
import type { ResourceItem } from '@/types/resource';

export const fetchGlobalResources = async (): Promise<ResourceItem[]> => {
  try {
    return await http.get<ResourceItem[]>('/api/v1/resources');
  } catch (error: unknown) {
    throw toApiError(error, '자료실 목록을 불러오지 못했습니다.');
  }
};

export const fetchGlobalResourceDetail = async (resourceId: number): Promise<ResourceItem> => {
  try {
    return await http.get<ResourceItem>(`/api/v1/resources/${String(resourceId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '자료 상세를 불러오지 못했습니다.');
  }
};

const RESOURCE_DOWNLOAD_ERROR_MESSAGE =
  '자료 파일을 다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const resolveApiUrl = (path: string): string => {
  return env.apiBaseUrl ? new URL(path, env.apiBaseUrl).toString() : path;
};

const resolveDownloadErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { message?: unknown };
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim();
      }
    }

    if (contentType.startsWith('text/')) {
      const text = await response.text();
      if (text.trim()) {
        return text.trim();
      }
    }
  } catch {
    return RESOURCE_DOWNLOAD_ERROR_MESSAGE;
  }

  return RESOURCE_DOWNLOAD_ERROR_MESSAGE;
};

const saveBlobAsFile = (blob: Blob, fileName: string): void => {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new ApiError({
      cause: blob,
      status: null,
      userMessage: '현재 브라우저에서 파일 다운로드를 지원하지 않습니다.',
    });
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};

export const downloadGlobalResourceFile = async (
  resourceId: number,
  fileName: string,
): Promise<void> => {
  const response = await fetch(resolveApiUrl(`/api/v1/resources/${String(resourceId)}/download`), {
    credentials: 'include',
    method: 'GET',
  });

  if (!response.ok) {
    throw new ApiError({
      cause: response,
      status: response.status,
      userMessage: await resolveDownloadErrorMessage(response),
    });
  }

  const blob = await response.blob();
  saveBlobAsFile(blob, fileName);
};

export const downloadProgramResourceFile = async (
  programId: number,
  documentId: number,
  fileName: string,
): Promise<void> => {
  const response = await fetch(
    resolveApiUrl(`/api/v1/programs/${String(programId)}/resources/${String(documentId)}/download`),
    {
      credentials: 'include',
      method: 'GET',
    },
  );

  if (!response.ok) {
    throw new ApiError({
      cause: response,
      status: response.status,
      userMessage: await resolveDownloadErrorMessage(response),
    });
  }

  const blob = await response.blob();
  saveBlobAsFile(blob, fileName);
};
