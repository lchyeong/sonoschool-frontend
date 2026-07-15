import { describe, expect, it } from 'vitest';

import type { ProgramCatalogStatus, ProgramLectureCard } from '@/types/programCatalog';

import {
  classifyProgramHubLecture,
  type ProgramHubLectureCategory,
} from './programHubLectureClassification';

const NOW_TIME = Date.parse('2026-07-11T00:00:00.000Z');

const createLecture = (overrides: Partial<ProgramLectureCard> = {}): ProgramLectureCard => {
  return {
    categoryLabel: '테스트 과정',
    difficultyLabel: '입문',
    durationLabel: '4주',
    formatLabel: '오프라인',
    id: 'test-lecture',
    priceLabel: '100,000원',
    scheduleLabel: '상시 모집',
    summary: '분류 테스트 강의입니다.',
    thumbnailAlt: '테스트 강의 썸네일',
    thumbnailSrc: '/SRDMS_OG.png',
    title: '테스트 강의',
    to: '/programs/test-lecture',
    ...overrides,
  };
};

describe('classifyProgramHubLecture', () => {
  it.each<ProgramCatalogStatus>(['CLOSED', 'STARTED', 'ENDED', 'FULL'])(
    '%s 상태는 수강 진행 여부와 관계없이 신청 마감으로 분류한다',
    (catalogStatus) => {
      const lecture = createLecture({
        catalogStatus,
        learningEndAt: '2026-01-01T00:00:00.000Z',
      });

      expect(classifyProgramHubLecture(lecture, NOW_TIME)).toBe('closed');
    },
  );

  it('개강 후에도 모집 기간인 강의는 모집 중으로 분류한다', () => {
    const lecture = createLecture({
      catalogStatus: 'STARTED',
      enrollmentAvailable: true,
      learningEndAt: '2026-08-31T23:59:59.000Z',
      saleEndAt: '2026-08-15T23:59:59.000Z',
      saleStartAt: '2026-07-01T00:00:00.000Z',
    });

    expect(classifyProgramHubLecture(lecture, NOW_TIME)).toBe('recruiting');
  });

  it('신청 종료일이 지난 OPEN 강의도 신청 마감으로 보정한다', () => {
    const lecture = createLecture({
      catalogStatus: 'OPEN',
      saleEndAt: '2026-07-10T23:59:59.000Z',
      saleStartAt: '2026-07-01T00:00:00.000Z',
      scheduleLabel: '2026.07.01 - 2026.07.10',
    });

    expect(classifyProgramHubLecture(lecture, NOW_TIME)).toBe('closed');
  });

  it('신청 시작 전이어도 OPEN 상태인 기간제 강의는 모집 중으로 분류한다', () => {
    const futureOpenLecture = createLecture({
      catalogStatus: 'OPEN',
      saleEndAt: '2026-08-31T23:59:59.000Z',
      saleStartAt: '2026-08-01T00:00:00.000Z',
      scheduleLabel: '2026.08.01 - 2026.08.31',
    });

    expect(classifyProgramHubLecture(futureOpenLecture, NOW_TIME)).toBe('recruiting');
  });

  it('날짜가 없는 OPEN 강의는 문구와 무관하게 상시 모집으로 분류한다', () => {
    const lecture = createLecture({
      catalogStatus: 'OPEN',
      saleEndAt: null,
      saleStartAt: null,
      scheduleLabel: '모집 일정 추후 안내',
    });

    expect(classifyProgramHubLecture(lecture, NOW_TIME)).toBe('alwaysRecruiting');
  });

  it('API 날짜가 없으면 일정 문구의 종료일로 모집 중·마감을 판정한다', () => {
    const lecture = createLecture({
      catalogStatus: 'OPEN',
      saleEndAt: null,
      saleStartAt: null,
      scheduleLabel: '2026.08.01 - 2026.08.31',
    });

    expect(classifyProgramHubLecture(lecture, NOW_TIME)).toBe('recruiting');
    expect(classifyProgramHubLecture(lecture, Date.parse('2026-08-15T00:00:00.000Z'))).toBe(
      'recruiting',
    );
    expect(classifyProgramHubLecture(lecture, Date.parse('2026-09-01T00:00:00.000Z'))).toBe(
      'closed',
    );
  });

  it('모든 카탈로그 상태를 정확히 하나의 세부 탭으로 분류한다', () => {
    const expectedCategories: Record<ProgramCatalogStatus, ProgramHubLectureCategory> = {
      CLOSED: 'closed',
      ENDED: 'closed',
      FULL: 'closed',
      OPEN: 'alwaysRecruiting',
      STARTED: 'closed',
    };

    Object.entries(expectedCategories).forEach(([catalogStatus, expectedCategory]) => {
      expect(
        classifyProgramHubLecture(
          createLecture({ catalogStatus: catalogStatus as ProgramCatalogStatus }),
          NOW_TIME,
        ),
      ).toBe(expectedCategory);
    });
  });
});
