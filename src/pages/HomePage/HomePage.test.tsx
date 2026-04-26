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
        name: '임상 초음파 코어 루틴 & 국제 자격 준비 집중 과정',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: '임상 초음파 코어 루틴 & 국제 자격 준비 집중 과정 소개 이미지',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('searchbox', { name: '강의 프로그램 검색' }).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByRole('heading', { name: /SINCE 2003 의사교육전문 국제자격보유/i }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: '소노스쿨 교육 현장 이미지 5개' })).getAllByRole(
        'img',
      ),
    ).toHaveLength(5);
    expect(
      (await screen.findAllByRole('list', { name: '소노스쿨 연혁 타임라인' })).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('COURSE PREVIEW')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '전체 강의 살펴보기' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '1페이지' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('heading', { name: '공지사항' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지사항 게시판 보기' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: '최신 공지 4개' })).getAllByRole('listitem'),
    ).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: '다음 메인 슬라이드' }));

    expect(
      await screen.findByRole('heading', { name: '응급실 POCUS FAST 집중 마스터 클래스' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '응급실 POCUS FAST 강의 썸네일 예시' }),
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
    expect(screen.getAllByRole('searchbox', { name: '강의 프로그램 검색' }).length).toBeGreaterThan(
      0,
    );
    expect(
      (await screen.findAllByRole('list', { name: '소노스쿨 연혁 타임라인' })).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: '공지사항' }).length).toBeGreaterThan(0);
  });
});
