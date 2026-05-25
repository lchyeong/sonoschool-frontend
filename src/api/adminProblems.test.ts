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

import { reorderAdminProblemQuestions } from '@/api/adminProblems';

describe('admin problems API', () => {
  beforeEach(() => {
    axiosDeleteMock.mockReset();
    axiosGetMock.mockReset();
    axiosPostMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('sends question reorder payloads unchanged', async () => {
    axiosPutMock.mockResolvedValue({});

    await reorderAdminProblemQuestions(77, [
      { id: 102, sortOrder: 0 },
      { id: 101, sortOrder: 1 },
    ]);

    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/problems/77/questions/reorder', {
      items: [
        { id: 102, sortOrder: 0 },
        { id: 101, sortOrder: 1 },
      ],
    });
  });
});
