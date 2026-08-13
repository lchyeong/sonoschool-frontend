import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosDeleteMock, axiosPutMock } = vi.hoisted(() => {
  return {
    axiosDeleteMock: vi.fn(),
    axiosPutMock: vi.fn(),
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      delete: axiosDeleteMock,
      put: axiosPutMock,
    },
  };
});

import { deleteAdminQuestion, updateAdminQuestion, updateAdminQuestionReply } from '@/api/qna';

describe('admin Q&A API', () => {
  beforeEach(() => {
    axiosDeleteMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('uses administrator endpoints for question updates and deletion', async () => {
    axiosPutMock.mockResolvedValue({ data: { data: { id: 31 } } });
    axiosDeleteMock.mockResolvedValue({});

    await updateAdminQuestion(31, {
      content: '수정한 질문 내용',
      title: '수정한 질문 제목',
    });
    await deleteAdminQuestion(31);

    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/qna/31', {
      content: '수정한 질문 내용',
      privateQuestion: false,
      title: '수정한 질문 제목',
    });
    expect(axiosDeleteMock).toHaveBeenCalledWith('/api/v1/admin/qna/31');
  });

  it('updates an existing answer without using the create or delete endpoints', async () => {
    axiosPutMock.mockResolvedValue({ data: { data: { id: 101 } } });

    await updateAdminQuestionReply(101, { content: '수정한 답변' });

    expect(axiosPutMock).toHaveBeenCalledWith('/api/v1/admin/qna/replies/101', {
      content: '수정한 답변',
    });
    expect(axiosDeleteMock).not.toHaveBeenCalled();
  });
});
