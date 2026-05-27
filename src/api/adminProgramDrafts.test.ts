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

import { fetchAdminProgramDraft, updateAdminProgramDraft } from '@/api/adminProgramDrafts';
import type { AdminProgramDraftDetail, AdminProgramDraftPayload } from '@/types/adminProgramDrafts';

const createDraftDetail = (payload: unknown): AdminProgramDraftDetail =>
  ({
    createdAt: null,
    finalProgramId: null,
    id: 10,
    payload,
    status: 'ACTIVE',
    titlePreview: null,
    updatedAt: null,
  }) as AdminProgramDraftDetail;

describe('admin program drafts API', () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
    axiosPutMock.mockReset();
  });

  it('normalizes nullable draft detail payloads from the server', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: createDraftDetail({
          basicInfo: {
            learningOutcomes: null,
            summaryItems: null,
          },
          problems: [
            null,
            {
              lectureKey: 'lecture-a',
              questions: [
                null,
                {
                  mediaAssetId: null,
                  mediaUploadStatus: null,
                  mediaVideoId: 91,
                  options: null,
                  questionText: null,
                  sortOrder: null,
                },
              ],
            },
          ],
          resources: [
            null,
            {
              key: null,
              lectureKey: 'lecture-a',
              sortOrder: null,
            },
          ],
          sections: [
            null,
            {
              key: null,
              lectures: [
                null,
                {
                  key: 'lecture-a',
                  offlineSchedules: null,
                  preview: null,
                  published: null,
                  sortOrder: null,
                },
              ],
              sortOrder: null,
            },
          ],
        }),
      },
    });

    const result = await fetchAdminProgramDraft(10);

    expect(result.payload.basicInfo.learningOutcomes).toEqual([]);
    expect(result.payload.sections).toHaveLength(1);
    expect(result.payload.sections[0]?.key).toMatch(/^section-/);
    expect(result.payload.sections[0]?.lectures).toHaveLength(1);
    expect(result.payload.sections[0]?.lectures[0]?.offlineSchedules).toEqual([]);
    expect(result.payload.sections[0]?.lectures[0]?.published).toBe(true);
    expect(result.payload.problems[0]?.questions).toHaveLength(1);
    expect(result.payload.problems[0]?.questions[0]?.mediaUploadStatus).toBe('READY');
    expect(result.payload.resources).toHaveLength(1);
    expect(result.payload.resources[0]?.key).toMatch(/^resource-/);
  });

  it('removes null collection entries and preserves default publication on save', async () => {
    const payload = {
      basicInfo: {
        learningOutcomes: null,
        summaryItems: null,
      },
      problems: [
        null,
        {
          lectureKey: 'lecture-a',
          questions: [
            null,
            {
              mediaAssetId: null,
              mediaUploadStatus: null,
              mediaVideoId: null,
              options: [
                null,
                {
                  correct: null,
                  optionText: null,
                  sortOrder: null,
                },
              ],
              questionText: null,
              sortOrder: null,
            },
          ],
          retakeAllowed: null,
        },
      ],
      resources: [
        null,
        {
          key: null,
          lectureKey: null,
          sortOrder: null,
        },
        {
          key: null,
          lectureKey: 'lecture-a',
          sortOrder: null,
        },
      ],
      sections: [
        {
          key: 'section-a',
          lectures: [
            null,
            {
              key: 'lecture-a',
              lectureType: 'VIDEO',
              offlineSchedules: null,
              preview: null,
              published: null,
              sortOrder: null,
            },
          ],
          sortOrder: null,
        },
      ],
    } as unknown as AdminProgramDraftPayload;
    axiosPutMock.mockResolvedValue({
      data: {
        data: createDraftDetail(payload),
      },
    });

    await updateAdminProgramDraft(10, payload);

    const requestPayload = axiosPutMock.mock.calls[0]?.[1] as AdminProgramDraftPayload;
    expect(requestPayload.sections[0]?.lectures).toHaveLength(1);
    expect(requestPayload.sections[0]?.lectures[0]?.offlineSchedules).toEqual([]);
    expect(requestPayload.sections[0]?.lectures[0]?.published).toBe(true);
    expect(requestPayload.problems).toHaveLength(1);
    expect(requestPayload.problems[0]?.retakeAllowed).toBe(false);
    expect(requestPayload.problems[0]?.questions).toHaveLength(1);
    expect(requestPayload.problems[0]?.questions[0]?.options).toHaveLength(1);
    expect(requestPayload.resources).toHaveLength(1);
    expect(requestPayload.resources[0]?.key).toMatch(/^resource-/);
  });
});
