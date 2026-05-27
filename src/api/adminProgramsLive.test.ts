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

import { fetchAdminProgramDetailLive, updateAdminProgramLive } from '@/api/adminProgramsLive';
import type { AdminProgramDetail, AdminProgramUpsertPayload } from '@/types/adminProgramsLive';

const createProgramDetail = (overrides: Partial<AdminProgramDetail> = {}): AdminProgramDetail =>
  ({
    accessDays: null,
    accessPolicy: null,
    catalogStatus: 'OPEN',
    categoryId: 1,
    categoryName: '카테고리',
    checklists: [],
    currentStudents: 0,
    description: null,
    documents: [],
    faqs: [],
    featured: false,
    full: false,
    id: 10,
    learningEndAt: null,
    learningOutcomes: [],
    learningPoints: [],
    learningStartAt: null,
    level: null,
    maxStudents: null,
    price: 0,
    programType: 'ONLINE',
    published: false,
    recommendedFor: [],
    saleEndAt: null,
    salePrice: null,
    saleStartAt: null,
    slug: 'program',
    summaryItems: [],
    thumbnailUrl: null,
    title: '프로그램',
    ...overrides,
  }) as AdminProgramDetail;

describe('admin programs live API', () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('normalizes nullable collection fields in program detail responses', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: createProgramDetail({
          checklists: null,
          documents: null,
          faqs: null,
          learningOutcomes: null,
          learningPoints: null,
          recommendedFor: null,
          summaryItems: [null, { content: '값', title: '라벨' }],
          tags: null,
        } as unknown as Partial<AdminProgramDetail>),
      },
    });

    const result = await fetchAdminProgramDetailLive(10);

    expect(result.checklists).toEqual([]);
    expect(result.documents).toEqual([]);
    expect(result.learningOutcomes).toEqual([]);
    expect(result.summaryItems).toEqual([
      { label: '', value: '' },
      { label: '라벨', value: '값' },
    ]);
    expect(result.tags).toEqual([]);
  });

  it('normalizes nullable collection fields before update', async () => {
    const payload = {
      accessDays: null,
      accessPolicy: null,
      categoryId: 1,
      checklists: null,
      description: '',
      faqs: null,
      learningEndAt: '',
      learningOutcomes: [null, { label: '성과', value: '내용' }],
      learningPoints: null,
      learningStartAt: '',
      level: null,
      maxStudents: null,
      price: 0,
      programType: 'ONLINE',
      recommendedFor: null,
      saleEndAt: '',
      salePrice: null,
      saleStartAt: '',
      summaryItems: null,
      thumbnailCropOffsetX: null,
      thumbnailCropOffsetY: null,
      thumbnailCropZoom: null,
      thumbnailUrl: '',
      title: '프로그램',
    } as unknown as AdminProgramUpsertPayload;
    axiosPutMock.mockResolvedValue({
      data: {
        data: createProgramDetail(),
      },
    });

    await updateAdminProgramLive(10, payload);

    const requestPayload = axiosPutMock.mock.calls[0]?.[1] as {
      checklists: string[];
      learningOutcomes: Array<{ content: string; title: string }>;
      summaryItems: Array<{ content: string; title: string }>;
    };
    expect(requestPayload.checklists).toEqual([]);
    expect(requestPayload.learningOutcomes).toEqual([{ content: '내용', title: '성과' }]);
    expect(requestPayload.summaryItems).toEqual([]);
  });
});
