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
      screen.getByRole('heading', {
        name: '현장 중심의 생생한 교육으로,진료 현장에서 바로 응용할 수 있는 실전 초음파 기술을 구현합니다.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('정확한 진단의 시작, 장기를 빠트리지 않는 체계적인 검사'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/국내외 ARDMS 자격을 겸비한 소노그래퍼의 설계 아래,/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '진료의 확신을 완성하는초음파 교육, 소노스쿨' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '소노스쿨이 약속하는 초음파 교육의 기준' }),
    ).toBeInTheDocument();
    expect(screen.getByText('완벽한 스캔:')).toBeInTheDocument();
    expect(screen.getByText('심평원 기준에 맞춘 정확한 결과와 청구 프로세스')).toBeInTheDocument();
    expect(screen.getByText('소노스쿨의 대표과정을 소개합니다.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(screen.getByRole('list', { name: '최신 공지 4개' })).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(
      screen.getByRole('heading', { name: '소노스쿨 국제초음파연수원 오시는길' }),
    ).toBeInTheDocument();
    expect(screen.getByText('건물내 주차장 2시간 무료')).toBeInTheDocument();
    expect(screen.getByText('주변 주차 이용안내')).toBeInTheDocument();
    expect(screen.queryByText('전화번호')).not.toBeInTheDocument();
    expect(screen.queryByText('점심시간')).not.toBeInTheDocument();

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
