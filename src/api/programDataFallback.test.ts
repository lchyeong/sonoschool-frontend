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

  it('keeps rejecting when the search index API fails', async () => {
    const error = new Error('search failed');

    httpGetMock.mockRejectedValue(error);

    await expect(fetchProgramSearchIndex()).rejects.toBe(error);
  });
});
