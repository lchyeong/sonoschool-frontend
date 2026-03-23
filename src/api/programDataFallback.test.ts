/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMockProgramPage, getMockProgramsOverview } from '@/mocks/data/programCatalog';
import { getMockProgramSearchIndex } from '@/mocks/data/programSearch';
import { getMockSiteNavigation } from '@/mocks/data/siteNavigation';
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

import { fetchProgramPage, fetchProgramsOverview } from '@/api/programCatalog';
import { fetchProgramSearchIndex } from '@/api/programSearch';
import { fetchSiteNavigation } from '@/api/siteNavigation';

describe('program data API fallback', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
  });

  it('returns mock overview data when the programs overview API fails', async () => {
    httpGetMock.mockRejectedValue(new Error('overview failed'));

    await expect(fetchProgramsOverview()).resolves.toEqual(
      getMockProgramsOverview('sono-school-main'),
    );
  });

  it('returns mock program page data when the program page API fails', async () => {
    const path = '/programs/general-course/abdomen';

    httpGetMock.mockRejectedValue(new Error('page failed'));

    await expect(fetchProgramPage(path)).resolves.toEqual(
      getMockProgramPage('sono-school-main', path),
    );
  });

  it('keeps rejecting when a failed program page request has no matching mock fallback', async () => {
    const error = new Error('page failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchProgramPage('/programs/unknown-course')).rejects.toBe(error);
  });

  it('returns mock navigation data when the navigation API fails', async () => {
    httpGetMock.mockRejectedValue(new Error('navigation failed'));

    await expect(fetchSiteNavigation()).resolves.toEqual(getMockSiteNavigation());
  });

  it('returns mock search index data when the search index API fails', async () => {
    httpGetMock.mockRejectedValue(new Error('search failed'));

    await expect(fetchProgramSearchIndex()).resolves.toEqual(getMockProgramSearchIndex());
  });
});
