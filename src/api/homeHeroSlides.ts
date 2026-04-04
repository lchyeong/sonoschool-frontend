import { z } from 'zod';

import { http } from '@/api/http';
import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  return issues ? `\n${issues}` : '';
};

const homeHeroBannerSlideSchema = z.object({
  id: z.string().min(1),
  type: z.literal('banner'),
  imageSrc: z.string().min(1),
  imageAlt: z.string().min(1),
});

const homeHeroLectureSlideSchema = z.object({
  id: z.string().min(1),
  type: z.literal('lecture'),
  title: z.string().min(1),
  description: z.string().min(1),
  thumbnailSrc: z.string().min(1),
  thumbnailAlt: z.string().min(1),
});

const homeHeroSlidesResponseSchema = z.object({
  items: z
    .array(z.discriminatedUnion('type', [homeHeroBannerSlideSchema, homeHeroLectureSlideSchema]))
    .min(1)
    .max(5),
  autoPlayDurationMs: z.number().int().positive().max(60000),
});

export const fetchHomeHeroSlides = async (): Promise<HomeHeroSlidesResponse> => {
  const responseData = await http.get<unknown>('/api/v1/home/hero-slides');

  const parsed = homeHeroSlidesResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw new Error(`[homeHeroSlides] Invalid response.${toZodErrorMessage(parsed.error)}`);
  }

  return parsed.data;
};
