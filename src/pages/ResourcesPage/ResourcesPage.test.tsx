import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import ResourcesPage from '@/pages/ResourcesPage/ResourcesPage';

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

describe('ResourcesPage', () => {
  it('renders live resource items instead of the placeholder page', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: '자료실' })).toBeInTheDocument();
    expect(await screen.findByText('2026 상반기 과정 일정표')).toBeInTheDocument();
    expect(await screen.findByText('오프라인 실습 준비 체크리스트')).toBeInTheDocument();
  });
});
