import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { ProgramLectureCard } from '@/types/programCatalog';

import { ProgramArchiveLectureCardItem, ProgramLectureCardItem } from './programCatalogShared';

afterEach(() => {
  cleanup();
});

const createLecture = (overrides: Partial<ProgramLectureCard> = {}): ProgramLectureCard => ({
  categoryLabel: '일반과정',
  durationLabel: '상시 수강',
  formatLabel: '온라인 과정',
  id: 'program-1',
  priceLabel: '100,000원',
  scheduleLabel: '상시 모집',
  summary: '테스트 프로그램입니다.',
  thumbnailAlt: '테스트 프로그램 썸네일',
  thumbnailSrc: '/test.jpg',
  title: '테스트 프로그램',
  to: '/programs/test-program',
  ...overrides,
});

describe('program catalog difficulty labels', () => {
  it('일반 카드에서 난이도가 없으면 과정 종류 태그만 렌더링한다', () => {
    const item = createLecture();

    render(
      <MemoryRouter>
        <ProgramLectureCardItem item={item} />
      </MemoryRouter>,
    );

    const article = screen.getByText(item.title).closest('article');

    expect(article).not.toBeNull();
    expect(within(article as HTMLElement).getAllByRole('listitem')).toHaveLength(1);
    expect(within(article as HTMLElement).getByText('온라인 과정')).toBeInTheDocument();
  });

  it('아카이브 카드에서도 난이도가 없으면 과정 종류 태그만 렌더링한다', () => {
    const item = createLecture({ title: '아카이브 테스트 프로그램' });

    render(
      <MemoryRouter>
        <ProgramArchiveLectureCardItem item={item} />
      </MemoryRouter>,
    );

    const article = screen.getByText(item.title).closest('article');

    expect(article).not.toBeNull();
    expect(within(article as HTMLElement).getAllByRole('listitem')).toHaveLength(1);
    expect(within(article as HTMLElement).getByText('온라인 과정')).toBeInTheDocument();
  });

  it('난이도가 있으면 과정 종류와 함께 유지한다', () => {
    const item = createLecture({ difficultyLabel: '입문' });

    render(
      <MemoryRouter>
        <ProgramLectureCardItem item={item} />
      </MemoryRouter>,
    );

    const article = screen.getByText(item.title).closest('article');

    expect(article).not.toBeNull();
    expect(within(article as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
    expect(within(article as HTMLElement).getByText('입문')).toBeInTheDocument();
    expect(within(article as HTMLElement).getByText('온라인 과정')).toBeInTheDocument();
  });
});
