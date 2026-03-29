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

import { fetchAdminQuiz, updateAdminQuiz } from '@/api/adminQuizzes';

describe('admin quizzes API', () => {
  beforeEach(() => {
    axiosDeleteMock.mockReset();
    axiosGetMock.mockReset();
    axiosPostMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('unwraps an admin quiz response', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: {
          description: '기본 개념 점검',
          id: 8001,
          lectureId: 9101,
          passScore: 60,
          questions: [],
          title: '오리엔테이션 퀴즈',
        },
        timestamp: '2026-03-28T00:00:00Z',
      },
    });

    await expect(fetchAdminQuiz(9101)).resolves.toEqual({
      description: '기본 개념 점검',
      id: 8001,
      lectureId: 9101,
      passScore: 60,
      questions: [],
      title: '오리엔테이션 퀴즈',
    });
    expect(axiosGetMock).toHaveBeenCalledWith('/api/v1/admin/lectures/9101/quiz');
  });

  it('returns null when the lecture quiz does not exist yet', async () => {
    axiosGetMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
      },
    });

    await expect(fetchAdminQuiz(9102)).resolves.toBeNull();
  });

  it('normalizes blank descriptions on quiz update', async () => {
    axiosPutMock.mockResolvedValue({
      data: {
        data: {
          description: null,
          id: 8001,
          lectureId: 9101,
          passScore: 80,
          questions: [],
          title: '기말 퀴즈',
        },
        timestamp: '2026-03-28T00:00:00Z',
      },
    });

    await updateAdminQuiz(8001, {
      description: '  ',
      passScore: 80,
      questions: [
        {
          explanation: '  ',
          mediaAssetId: null,
          mediaType: null,
          mediaUrl: null,
          options: [
            {
              correct: true,
              mediaType: null,
              mediaUrl: null,
              optionText: ' 정답 보기 ',
              sortOrder: 0,
            },
          ],
          questionText: ' 문항 ',
          questionType: 'SINGLE',
          sortOrder: 0,
        },
      ],
      title: ' 기말 퀴즈 ',
    });

    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/quizzes/8001', {
      description: null,
      passScore: 80,
      questions: [
        {
          explanation: null,
          mediaAssetId: null,
          mediaType: null,
          mediaUrl: null,
          options: [
            {
              correct: true,
              mediaType: null,
              mediaUrl: null,
              optionText: '정답 보기',
              sortOrder: 0,
            },
          ],
          questionText: '문항',
          questionType: 'SINGLE',
          sortOrder: 0,
        },
      ],
      title: '기말 퀴즈',
    });
  });
});
