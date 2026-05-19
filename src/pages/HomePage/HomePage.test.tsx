import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import HomePage from '@/pages/HomePage/HomePage';

vi.mock('@/pages/HomePage/useHomeLenisScroll', () => ({
  useHomeLenisScroll: vi.fn(),
}));

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

const renderHomePage = (initialEntries: string[] = ['/']) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
    expect(screen.getByRole('link', { name: '과정 자세히 보기' })).toHaveAttribute(
      'href',
      '/programs/abdomen-ultrasound-basic',
    );
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
      await screen.findByRole('heading', { name: '복부 실전 실습예약 마스터' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '복부 실전 실습예약 마스터 썸네일' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '과정 자세히 보기' })).toHaveAttribute(
      'href',
      '/programs/abdomen-hybrid-master',
    );
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

  it('scrolls to the location section when the home location hash is active', async () => {
    const scrollIntoViewSpy = vi.fn();
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    renderHomePage(['/#home-location']);

    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    });
    expect(requestAnimationFrameSpy).toHaveBeenCalled();
  });
});
