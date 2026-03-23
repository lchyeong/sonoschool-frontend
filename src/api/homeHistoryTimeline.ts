import { z } from 'zod';

import { shouldUseMockFallback } from '@/api/fallback';
import { http } from '@/api/http';
import { getMockHomeHistoryTimeline } from '@/mocks/data/homeHistoryTimeline';
import type { HomeHistoryTimelineResponse } from '@/types/homeHistoryTimeline';

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  return issues ? `\n${issues}` : '';
};

const homeHistoryTimelineItemSchema = z.object({
  year: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

const homeHistoryTimelineResponseSchema = z.object({
  items: z.array(homeHistoryTimelineItemSchema).min(1).max(20),
});

export const fetchHomeHistoryTimeline = async (): Promise<HomeHistoryTimelineResponse> => {
  try {
    const responseData = await http.get<unknown>('/api/v1/home/history-timeline');

    const parsed = homeHistoryTimelineResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      throw new Error(`[homeHistoryTimeline] Invalid response.${toZodErrorMessage(parsed.error)}`);
    }

    return parsed.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return getMockHomeHistoryTimeline();
  }
};
