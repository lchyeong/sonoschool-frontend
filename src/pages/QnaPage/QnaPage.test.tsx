import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import QnaPage from '@/pages/QnaPage/QnaPage';
import { clearStudentSession, setStudentSession } from '@/stores/useAuthStore';

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
};

afterEach(() => {
  clearStudentSession();
  cleanup();
});

describe('QnaPage', () => {
  it('renders live global qna items instead of the placeholder page', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <QnaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: '운영 Q&A' })).toBeInTheDocument();
    expect(
      await screen.findByText('회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?'),
    ).toBeInTheDocument();
    expect(await screen.findByText('결제 영수증은 어디에서 확인하나요?')).toBeInTheDocument();
  });

  it('submits a secret global qna from the checkbox writer', async () => {
    setStudentSession({
      accessToken: 'test-token',
      displayName: '테스트회원',
      expiresAt: '2999-12-31T23:59:59Z',
      loginId: 'student-test',
      role: 'ROLE_STUDENT',
      tokenType: 'Bearer',
    });
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <QnaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '질문 작성' }));
    fireEvent.change(screen.getByLabelText('질문 제목'), {
      target: { value: '비밀글 등록 테스트' },
    });
    fireEvent.change(screen.getByLabelText('질문 내용'), {
      target: { value: '비밀글 등록이 버튼 클릭으로 동작해야 합니다.' },
    });
    fireEvent.click(screen.getByLabelText('비밀글로 등록'));
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));

    await waitFor(() => {
      expect(screen.getByText('비밀글 등록 테스트')).toBeInTheDocument();
    });
    expect(screen.getByText('비밀글')).toBeInTheDocument();
  });
});
