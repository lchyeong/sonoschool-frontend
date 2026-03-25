import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import QnaPage from '@/pages/QnaPage/QnaPage';

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
});
