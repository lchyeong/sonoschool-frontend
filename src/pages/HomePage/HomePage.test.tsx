import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

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
        name: '임상 초음파 코어 루틴과 국제 자격 준비 집중 과정',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText('임상 초음파 코어 루틴과 국제 자격 준비 집중 과정 소개 이미지'),
    ).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '강의 프로그램 검색' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /SINCE 2003 의사교육전문 국제자격보유/i }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: '소노스쿨 교육 현장 이미지 5개' })).getAllByRole(
        'img',
      ),
    ).toHaveLength(5);
    expect(await screen.findByRole('list', { name: '소노스쿨 연혁 타임라인' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '교육 후기' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: '대표 교육후기 4개' })).getAllByRole('listitem'),
    ).toHaveLength(4);
    expect(screen.getByRole('heading', { name: '공지사항' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지사항 게시판 보기' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: '최신 공지 3개' })).getAllByRole('listitem'),
    ).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: '다음 메인 슬라이드' }));

    expect(
      await screen.findByRole('heading', { name: '응급실 POCUS FAST 집중 마스터 클래스' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('응급실 POCUS FAST 강의 썸네일 예시')).toBeInTheDocument();
  });
});
