import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import ProgramsPage from '@/pages/ProgramsPage/ProgramsPage';

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

const renderProgramsPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProgramsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
});

describe('ProgramsPage', () => {
  it('renders the top-level program hub with course groups and featured lectures', async () => {
    renderProgramsPage();

    expect(
      await screen.findByRole('heading', { name: '소노스쿨 교육과정 전체 보기' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '의사과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '일반과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '온라인과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내과과정 복부 실전 워크숍' })).toBeInTheDocument();
  });
});
