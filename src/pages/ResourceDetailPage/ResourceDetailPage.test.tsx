import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

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

    expect(await screen.findByRole('heading', { level: 1, name: '자료실' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '2026 상반기 과정 일정표' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '첨부파일' })).toBeInTheDocument();
    expect(screen.getByText('sonoschool-2026-schedule.pdf')).toBeInTheDocument();
    expect(screen.getByText('sonoschool-2026-schedule.hwp')).toBeInTheDocument();
    expect(screen.getByText('1.74MB')).toBeInTheDocument();
    expect(screen.getByText('805KB')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBe(3);
    expect(screen.getByRole('button', { name: '모두 다운로드' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'sonoschool-2026-schedule.pdf 다운로드' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('첨부 파일')).not.toBeInTheDocument();
    expect(screen.queryByText('자료 정보')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'sonoschool-2026-schedule.pdf 다운로드' }));

    const dialog = await screen.findByRole('dialog', { name: '자료를 다운로드하시겠어요?' });
    expect(within(dialog).getByText('sonoschool-2026-schedule.pdf')).toBeInTheDocument();
    expect(within(dialog).getByText('PDF')).toBeInTheDocument();
    expect(within(dialog).getByText('1.74MB')).toBeInTheDocument();
    expect(within(dialog).getByText('본 자료는 교육 목적으로 제공되며,')).toBeInTheDocument();
    expect(within(dialog).getByText('무단 배포 및 복제를 금지합니다.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '다운로드' })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(
      screen.queryByRole('dialog', { name: '자료를 다운로드하시겠어요?' }),
    ).not.toBeInTheDocument();
  });
});
