import { z } from 'zod';

import { toApiResponseValidationError } from '@/api/errors';
import { http } from '@/api/http';
import type { HomeHistoryTimelineResponse } from '@/types/homeHistoryTimeline';

const homeHistoryTimelineItemSchema = z.object({
  year: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

const homeHistoryTimelineResponseSchema = z.object({
  items: z.array(homeHistoryTimelineItemSchema).min(1).max(20),
});

export const fetchHomeHistoryTimeline = async (): Promise<HomeHistoryTimelineResponse> => {
  const responseData = await http.get<unknown>('/api/v1/home/history-timeline');

  const parsed = homeHistoryTimelineResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'homeHistoryTimeline',
      userMessage: '연혁 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};
