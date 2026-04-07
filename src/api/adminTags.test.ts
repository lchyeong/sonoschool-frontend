import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosGetMock, axiosPostMock, axiosPutMock } = vi.hoisted(() => {
  return {
    axiosGetMock: vi.fn(),
    axiosPostMock: vi.fn(),
    axiosPutMock: vi.fn(),
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      get: axiosGetMock,
      post: axiosPostMock,
      put: axiosPutMock,
    },
  };
});

import {
  activateAdminTag,
  createAdminTag,
  deactivateAdminTag,
  fetchAdminTags,
  updateAdminTag,
} from '@/api/adminTags';

describe('admin tags API', () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
    axiosPostMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('unwraps admin tag list responses', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: [
          {
            active: true,
            createdAt: '',
            id: 1,
            name: '복부',
            slug: 'abdomen',
            sortOrder: 1,
            type: 'TOPIC',
            updatedAt: '',
          },
        ],
      },
    });

    await expect(fetchAdminTags()).resolves.toHaveLength(1);
    expect(axiosGetMock).toHaveBeenCalledWith('/api/v1/admin/tags');
  });

  it('sends create payloads with active flag', async () => {
    axiosPostMock.mockResolvedValue({ data: { data: {} } });

    await createAdminTag({
      active: true,
      name: '핸즈온',
      slug: 'hands-on',
      sortOrder: 3,
      type: 'FEATURE',
    });

    expect(axiosPostMock).toHaveBeenCalledWith('/api/v1/admin/tags', {
      active: true,
      name: '핸즈온',
      slug: 'hands-on',
      sortOrder: 3,
      type: 'FEATURE',
    });
  });

  it('sends update and activation endpoints correctly', async () => {
    axiosPutMock.mockResolvedValue({ data: { data: {} } });
    axiosPostMock.mockResolvedValue({ data: { data: {} } });

    await updateAdminTag(4, {
      name: '복부 심화',
      slug: 'abdomen-advanced',
      sortOrder: 2,
      type: 'TOPIC',
    });
    await activateAdminTag(4);
    await deactivateAdminTag(4);

    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/tags/4', {
      name: '복부 심화',
      slug: 'abdomen-advanced',
      sortOrder: 2,
      type: 'TOPIC',
    });
    expect(axiosPostMock).toHaveBeenCalledWith('/api/v1/admin/tags/4/activate');
    expect(axiosPostMock).toHaveBeenCalledWith('/api/v1/admin/tags/4/deactivate');
  });
});
