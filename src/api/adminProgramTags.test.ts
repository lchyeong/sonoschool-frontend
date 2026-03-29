import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosGetMock, axiosPutMock } = vi.hoisted(() => {
  return {
    axiosGetMock: vi.fn(),
    axiosPutMock: vi.fn(),
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      get: axiosGetMock,
      put: axiosPutMock,
    },
  };
});

import { fetchAdminProgramTags, replaceAdminProgramTags } from '@/api/adminProgramTags';

describe('admin program tags API', () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('unwraps admin tag master responses', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: [
          {
            active: true,
            createdAt: '2026-03-27T00:00:00Z',
            id: 1,
            name: '복부',
            slug: 'abdomen',
            sortOrder: 1,
            type: 'TOPIC',
            updatedAt: '2026-03-27T00:00:00Z',
          },
        ],
      },
    });

    await expect(fetchAdminProgramTags()).resolves.toEqual([
      {
        active: true,
        createdAt: '2026-03-27T00:00:00Z',
        id: 1,
        name: '복부',
        slug: 'abdomen',
        sortOrder: 1,
        type: 'TOPIC',
        updatedAt: '2026-03-27T00:00:00Z',
      },
    ]);
    expect(axiosGetMock).toHaveBeenCalledWith('/api/v1/admin/tags');
  });

  it('replaces program tags with a full tag id array', async () => {
    axiosPutMock.mockResolvedValue({
      data: {
        data: {
          id: 2001,
          tags: [],
        },
      },
    });

    await replaceAdminProgramTags(2001, [1, 3, 7]);

    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/programs/2001/tags', {
      tagIds: [1, 3, 7],
    });
  });
});
