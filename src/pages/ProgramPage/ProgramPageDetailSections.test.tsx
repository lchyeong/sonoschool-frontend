import { createRef } from 'react';

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProgramDetailPageResponse } from '@/types/programCatalog';

import {
  ProgramPageDetailHero,
  ProgramPageDetailMainContent,
  ProgramPageDetailSidebar,
} from './ProgramPageDetailSections';

afterEach(() => {
  cleanup();
});

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
      authorLoginId: 'stude***',
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
        availabilityActionLabel='수강신청하기'
        availabilityStatusLabel='수강 가능'
        data={createDetailData({ discountRateLabel: '할인없음' })}
        discountedPriceAmount={100000}
        handleAddToCart={vi.fn()}
        handleEnrollNow={vi.fn()}
        handleRequestReservationInquiry={vi.fn()}
        isAddingToCart={false}
        isCartAdded={false}
        isEnrollmentOwned={false}
        isEnrollingNow={false}
        isReservationInquiryAvailable
        isReservationPending={false}
        originalPriceAmount={100000}
        totalPriceLabel='100,000원'
      />,
    );

    expect(screen.queryByText('할인없음')).not.toBeInTheDocument();
    expect(screen.getAllByText('100,000원')).toHaveLength(2);
    expect(screen.queryByText('₩100,000')).not.toBeInTheDocument();
  });

  it('가격 카드에서 신청 상태와 잔여석 문구를 분리해서 보여준다', () => {
    render(
      <ProgramPageDetailSidebar
        availabilityActionKind='ENROLL'
        availabilityActionLabel='수강신청하기'
        availabilityStatusLabel='수강 가능'
        data={createDetailData({ remainingSeatsLabel: '수강 가능 인원 12명 남음' })}
        discountedPriceAmount={100000}
        handleAddToCart={vi.fn()}
        handleEnrollNow={vi.fn()}
        handleRequestReservationInquiry={vi.fn()}
        isAddingToCart={false}
        isCartAdded={false}
        isEnrollmentOwned={false}
        isEnrollingNow={false}
        isReservationInquiryAvailable
        isReservationPending={false}
        originalPriceAmount={100000}
        totalPriceLabel='100,000원'
      />,
    );

    expect(screen.getByText('수강 가능')).toBeInTheDocument();
    expect(screen.getByText('잔여석 12명')).toBeInTheDocument();
    expect(screen.queryByText('수강 가능 인원 12명 남음')).not.toBeInTheDocument();
  });

  it('실제 할인이 있으면 상품 금액과 강의 할인 금액을 함께 보여준다', () => {
    render(
      <ProgramPageDetailSidebar
        availabilityActionKind='ENROLL'
        availabilityActionLabel='수강신청하기'
        availabilityStatusLabel='수강 가능'
        data={createDetailData({ discountRateLabel: '17%' })}
        discountedPriceAmount={100000}
        handleAddToCart={vi.fn()}
        handleEnrollNow={vi.fn()}
        handleRequestReservationInquiry={vi.fn()}
        isAddingToCart={false}
        isCartAdded={false}
        isEnrollmentOwned={false}
        isEnrollingNow={false}
        isReservationInquiryAvailable
        isReservationPending={false}
        originalPriceAmount={120000}
        totalPriceLabel='100,000원'
      />,
    );

    expect(screen.getByText('상품 금액')).toBeInTheDocument();
    expect(screen.getByText('강의 할인')).toBeInTheDocument();
    expect(screen.getByText('-20,000원')).toBeInTheDocument();
    expect(screen.getByText('총 결제 금액')).toBeInTheDocument();
    expect(screen.getByText('100,000원')).toBeInTheDocument();
    expect(screen.getByText('120,000원')).toBeInTheDocument();
  });

  it('모집 중 과정에서 구매 버튼과 예약 문의 버튼을 함께 보여준다', () => {
    render(
      <ProgramPageDetailSidebar
        availabilityActionKind='ENROLL'
        availabilityActionLabel='수강신청하기'
        availabilityStatusLabel='수강 가능'
        data={createDetailData()}
        discountedPriceAmount={100000}
        handleAddToCart={vi.fn()}
        handleEnrollNow={vi.fn()}
        handleRequestReservationInquiry={vi.fn()}
        isAddingToCart={false}
        isCartAdded={false}
        isEnrollmentOwned={false}
        isEnrollingNow={false}
        isReservationInquiryAvailable
        isReservationPending={false}
        originalPriceAmount={100000}
        totalPriceLabel='100,000원'
      />,
    );

    expect(screen.getByRole('button', { name: '장바구니 담기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수강신청하기' })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.textContent)
        .slice(-3),
    ).toEqual(['수강신청하기', '예약하기', '장바구니 담기']);
  });
});

