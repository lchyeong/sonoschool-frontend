import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosDeleteMock, axiosGetMock, axiosPostMock, axiosPutMock } = vi.hoisted(() => {
  return {
    axiosDeleteMock: vi.fn(),
    axiosGetMock: vi.fn(),
    axiosPostMock: vi.fn(),
    axiosPutMock: vi.fn(),
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      delete: axiosDeleteMock,
      get: axiosGetMock,
      post: axiosPostMock,
      put: axiosPutMock,
    },
  };
});

import {
  createAdminResource,
  deleteAdminResource,
  fetchAdminResources,
  updateAdminResource,
} from '@/api/adminResources';

describe('admin resources API', () => {
  beforeEach(() => {
    axiosDeleteMock.mockReset();
    axiosGetMock.mockReset();
    axiosPostMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('unwraps admin resource list responses', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: [
          {
            createdAt: '',
            description: '',
            fileName: 'guide.pdf',
            fileSize: 1234,
            fileUrl: 'https://example.com/guide.pdf',
            id: 1,
            lectureId: null,
            lectureTitle: null,
            mimeType: 'application/pdf',
            programId: null,
            programTitle: null,
            scope: 'GLOBAL',
            sortOrder: 0,
            title: '가이드',
            visibility: 'PUBLIC',
          },
        ],
      },
    });

    await expect(fetchAdminResources()).resolves.toHaveLength(1);
    expect(axiosGetMock).toHaveBeenCalledWith('/api/v1/admin/resources');
  });

  it('sends create and update payloads correctly', async () => {
    const payload = {
      description: '설명',
      fileName: 'guide.pdf',
      lectureId: 9101,
      mediaAssetId: 99,
      programId: 12,
      scope: 'PROGRAM' as const,
      sortOrder: 3,
      title: '핸드북',
      visibility: 'ENROLLED_ONLY' as const,
    };

    axiosPostMock.mockResolvedValue({ data: { data: {} } });
    axiosPutMock.mockResolvedValue({ data: { data: {} } });

    await createAdminResource(payload);
    await updateAdminResource(7, payload);

    expect(axiosPostMock).toHaveBeenCalledWith('/api/v1/admin/resources', payload);
    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/resources/7', payload);
  });

  it('calls the delete endpoint', async () => {
    axiosDeleteMock.mockResolvedValue({});

    await deleteAdminResource(9);

    expect(axiosDeleteMock).toHaveBeenCalledWith('/api/v1/admin/resources/9');
  });
});
