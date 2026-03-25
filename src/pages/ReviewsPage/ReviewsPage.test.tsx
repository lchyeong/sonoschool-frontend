import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import ReviewsPage from '@/pages/ReviewsPage/ReviewsPage';

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

describe('ReviewsPage', () => {
  it('aggregates program reviews into the public reviews board', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReviewsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: '교육후기' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: '대표 후기' })).toBeInTheDocument();
    expect(
      await screen.findAllByText(/실습 위주로 진행되어 실제 검사 상황과 비슷하게 연습할 수 있었습니다/),
    ).not.toHaveLength(0);
  });
});