describe('ProgramPageDetailMainContent', () => {
  it('강의 소개 보조 문구와 수강 전 체크리스트 고정 제목을 렌더링하지 않는다', () => {
    const sectionRefHandlers = {
      'course-curriculum': vi.fn(),
      'course-faq': vi.fn(),
      'course-introduction': vi.fn(),
      'course-qna': vi.fn(),
      'course-reviews': vi.fn(),
    };

    render(
      <MemoryRouter>
        <ProgramPageDetailMainContent
          activeSectionId='course-introduction'
          data={createDetailData({
            preparationChecklist: ['관리자가 입력한 첫 번째 안내', '관리자가 입력한 두 번째 안내'],
          })}
          handleReviewCarouselScroll={vi.fn()}
          handleTabClick={vi.fn()}
          isQnaTabOpen={false}
          openCurriculumRows={{}}
          openFaqId={null}
          reviewCarouselRef={createRef<HTMLDivElement>()}
          reviewSortOrder='recommended'
          sectionRefHandlers={sectionRefHandlers}
          setAllCurriculumRowsOpen={vi.fn()}
          setOpenFaqId={vi.fn()}
          setReviewSortOrder={vi.fn()}
          sortedReviews={createDetailData().reviews}
          toggleCurriculumRow={vi.fn()}
          visiblePreviewReviewIds={[]}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByText('이론을 넘어 진단 사고력을 키우는 핵심 차별점을 정리했습니다.'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('이 강의를 통해 기대할 수 있는 실전 변화와 성장 포인트를 정리했습니다.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('현재 학습 단계와 고민에 맞는 추천 대상')).not.toBeInTheDocument();
    expect(
      screen.queryByText('원활한 학습을 위해 미리 확인해야 할 안내 사항'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('학습 준비')).not.toBeInTheDocument();
    expect(screen.queryByText('복습 자료')).not.toBeInTheDocument();
    expect(screen.queryByText('시청 환경')).not.toBeInTheDocument();
    expect(screen.queryByText('수료 기준')).not.toBeInTheDocument();
    expect(screen.getByText('관리자가 입력한 첫 번째 안내')).toBeInTheDocument();
    expect(screen.getByText('관리자가 입력한 두 번째 안내')).toBeInTheDocument();
  });

  it('수강평 제목 오른쪽에 전체 수강평 개수를 렌더링한다', () => {
    const sectionRefHandlers = {
      'course-curriculum': vi.fn(),
      'course-faq': vi.fn(),
      'course-introduction': vi.fn(),
      'course-qna': vi.fn(),
      'course-reviews': vi.fn(),
    };

    render(
      <MemoryRouter>
        <ProgramPageDetailMainContent
          activeSectionId='course-reviews'
          data={createDetailData({ reviewCount: 4 })}
          handleReviewCarouselScroll={vi.fn()}
          handleTabClick={vi.fn()}
          isQnaTabOpen={false}
          openCurriculumRows={{}}
          openFaqId={null}
          reviewCarouselRef={createRef<HTMLDivElement>()}
          reviewSortOrder='recommended'
          sectionRefHandlers={sectionRefHandlers}
          setAllCurriculumRowsOpen={vi.fn()}
          setOpenFaqId={vi.fn()}
          setReviewSortOrder={vi.fn()}
          sortedReviews={createDetailData().reviews}
          toggleCurriculumRow={vi.fn()}
          visiblePreviewReviewIds={[]}
        />
      </MemoryRouter>,
    );

    const reviewsSection = screen.getByRole('heading', { name: '수강평' }).closest('section');

    expect(reviewsSection).not.toBeNull();
    expect(
      within(reviewsSection as HTMLElement).getByText((_, element) => {
        return element?.textContent === '전체 4개';
      }),
    ).toBeInTheDocument();
  });

  it('온라인 및 문제풀이 커리큘럼에는 섹션 헤더와 강의 행에 시간을 렌더링한다', () => {
    const setAllCurriculumRowsOpen = vi.fn();
    const sectionRefHandlers = {
      'course-curriculum': vi.fn(),
      'course-faq': vi.fn(),
      'course-introduction': vi.fn(),
      'course-qna': vi.fn(),
      'course-reviews': vi.fn(),
    };

    render(
      <MemoryRouter>
        <ProgramPageDetailMainContent
          activeSectionId='course-curriculum'
          data={createDetailData({
            curriculumTrack: {
              id: 'track-1',
              sections: [
                {
                  id: 'section-1',
                  title: '기본 루틴',
                  description: '섹션 설명',
                  durationLabel: '4강',
                  lessons: [
                    {
                      id: 'lesson-online',
                      title: '영상 학습',
                      deliveryType: 'online',
                      durationLabel: '30분',
                      durationMinutes: 30,
                      startDate: null,
                      endDate: null,
                    },
                    {
                      id: 'lesson-problem',
                      title: '문제풀이',
                      deliveryType: 'problem',
                      durationLabel: '문제 풀이',
                      durationMinutes: null,
                      questionCount: 4,
                      problemTimeLimitSeconds: 1800,
                      startDate: null,
                      endDate: null,
                    },
                  ],
                },
              ],
              summaryItems: [],
              summaryKind: 'disc',
            },
          })}
          handleReviewCarouselScroll={vi.fn()}
          handleTabClick={vi.fn()}
          isQnaTabOpen={false}
          openCurriculumRows={{ 'track-1-0': true }}
          openFaqId={null}
          reviewCarouselRef={createRef<HTMLDivElement>()}
          reviewSortOrder='recommended'
          sectionRefHandlers={sectionRefHandlers}
          setAllCurriculumRowsOpen={setAllCurriculumRowsOpen}
          setOpenFaqId={vi.fn()}
          setReviewSortOrder={vi.fn()}
          sortedReviews={createDetailData().reviews}
          toggleCurriculumRow={vi.fn()}
          visiblePreviewReviewIds={[]}
        />
      </MemoryRouter>,
    );

    const curriculumButton = screen.getByRole('button', { name: /섹션 1\. 기본 루틴/ });

    expect(within(curriculumButton).getByText('2개')).toBeInTheDocument();
    expect(within(curriculumButton).getByText('60분')).toBeInTheDocument();
    expect(within(curriculumButton).queryByText('4강')).toBeNull();
    expect(screen.getByText('영상강의')).toBeInTheDocument();
    expect(screen.getByText('문제풀이')).toBeInTheDocument();
    expect(screen.getByText('4문항')).toBeInTheDocument();
    expect(screen.getAllByText('30분')).toHaveLength(2);
    expect(screen.queryByText('999분')).toBeNull();
    expect(screen.queryByText('총 60분')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /모두 접기/ }));

    expect(setAllCurriculumRowsOpen).toHaveBeenCalledWith(false);
  });

  it('오프라인 및 실습예약형 커리큘럼에는 섹션과 강의 시간을 렌더링하지 않는다', () => {
    const sectionRefHandlers = {
      'course-curriculum': vi.fn(),
      'course-faq': vi.fn(),
      'course-introduction': vi.fn(),
      'course-qna': vi.fn(),
      'course-reviews': vi.fn(),
    };

    render(
      <MemoryRouter>
        <ProgramPageDetailMainContent
          activeSectionId='course-curriculum'
          data={createDetailData({
            curriculumTrack: {
              id: 'track-1',
              sections: [
                {
                  id: 'section-1',
                  title: '현장 실습',
                  description: '섹션 설명',
                  durationLabel: '3강',
                  lessons: [
                    {
                      id: 'lesson-offline',
                      title: '현장 강의',
                      deliveryType: 'offline',
                      durationLabel: '120분',
                      durationMinutes: 120,
                      offlineSchedules: [
                        {
                          date: '2026-06-01',
                          startTime: '10:00',
                          endTime: '12:00',
                        },
                      ],
                      startDate: null,
                      endDate: null,
                    },
                    {
                      id: 'lesson-problem',
                      title: '실습 전 문제풀이',
                      deliveryType: 'problem',
                      durationLabel: '문제 풀이',
                      durationMinutes: null,
                      questionCount: 5,
                      problemTimeLimitSeconds: 1800,
                      startDate: null,
                      endDate: null,
                    },
                    {
                      id: 'lesson-practicum',
                      title: '예약 실습',
                      deliveryType: 'practicum',
                      durationLabel: '실습 예약',
                      durationMinutes: null,
                      startDate: null,
                      endDate: null,
                    },
                  ],
                },
              ],
              summaryItems: [],
              summaryKind: 'disc',
            },
          })}
          handleReviewCarouselScroll={vi.fn()}
          handleTabClick={vi.fn()}
          isQnaTabOpen={false}
          openCurriculumRows={{ 'track-1-0': true }}
          openFaqId={null}
          reviewCarouselRef={createRef<HTMLDivElement>()}
          reviewSortOrder='recommended'
          sectionRefHandlers={sectionRefHandlers}
          setAllCurriculumRowsOpen={vi.fn()}
          setOpenFaqId={vi.fn()}
          setReviewSortOrder={vi.fn()}
          sortedReviews={createDetailData().reviews}
          toggleCurriculumRow={vi.fn()}
          visiblePreviewReviewIds={[]}
        />
      </MemoryRouter>,
    );

    const curriculumButton = screen.getByRole('button', { name: /섹션 1\. 현장 실습/ });

    expect(within(curriculumButton).getByText('3개')).toBeInTheDocument();
    expect(within(curriculumButton).queryByText('210분')).toBeNull();
    expect(screen.getByText('오프라인')).toBeInTheDocument();
    expect(screen.getByText('문제풀이')).toBeInTheDocument();
    expect(screen.getByText('실습강의')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '오프라인 일정 보기' })).toBeInTheDocument();
    expect(screen.getByText('5문항')).toBeInTheDocument();
    expect(screen.getByText('30분')).toBeInTheDocument();
    expect(screen.queryByText('120분')).toBeNull();
    expect(screen.queryByText('60분')).toBeNull();
    expect(screen.queryByText('총 210분')).toBeNull();
  });

  it('후기가 없으면 상단 후기 프리뷰 섹션을 렌더링하지 않는다', () => {
    const sectionRefHandlers = {
      'course-curriculum': vi.fn(),
      'course-faq': vi.fn(),
      'course-introduction': vi.fn(),
      'course-qna': vi.fn(),
      'course-reviews': vi.fn(),
    };

    const { container } = render(
      <MemoryRouter>
        <ProgramPageDetailMainContent
          activeSectionId='course-introduction'
          data={createDetailData({ overallRating: 0, reviewCount: 0, reviews: [] })}
          handleReviewCarouselScroll={vi.fn()}
          handleTabClick={vi.fn()}
          isQnaTabOpen={false}
          openCurriculumRows={{}}
          openFaqId={null}
          reviewCarouselRef={createRef<HTMLDivElement>()}
          reviewSortOrder='recommended'
          sectionRefHandlers={sectionRefHandlers}
          setAllCurriculumRowsOpen={vi.fn()}
          setOpenFaqId={vi.fn()}
          setReviewSortOrder={vi.fn()}
          sortedReviews={[]}
          toggleCurriculumRow={vi.fn()}
          visiblePreviewReviewIds={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading', { name: '먼저 경험한 수강생들 후기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '이전 후기' })).toBeNull();
    const introductionSection = screen
      .getByRole('heading', { name: '강의 소개' })
      .closest('section');

    expect(introductionSection).toBeInTheDocument();
    expect(container.querySelector('.contentSectionSeparated')).toBeNull();
  });
});

