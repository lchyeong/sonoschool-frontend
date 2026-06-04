import { beforeEach, describe, expect, it, vi } from 'vitest';
const { httpGetMock } = vi.hoisted(() => {
  return {
    httpGetMock: vi.fn(),
  };
});

vi.mock('@/api/http', () => {
  return {
    http: {
      get: httpGetMock,
    },
  };
});

import { ApiResponseValidationError } from '@/api/errors';
import { fetchHomeHeroSlides } from '@/api/homeHeroSlides';
import { fetchHomeHistoryTimeline } from '@/api/homeHistoryTimeline';
import { fetchProgramPage, fetchProgramsOverview } from '@/api/programCatalog';
import { fetchProgramSearchIndex } from '@/api/programSearch';
import { fetchSiteNavigation } from '@/api/siteNavigation';

describe('program data API fallback', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
  });

  it('keeps rejecting when the programs overview API fails', async () => {
    const error = new Error('overview failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchProgramsOverview()).rejects.toBe(error);
  });

  it('keeps rejecting when the program page API fails', async () => {
    const path = '/programs/general-course/abdomen';
    const error = new Error('page failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchProgramPage(path)).rejects.toBe(error);
  });

  it('keeps rejecting when a failed program page request has no matching mock fallback', async () => {
    const error = new Error('page failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchProgramPage('/programs/unknown-course')).rejects.toBe(error);
  });

  it('prefers admin thumbnail URL fields over default collection card images', async () => {
    httpGetMock.mockResolvedValue({
      breadcrumbItems: [{ label: '교육과정', to: '/programs' }],
      childCollections: [
        {
          coverImageAlt: '소아과정 대표 이미지',
          coverImageSrc: '/SRDMS_OG.png',
          description: '소아과정 목록',
          formatLabels: ['오프라인 과정'],
          id: 'category-1',
          lectureCount: 1,
          thumbnailPreviewUrl: 'https://media.newzest.xyz/assets/programs/category.png',
          title: '소아과정',
          to: '/programs/general-course/pediatric-course',
        },
      ],
      curatorNote: '실제 모집 중인 과정입니다.',
      description: '일반과정 목록입니다.',
      heroImageAlt: '일반과정 대표 이미지',
      heroImageSrc: '/SRDMS_OG.png',
      instructor: {
        careerHighlights: ['실제 모집 과정 중심'],
        headline: '소노스쿨 강의',
        introduction: '실제 개설된 강의입니다.',
        name: '소노스쿨',
        profileImageAlt: '소노스쿨 프로필 이미지',
        profileImageSrc: '/SRDMS_OG.png',
      },
      kicker: '교육과정',
      lectures: [
        {
          categoryLabel: '소아과정',
          difficultyLabel: '입문',
          durationLabel: '2026.05.01 - 2027.01.31',
          formatLabel: '오프라인 과정',
          id: 'program-1',
          priceLabel: '1,980,000원',
          scheduleLabel: '2026.05.01 - 2027.01.01',
          summary: '소아 초음파 정규과정입니다.',
          thumbnailAlt: '소아 초음파 정규과정 썸네일',
          thumbnailSrc: '/SRDMS_OG.png',
          thumbnailPreviewUrl: 'https://media.newzest.xyz/assets/programs/program.png',
          thumbnailUrl: 's3://sonoschool-prod-media/assets/programs/thumbnails/program.png',
          title: '소아 초음파 정규과정',
          to: '/programs/general-course/pediatric-course/course-1',
        },
      ],
      pageKind: 'collection',
      stats: [{ label: '모집 중 과정', value: '1개' }],
      title: '일반과정',
    });

    await expect(fetchProgramPage('/programs/general-course')).resolves.toMatchObject({
      childCollections: [
        {
          coverImageSrc: 'https://media.newzest.xyz/assets/programs/category.png',
        },
      ],
      lectures: [
        {
          thumbnailSrc: 'https://media.newzest.xyz/assets/programs/program.png',
        },
      ],
    });
  });

  it('accepts nullable curriculum lesson descriptions from deployed program page responses', async () => {
    httpGetMock.mockResolvedValue({
      applicationStatusDescription: '지금 바로 장바구니 또는 결제로 이동할 수 있습니다.',
      applicationStatusLabel: '신청 가능',
      availabilityAlertAvailable: false,
      breadcrumbItems: [
        { label: '교육과정', to: '/programs' },
        { label: 'ARDMS', to: '/programs/online-course' },
        { label: 'SPI', to: '/programs/online-course/spi' },
        { label: '최신 시험 완벽 대비 프로그램', to: '/programs/online-course/spi/course-1' },
      ],
      catalogStatus: 'OPEN',
      categoryLabel: '핵심이론',
      curriculumTrack: {
        id: 'program-9-track',
        sections: [
          {
            description: 'SPI 시험 대비 섹션입니다.',
            durationLabel: '1강',
            id: '13',
            lessons: [
              {
                deliveryType: 'resource',
                description: null,
                durationLabel: '-',
                durationMinutes: null,
                endDate: null,
                id: '28',
                offlineSchedules: [],
                questionCount: 0,
                startDate: null,
                title: '자료입니다',
              },
            ],
            title: 'INTRO',
          },
        ],
        summaryItems: ['섹션 1개', '강의 1개'],
        summaryKind: 'decimal',
        title: '최신 시험 완벽 대비 프로그램 커리큘럼',
      },
      description: 'SPI 최신 출제 경향을 반영한 실전 중심 강의입니다.',
      difficultyLabel: '입문',
      discountRateLabel: '할인 없음',
      discountedPriceLabel: '200,000원',
      durationLabel: '상시 수강',
      enrollmentAvailable: true,
      faqItems: [
        {
          answer: 'A. 기본 개념부터 단계적으로 설명합니다.',
          id: 'faq-1',
          question: 'Q. 초보자도 수강이 가능한가요?',
        },
      ],
      formatLabel: '온라인 강의',
      heroImageAlt: '최신 시험 완벽 대비 프로그램 대표 이미지',
      heroImageCropOffsetX: 0,
      heroImageCropOffsetY: 0,
      heroImageCropZoom: 1,
      heroImageSrc: 'https://media.sonoschool.kr/assets/programs/thumbnails/SPI.png',
      instructor: {
        careerHighlights: ['임상 및 문제 적용능력 향상'],
        headline: '소노스쿨 강사의 실제 운영 강의',
        introduction: '최신 시험 완벽 대비 프로그램 강의의 핵심을 중심으로 운영합니다.',
        name: '소노스쿨',
        profileImageAlt: '소노스쿨 프로필 이미지',
        profileImageSrc: '/SRDMS_OG.png',
      },
      kicker: '핵심이론 | 온라인 강의',
      learningOutcomes: [{ label: '임상 및 문제 적용능력 향상', value: '문제 적용 능력 향상' }],
      monthlyInstallmentLabel: '월 33,333원 (6개월 기준)',
      originalPriceLabel: '200,000원',
      overallRating: 0,
      pageKind: 'detail',
      preparationChecklist: ['SPI 시험 대비를 시작하려는 경우'],
      programId: 9,
      qnaSummary: {
        answeredThreadCount: 0,
        totalThreadCount: 0,
      },
      recommendedFor: ['SPI 시험을 준비하는 수험자'],
      registrationPeriodLabel: '상시 모집',
      relatedLectures: [],
      reviewCount: 0,
      reviews: [],
      scheduleLabel: '상시 수강',
      stats: [{ label: '최신 SPI 시험 경향 반영', value: '최근 SPI 출제 경향 반영' }],
      title: '최신 시험 완벽 대비 프로그램',
      tuitionLabel: '200,000원',
    });

    await expect(
      fetchProgramPage('/programs/online-course/spi/cat-2a34c8511902/course-eb4b750f165b'),
    ).resolves.toMatchObject({
      curriculumTrack: {
        sections: [
          {
            lessons: [
              {
                description: undefined,
                title: '자료입니다',
              },
            ],
          },
        ],
      },
      pageKind: 'detail',
      title: '최신 시험 완벽 대비 프로그램',
    });
  });

  it('accepts deployed regular course responses with ten sections and long guidance lists', async () => {
    httpGetMock.mockResolvedValue({
      applicationStatusDescription: '운영 중인 과정으로 신청이 마감되었습니다.',
      applicationStatusLabel: '과정진행중',
      availabilityAlertAvailable: false,
      breadcrumbItems: [
        { label: '교육과정', to: '/programs' },
        { label: '일반과정', to: '/programs/general-course' },
        { label: '상하갑경', to: '/programs/general-course/cat-8175cc9f9321' },
        {
          label: '검진초음파 10주 완성',
          to: '/programs/general-course/cat-8175cc9f9321/cat-3ef3ff569171',
        },
        {
          label: '검진초음파 10주완성',
          to: '/programs/general-course/cat-8175cc9f9321/cat-3ef3ff569171/course-88aae06e3fa7',
        },
      ],
      catalogStatus: 'STARTED',
      categoryLabel: '검진초음파 10주 완성',
      curriculumTrack: {
        id: 'program-37-track',
        sections: Array.from({ length: 10 }, (_, index) => {
          const sectionNumber = index + 1;

          return {
            description: `${String(sectionNumber)}주차 설명`,
            durationLabel: '1강',
            id: String(160 + sectionNumber),
            lessons: [
              {
                deliveryType: 'offline',
                description: `${String(sectionNumber)}주차 이론 및 실습`,
                durationLabel: '총 4시간',
                durationMinutes: 240,
                endDate: '2026-08-23',
                id: String(180 + sectionNumber),
                offlineSchedules: [
                  {
                    date: '2026-08-23',
                    endTime: '12:00',
                    location: '소노스쿨',
                    notes: null,
                    startTime: '08:00',
                  },
                ],
                questionCount: 0,
                startDate: '2026-08-23',
                title: '이론+실습',
              },
            ],
            title: `${String(sectionNumber)}주차`,
          };
        }),
        summaryItems: ['섹션 10개', '강의 13개', '실제 수강 커리큘럼 기준'],
        summaryKind: 'decimal',
        title: '검진초음파 10주완성 커리큘럼',
      },
      description: '검진센터 취업 및 실무 적응을 목표로 구성된 이론·실습 통합 과정입니다.',
      difficultyLabel: '중급',
      discountRateLabel: '할인 없음',
      discountedPriceLabel: '2,200,000원',
      durationLabel: '2026.06.02 - 2026.08.23',
      enrollmentAvailable: false,
      faqItems: [
        {
          answer: '10주 과정으로 진행됩니다.',
          id: 'faq-1',
          question: '몇 주 과정인가요?',
        },
      ],
      formatLabel: '오프라인 과정',
      heroImageAlt: '검진초음파 10주완성 대표 이미지',
      heroImageCropOffsetX: 0,
      heroImageCropOffsetY: 0,
      heroImageCropZoom: 1,
      heroImageSrc: 'https://media.sonoschool.kr/assets/programs/thumbnails/checkup.jpg',
      instructor: {
        careerHighlights: ['검진실무 완성'],
        headline: '소노스쿨 강사의 실제 운영 강의',
        introduction: '검진초음파 10주완성 강의의 핵심을 중심으로 운영합니다.',
        name: '소노스쿨',
        profileImageAlt: '소노스쿨 프로필 이미지',
        profileImageSrc: '/SRDMS_OG.png',
      },
      kicker: '검진초음파 10주 완성 | 오프라인 과정',
      learningOutcomes: [{ label: '검진실무 완성', value: '검진센터 실무 역량 향상' }],
      monthlyInstallmentLabel: '월 366,666원 (6개월 기준)',
      operationPeriodLabel: '2026.06.02 - 2026.08.23',
      originalPriceLabel: '2,200,000원',
      overallRating: 0,
      pageKind: 'detail',
      preparationChecklist: Array.from(
        { length: 9 },
        (_, index) => `수강 전 준비사항 ${String(index + 1)}`,
      ),
      programId: 37,
      qnaSummary: {
        answeredThreadCount: 0,
        totalThreadCount: 0,
      },
      recommendedFor: Array.from({ length: 9 }, (_, index) => `추천 대상 ${String(index + 1)}`),
      registrationPeriodLabel: '2026.06.02 - 2026.06.04',
      relatedLectures: [],
      reviewCount: 0,
      reviews: [],
      scheduleLabel: '2026.06.02 - 2026.08.23',
      stats: [{ label: '취업실무 집중과정', value: '표준 검사 프로토콜을 학습합니다.' }],
      title: '검진초음파 10주완성',
      tuitionLabel: '2,200,000원',
    });

    const page = await fetchProgramPage(
      '/programs/general-course/cat-8175cc9f9321/cat-3ef3ff569171/course-88aae06e3fa7',
    );

    if (page.pageKind !== 'detail') {
      throw new Error('Expected detail program page response.');
    }

    expect(page.title).toBe('검진초음파 10주완성');
    expect(page.curriculumTrack.sections).toHaveLength(10);
    expect(page.curriculumTrack.sections.at(-1)?.title).toBe('10주차');
    expect(page.preparationChecklist).toHaveLength(9);
    expect(page.recommendedFor).toHaveLength(9);
  });

  it('masks review author login IDs from program page API responses', async () => {
    httpGetMock.mockResolvedValue({
      breadcrumbItems: [{ label: '교육과정', to: '/programs' }],
      categoryLabel: '일반과정',
      curriculumTrack: {
        id: 'track-1',
        sections: [
          {
            description: '섹션 설명',
            durationLabel: '1강',
            id: 'section-1',
            lessons: [
              {
                deliveryType: 'online',
                durationLabel: '30분',
                durationMinutes: 30,
                endDate: null,
                id: 'lesson-1',
                startDate: null,
                title: '레슨 1',
              },
            ],
            title: '섹션 1',
          },
        ],
        summaryItems: ['요약 1'],
        summaryKind: 'disc',
      },
      description: '강의 설명',
      difficultyLabel: '입문',
      discountRateLabel: '0%',
      discountedPriceLabel: '100,000원',
      durationLabel: '4주',
      faqItems: [{ answer: '답변', id: 'faq-1', question: '질문' }],
      formatLabel: '온라인',
      heroImageAlt: '대표 이미지',
      heroImageSrc: '/SRDMS_OG.png',
      instructor: {
        careerHighlights: ['경력 1'],
        headline: '전문 강사',
        introduction: '소개',
        name: '강사',
        profileImageAlt: '강사 이미지',
        profileImageSrc: '/SRDMS_OG.png',
      },
      kicker: '테스트',
      monthlyInstallmentLabel: '월 8,334원 × 12개월',
      originalPriceLabel: '100,000원',
      overallRating: 5,
      pageKind: 'detail',
      preparationChecklist: ['준비물 1'],
      recommendedFor: ['초보자'],
      registrationPeriodLabel: '상시 모집',
      relatedLectures: [],
      reviewCount: 2,
      reviews: [
        {
          authorLoginId: 'student01',
          content: '좋아요',
          dateLabel: '2026.04.01',
          id: 'review-1',
          rating: 5,
        },
        {
          loginId: 'sono2026',
          content: '만족합니다',
          dateLabel: '2026.04.02',
          id: 'review-2',
          rating: 5,
        },
      ],
      scheduleLabel: '온라인 상시 수강',
      stats: [{ label: '강의 수', value: '1개' }],
      title: '테스트 강의',
      tuitionLabel: '100,000원',
    });

    await expect(fetchProgramPage('/programs/test-course')).resolves.toMatchObject({
      reviews: [{ authorLoginId: 'studen***' }, { authorLoginId: 'sono2***' }],
    });
  });

  it('keeps rejecting when the navigation API fails', async () => {
    const error = new Error('navigation failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchSiteNavigation()).rejects.toBe(error);
  });

  it('rejects site navigation deeper than three category depths', async () => {
    httpGetMock.mockResolvedValue({
      items: [
        {
          id: '1',
          label: '의사과정',
          to: '/programs/doctor-course',
          children: [
            {
              id: '2',
              label: '내과과정',
              to: '/programs/doctor-course/internal-medicine',
              children: [
                {
                  id: '3',
                  label: '복부',
                  to: '/programs/doctor-course/internal-medicine/abdomen',
                  children: [
                    {
                      id: '4',
                      label: '심화',
                      to: '/programs/doctor-course/internal-medicine/abdomen/advanced',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    await expect(fetchSiteNavigation()).rejects.toMatchObject({
      code: 'API_INVALID_RESPONSE',
      userMessage: '교육과정 메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
  });

  it('keeps rejecting when the search index API fails', async () => {
    const error = new Error('search failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchProgramSearchIndex()).rejects.toBe(error);
  });

  it('prefers admin thumbnail preview URLs in the search index', async () => {
    httpGetMock.mockResolvedValue({
      items: [
        {
          programId: 4,
          categoryId: 4,
          categoryName: 'gdfdg',
          categorySlug: 'gdfdg',
          title: 'ㅎㅇ 복제본',
          slug: 'course-e690949bf964',
          description: 'ㅎㅇ',
          thumbnailPreviewUrl: 'https://media.newzest.xyz/assets/programs/thumbnails/Frame_511.png',
          thumbnailUrl:
            's3://sonoschool-prod-media/assets/programs/thumbnails/27bf3759/Frame_511.png',
          instructorName: null,
          catalogStatus: 'OPEN',
          detailPath: '/programs/doctor-course/gdfdg/course-e690949bf964',
        },
      ],
    });

    await expect(fetchProgramSearchIndex()).resolves.toMatchObject({
      items: [
        {
          thumbnailSrc: 'https://media.newzest.xyz/assets/programs/thumbnails/Frame_511.png',
        },
      ],
    });
  });

  it('hides home hero response validation details behind a friendly message', async () => {
    httpGetMock.mockResolvedValue({
      autoPlayDurationMs: 0,
      items: [],
    });

    let caughtError: unknown;

    try {
      await fetchHomeHeroSlides();
    } catch (error: unknown) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ApiResponseValidationError);

    if (!(caughtError instanceof ApiResponseValidationError)) {
      throw new Error('Expected an API response validation error.');
    }

    expect(caughtError.message).toBe(
      '슬라이드 정보가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(caughtError.debugMessage).toContain('[homeHeroSlides] Invalid response.');
  });

  it('hides home history response validation details behind a friendly message', async () => {
    httpGetMock.mockResolvedValue({
      items: [],
    });

    let caughtError: unknown;

    try {
      await fetchHomeHistoryTimeline();
    } catch (error: unknown) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ApiResponseValidationError);

    if (!(caughtError instanceof ApiResponseValidationError)) {
      throw new Error('Expected an API response validation error.');
    }

    expect(caughtError.message).toBe(
      '연혁 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(caughtError.debugMessage).toContain('[homeHistoryTimeline] Invalid response.');
  });
});
