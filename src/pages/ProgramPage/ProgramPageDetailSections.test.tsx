import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProgramDetailPageResponse } from '@/types/programCatalog';

import { ProgramPageDetailSidebar } from './ProgramPageDetailSections';

const createDetailData = (
  overrides: Partial<ProgramDetailPageResponse> = {},
): ProgramDetailPageResponse => ({
  pageKind: 'detail',
  title: '테스트 강의',
  description: '강의 설명',
  kicker: '테스트',
  heroImageSrc: '/test.jpg',
  heroImageAlt: '테스트 이미지',
  breadcrumbItems: [{ label: '교육과정', to: '/programs' }],
  categoryLabel: '일반과정',
  formatLabel: '온라인',
  durationLabel: '4주',
  difficultyLabel: '입문',
  tuitionLabel: '100,000원',
  originalPriceLabel: '100,000원',
  discountRateLabel: '0%',
  discountedPriceLabel: '100,000원',
  monthlyInstallmentLabel: '월 8,334원 × 12개월',
  registrationPeriodLabel: '상시 모집',
  scheduleLabel: '온라인 상시 수강',
  stats: [{ label: '강의 수', value: '4개' }],
  recommendedFor: ['초보자'],
  curriculumTrack: {
    id: 'track-1',
    sections: [
      {
        id: 'section-1',
        title: '섹션 1',
        description: '섹션 설명',
        durationLabel: '1시간',
        lessons: [
          {
            id: 'lesson-1',
            title: '레슨 1',
            deliveryType: 'online',
            durationLabel: '30분',
            durationMinutes: 30,
            startDate: null,
            endDate: null,
          },
        ],
      },
    ],
    summaryItems: ['요약 1'],
    summaryKind: 'disc',
  },
  preparationChecklist: ['준비물 1'],
  faqItems: [{ id: 'faq-1', question: '질문', answer: '답변' }],
  overallRating: 5,
  reviewCount: 1,
  reviews: [
    {
      id: 'review-1',
      authorName: '수강생',
      rating: 5,
      content: '좋아요',
      dateLabel: '2026.04.01',
    },
  ],
  instructor: {
    name: '강사',
    headline: '전문 강사',
    introduction: '소개',
    profileImageSrc: '/instructor.jpg',
    profileImageAlt: '강사 이미지',
    careerHighlights: ['경력 1'],
  },
  relatedLectures: [],
  ...overrides,
});

describe('ProgramPageDetailSidebar', () => {
  it('할인이 없으면 할인 문구를 렌더링하지 않는다', () => {
    render(
      <ProgramPageDetailSidebar
        availabilityActionKind='ENROLL'
        availabilityActionLabel='수강 신청 하기'
        availabilityStatusDescription='바로 수강할 수 있습니다.'
        availabilityStatusLabel='수강 가능'
        data={createDetailData({ discountRateLabel: '할인없음' })}
        discountedPriceAmount={100000}
        handleAddToCart={vi.fn()}
        handleEnrollNow={vi.fn()}
        handleRequestAvailabilityAlert={vi.fn()}
        isAlertPending={false}
        isAlertSubscribed={false}
        isAuthenticated
        isEnrollingNow={false}
        isAddingToCart={false}
        originalPriceAmount={100000}
        totalPriceLabel='₩100,000'
      />,
    );

    expect(screen.queryByText('할인없음')).not.toBeInTheDocument();
    expect(screen.getByText('₩100,000')).toBeInTheDocument();
    expect(screen.queryByText('100,000원')).not.toBeInTheDocument();
  });

  it('실제 할인이 있으면 할인율과 원가를 함께 보여준다', () => {
    render(
      <ProgramPageDetailSidebar
        availabilityActionKind='ENROLL'
        availabilityActionLabel='수강 신청 하기'
        availabilityStatusDescription='바로 수강할 수 있습니다.'
        availabilityStatusLabel='수강 가능'
        data={createDetailData({ discountRateLabel: '17%' })}
        discountedPriceAmount={100000}
        handleAddToCart={vi.fn()}
        handleEnrollNow={vi.fn()}
        handleRequestAvailabilityAlert={vi.fn()}
        isAlertPending={false}
        isAlertSubscribed={false}
        isAuthenticated
        isEnrollingNow={false}
        isAddingToCart={false}
        originalPriceAmount={120000}
        totalPriceLabel='₩100,000'
      />,
    );

    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getAllByText('₩100,000').length).toBeGreaterThan(1);
    expect(screen.getByText('₩120,000')).toBeInTheDocument();
  });
});
