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

  it('keeps rejecting when the navigation API fails', async () => {
    const error = new Error('navigation failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchSiteNavigation()).rejects.toBe(error);
  });

  it('accepts site navigation up to four category depths', async () => {
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

    await expect(fetchSiteNavigation()).resolves.toEqual({
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
