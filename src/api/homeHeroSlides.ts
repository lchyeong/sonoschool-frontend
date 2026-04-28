import { z } from 'zod';

import { toApiResponseValidationError } from '@/api/errors';
import { http } from '@/api/http';
import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';

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
  backgroundSrc: z.string().min(1).optional(),
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
    throw toApiResponseValidationError({
      source: 'homeHeroSlides',
      userMessage: '슬라이드 정보가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};
