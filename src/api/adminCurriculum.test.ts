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
  createAdminSection,
  fetchAdminCurriculum,
  reorderAdminLectures,
} from '@/api/adminCurriculum';

describe('admin curriculum API', () => {
  beforeEach(() => {
    axiosDeleteMock.mockReset();
    axiosGetMock.mockReset();
    axiosPostMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('unwraps the admin curriculum response', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: [
          {
            description: '기초 이론',
            id: 501,
            lectures: [],
            sortOrder: 0,
            title: '기본 이론',
          },
        ],
        timestamp: '2026-03-27T00:00:00Z',
      },
    });

    await expect(fetchAdminCurriculum(2001)).resolves.toEqual([
      {
        description: '기초 이론',
        id: 501,
        lectures: [],
        sortOrder: 0,
        title: '기본 이론',
      },
    ]);
    expect(axiosGetMock).toHaveBeenCalledWith('/api/v1/admin/programs/2001/sections');
  });

  it('normalizes blank section descriptions to null before create', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          description: null,
          id: 701,
          lectures: [],
          sortOrder: 2,
          title: '복습 섹션',
        },
        timestamp: '2026-03-27T00:00:00Z',
      },
    });

    await createAdminSection(2001, {
      description: '   ',
      sortOrder: 2,
      title: '복습 섹션',
    });

    expect(axiosPostMock).toHaveBeenCalledWith('/api/v1/admin/programs/2001/sections', {
      description: null,
      sortOrder: 2,
      title: '복습 섹션',
    });
  });

  it('sends lecture reorder payloads unchanged', async () => {
    axiosPutMock.mockResolvedValue({});

    await reorderAdminLectures(501, [
      { id: 9002, sortOrder: 0 },
      { id: 9001, sortOrder: 1 },
    ]);

    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/sections/501/lectures/reorder', {
      items: [
        { id: 9002, sortOrder: 0 },
        { id: 9001, sortOrder: 1 },
      ],
    });
  });
});
