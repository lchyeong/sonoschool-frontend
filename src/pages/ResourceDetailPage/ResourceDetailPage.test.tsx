import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ResourceDetailPage from '@/pages/ResourceDetailPage/ResourceDetailPage';

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

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('ResourceDetailPage', () => {
  it('renders the selected resource with clickable attachments', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/resources/1']}>
          <Routes>
            <Route element={<ResourceDetailPage />} path='/resources/:resourceId' />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '2026 상반기 과정 일정표' }),
    ).toBeInTheDocument();
    expect(screen.getByText('sonoschool-2026-schedule.pdf')).toBeInTheDocument();
    expect(screen.getByText('sonoschool-2026-schedule.hwp')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBe(2);
    expect(
      screen.getByRole('button', { name: 'sonoschool-2026-schedule.pdf 다운로드' }),
    ).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('HWP')).toBeInTheDocument();
    expect(screen.queryByText('첨부 파일')).not.toBeInTheDocument();
    expect(screen.queryByText('자료 정보')).not.toBeInTheDocument();
  });
});
