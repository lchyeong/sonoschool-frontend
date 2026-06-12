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

import { createAdminProblem, reorderAdminProblemQuestions } from '@/api/adminProblems';
import type { AdminProblemUpsertPayload } from '@/types/adminProblems';

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

  it('normalizes nullable question and option collections before create', async () => {
    const payload = {
      passScore: 80,
      problemAreaId: 1,
      questions: [
        null,
        {
          explanation: ' 설명 ',
          mediaAssetId: null,
          mediaType: null,
          mediaUrl: '',
          mediaVideoId: null,
          options: [
            null,
            {
              correct: null,
              mediaType: null,
              mediaUrl: null,
              optionText: null,
              sortOrder: null,
            },
          ],
          problemAreaId: 3,
          questionText: null,
          questionType: 'SINGLE',
          sortOrder: null,
        },
      ],
      retakeAllowed: null,
      title: null,
    } as unknown as AdminProblemUpsertPayload;
    axiosPostMock.mockResolvedValue({ data: { data: {} } });

    await createAdminProblem(15, payload);

    const requestPayload = axiosPostMock.mock.calls[0]?.[1] as AdminProblemUpsertPayload;
    expect(requestPayload.title).toBe('');
    expect(requestPayload.retakeAllowed).toBe(false);
    expect(requestPayload.questions).toHaveLength(1);
    expect(requestPayload.questions[0]?.questionText).toBe('');
    expect(requestPayload.questions[0]?.options).toEqual([
      {
        correct: false,
        mediaType: null,
        mediaUrl: null,
        optionText: '',
        sortOrder: 0,
      },
    ]);
  });
});
