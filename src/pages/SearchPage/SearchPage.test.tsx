import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import SearchPage from '@/pages/SearchPage/SearchPage';

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

const renderSearchPage = (initialEntry = '/search?q=예비방사선사') => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
});

describe('SearchPage', () => {
  it('filters search results by title and description keywords', async () => {
    renderSearchPage();

    expect(
      await screen.findByRole('heading', { name: '예비방사선사 4주집중코스' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '복부 Basic 스캔 6주' })).not.toBeInTheDocument();
  });

  it('filters search results by selected scope', async () => {
    renderSearchPage('/search?scope=review&q=후기');

    expect(screen.getByRole('searchbox', { name: '교육후기 검색' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: '복부 초음파 과정 수강 후기 모음' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '응급실 POCUS FAST 집중 마스터 클래스' }),
    ).not.toBeInTheDocument();
  });

  it('can find same-title cohort lectures by their schedule text in the description', async () => {
    renderSearchPage('/search?q=2026년%205월');

    expect(await screen.findByRole('heading', { name: '복부 Basic 스캔 6주' })).toBeInTheDocument();
    expect(
      screen.getByText('2026년 5월부터 6월까지 진행하는 복부 Basic 스캔 6주 정규 기수입니다.'),
    ).toBeInTheDocument();
  });
});