describe('ProgramPageDetailHero', () => {
  it('상세 히어로 배경에 API 대표 이미지를 사용한다', () => {
    const { container } = render(
      <MemoryRouter>
        <ProgramPageDetailHero
          data={createDetailData({
            heroImageSrc: 'https://media.newzest.xyz/assets/programs/detail.png',
          })}
          heroInfoPills={[]}
        />
      </MemoryRouter>,
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://media.newzest.xyz/assets/programs/detail.png',
    );
  });

  it('상세 히어로 배경에 대표 이미지 크롭 값을 적용한다', () => {
    const { container } = render(
      <MemoryRouter>
        <ProgramPageDetailHero
          data={createDetailData({
            heroImageCropOffsetX: 40,
            heroImageCropOffsetY: -20,
            heroImageCropZoom: 1.5,
          })}
          heroInfoPills={[]}
        />
      </MemoryRouter>,
    );

    const image = container.querySelector('img');

    expect(image).toHaveStyle({
      objectPosition: '70% 40%',
      transform: 'scale(1.5)',
      transformOrigin: '70% 40%',
    });
  });

  it('상세 히어로 breadcrumb에서 페이지 루트인 교육과정 라벨을 제외한다', () => {
    render(
      <MemoryRouter>
        <ProgramPageDetailHero
          data={createDetailData({
            breadcrumbItems: [
              { label: '교육과정', to: '/programs' },
              { label: '의사과정', to: '/programs/doctor-course' },
              { label: '응급/POCUS과정', to: '/programs/doctor-course/pocus' },
              {
                label: '응급 POCUS FAST 집중 과정',
                to: '/programs/doctor-course/pocus/fast/doctor-course-emergency-pocus-fast',
              },
            ],
          })}
          heroInfoPills={[]}
        />
      </MemoryRouter>,
    );

    const breadcrumb = screen.getByRole('navigation', { name: '교육과정 경로' });

    expect(within(breadcrumb).queryByText('교육과정')).toBeNull();
    expect(within(breadcrumb).getByRole('link', { name: '의사과정' })).toHaveAttribute(
      'href',
      '/programs/doctor-course',
    );
    expect(within(breadcrumb).getByRole('link', { name: '응급/POCUS과정' })).toHaveAttribute(
      'href',
      '/programs/doctor-course/pocus',
    );
    expect(within(breadcrumb).getByText('응급 POCUS FAST 집중 과정')).toBeInTheDocument();
  });
});
