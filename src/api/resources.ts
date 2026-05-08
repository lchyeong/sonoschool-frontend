import axios from 'axios';

import axiosInstance from '@/api/axiosInstance';
import { ApiError, toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ResourceItem } from '@/types/resource';

export const fetchGlobalResources = async (): Promise<ResourceItem[]> => {
  try {
    return await http.get<ResourceItem[]>('/api/v1/resources');
  } catch (error: unknown) {
    throw toApiError(error, '자료실 목록을 불러오지 못했습니다.');
  }
};

export const fetchGlobalResourceDetail = async (resourceSlug: string): Promise<ResourceItem> => {
  try {
    return await http.get<ResourceItem>(`/api/v1/resources/${encodeURIComponent(resourceSlug)}`);
  } catch (error: unknown) {
    throw toApiError(error, '자료 상세를 불러오지 못했습니다.');
  }
};

const RESOURCE_DOWNLOAD_ERROR_MESSAGE =
  '자료 파일을 다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const resolveDownloadErrorMessage = async (error: unknown): Promise<string> => {
  if (!axios.isAxiosError(error)) {
    return RESOURCE_DOWNLOAD_ERROR_MESSAGE;
  }

  const headers = error.response?.headers as Record<string, unknown> | undefined;
  const contentType =
    typeof headers?.['content-type'] === 'string' ? headers['content-type'].toLowerCase() : '';
  const payload: unknown = error.response?.data;

  try {
    if (payload instanceof Blob) {
      const text = await payload.text();
      if (!text.trim()) {
        return RESOURCE_DOWNLOAD_ERROR_MESSAGE;
      }

      if (contentType.includes('application/json')) {
        const parsed = JSON.parse(text) as { message?: unknown };
        return typeof parsed.message === 'string' && parsed.message.trim()
          ? parsed.message.trim()
          : RESOURCE_DOWNLOAD_ERROR_MESSAGE;
      }

      return text.trim();
    }

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;
      return typeof message === 'string' && message.trim()
        ? message.trim()
        : RESOURCE_DOWNLOAD_ERROR_MESSAGE;
    }

    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }
  } catch {
    return RESOURCE_DOWNLOAD_ERROR_MESSAGE;
  }

  return RESOURCE_DOWNLOAD_ERROR_MESSAGE;
};

const downloadFile = async (url: string, fileName: string): Promise<void> => {
  try {
    const response = await axiosInstance.get<Blob>(url, {
      responseType: 'blob',
    });
    saveBlobAsFile(response.data, fileName);
  } catch (error: unknown) {
    throw new ApiError({
      cause: error,
      status: axios.isAxiosError(error) ? (error.response?.status ?? null) : null,
      userMessage: await resolveDownloadErrorMessage(error),
    });
  }
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
  resourceSlug: string,
  fileName: string,
): Promise<void> => {
  await downloadFile(`/api/v1/resources/${encodeURIComponent(resourceSlug)}/download`, fileName);
};

export const downloadProgramResourceFile = async (
  programId: number,
  documentId: number,
  fileName: string,
): Promise<void> => {
  await downloadFile(
    `/api/v1/programs/${String(programId)}/resources/${String(documentId)}/download`,
    fileName,
  );
};
