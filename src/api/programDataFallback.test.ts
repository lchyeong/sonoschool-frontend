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

  it('hides home hero response validation details behind a friendly message', async () => {
    httpGetMock.mockResolvedValue({
      autoPlayDurationMs: 5000,
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
