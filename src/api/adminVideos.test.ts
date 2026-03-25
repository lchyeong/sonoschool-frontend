import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosGetMock, axiosPutMock } = vi.hoisted(() => {
  return {
    axiosGetMock: vi.fn(),
    axiosPutMock: vi.fn(),
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      get: axiosGetMock,
      put: axiosPutMock,
    },
  };
});

import {
  assignAdminLectureVideo,
  fetchAdminProgramLectures,
  fetchAdminVideoPrograms,
} from '@/api/adminVideos';

describe('admin video API', () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('normalizes numeric program IDs into string dropdown values', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: {
          content: [
            {
              categoryName: '복부',
              id: 101,
              programType: 'ONLINE',
              title: '복부 초음파',
            },
          ],
        },
        timestamp: '2026-03-24T00:00:00Z',
      },
    });

    await expect(fetchAdminVideoPrograms()).resolves.toEqual([
      {
        categoryName: '복부',
        id: '101',
        programType: 'ONLINE',
        title: '복부 초음파',
      },
    ]);
  });

  it('normalizes numeric section and lecture IDs before the upload page consumes them', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: [
          {
            description: null,
            id: 31,
            lectures: [
              {
                description: null,
                durationSeconds: null,
                id: 77,
                preview: false,
                published: true,
                sectionId: 31,
                sortOrder: 1,
                title: '1강',
                videoId: 9001,
              },
            ],
            sortOrder: 1,
            title: '기본 과정',
          },
        ],
        timestamp: '2026-03-24T00:00:00Z',
      },
    });

    await expect(fetchAdminProgramLectures('101')).resolves.toEqual([
      {
        description: null,
        id: '31',
        lectures: [
          {
            description: null,
            durationSeconds: null,
            id: '77',
            preview: false,
            published: true,
            sectionId: '31',
            sortOrder: 1,
            title: '1강',
            videoId: 9001,
          },
        ],
        sortOrder: 1,
        title: '기본 과정',
      },
    ]);
  });

  it('normalizes numeric lecture assignment IDs returned after video attach', async () => {
    axiosPutMock.mockResolvedValue({
      data: {
        data: {
          description: null,
          durationSeconds: 1800,
          id: 77,
          preview: false,
          published: true,
          sectionId: 31,
          sortOrder: 1,
          title: '1강',
          videoId: 9001,
        },
        timestamp: '2026-03-24T00:00:00Z',
      },
    });

    await expect(assignAdminLectureVideo('77', 9001)).resolves.toEqual({
      description: null,
      durationSeconds: 1800,
      id: '77',
      preview: false,
      published: true,
      sectionId: '31',
      sortOrder: 1,
      title: '1강',
      videoId: 9001,
    });
  });
});
