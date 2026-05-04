import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import HomePage from '@/pages/HomePage/HomePage';

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

const renderHomePage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('HomePage', () => {
  it('renders a lecture slide first and moves to the next lecture slide when next is clicked', async () => {
    renderHomePage();

    expect(
      await screen.findByRole('heading', {
        name: '복부초음파 기초',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: '복부초음파 기초 썸네일',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SINCE 2003' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: '소노스쿨 교육 현장 이미지 5개' })).getAllByRole(
        'img',
      ),
    ).toHaveLength(5);
    expect(
      screen.getByRole('heading', { name: '진료의 확신을 완성하는초음파 교육, 소노스쿨' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(screen.getByRole('list', { name: '최신 공지 4개' })).getAllByRole('listitem'),
    ).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: '다음 메인 슬라이드' }));

    expect(
      await screen.findByRole('heading', { name: '복부 실전 하이브리드 마스터' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '복부 실전 하이브리드 마스터 썸네일' }),
    ).toBeInTheDocument();
  });

  it('renders fallback content when home APIs fail', async () => {
    server.use(
      http.get('*/api/v1/home/hero-slides', () => {
        return HttpResponse.json({ message: 'hero failed' }, { status: 500 });
      }),
      http.get('*/api/v1/home/history-timeline', () => {
        return HttpResponse.json({ message: 'timeline failed' }, { status: 500 });
      }),
    );

    renderHomePage();

    expect(await screen.findByText('메인 슬라이드를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getAllByRole('list', { name: '최신 공지 4개' }).length).toBeGreaterThan(0);
  });
});
