import { z } from 'zod';

import { toApiResponseValidationError } from '@/api/errors';
import { http } from '@/api/http';
import { searchScopeValues } from '@/search/programSearchShared';
import type { ProgramSearchIndexResponse } from '@/types/programSearch';
import { sanitizeRequiredPublicAssetUrl } from '@/utils/publicAssetUrl';

const DEFAULT_PROGRAM_IMAGE = '/SRDMS_OG.png';

const publicImageSchema = z
  .string()
  .min(1)
  .transform((value) => sanitizeRequiredPublicAssetUrl(value, DEFAULT_PROGRAM_IMAGE));

const programSearchItemSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(searchScopeValues),
  to: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  categoryLabel: z.string().min(1),
  thumbnailSrc: publicImageSchema,
  thumbnailAlt: z.string().min(1),
});

const programSearchIndexResponseSchema = z.object({
  items: z.array(programSearchItemSchema).max(200),
});

const backendProgramSearchItemSchema = z.object({
  programId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  categoryName: z.string().min(1),
  categorySlug: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().min(1).nullable().optional(),
  instructorName: z.string().nullable().optional(),
  catalogStatus: z.string().min(1),
  detailPath: z.string().min(1),
});

const backendProgramSearchIndexResponseSchema = z.object({
  items: z.array(backendProgramSearchItemSchema).max(200),
});

export const fetchProgramSearchIndex = async (): Promise<ProgramSearchIndexResponse> => {
  const responseData = await http.get<unknown>('/api/v1/catalog/search-index');

  const parsed = programSearchIndexResponseSchema.safeParse(responseData);

  if (parsed.success) {
    return parsed.data;
  }

  const backendParsed = backendProgramSearchIndexResponseSchema.safeParse(responseData);

  if (!backendParsed.success) {
    throw toApiResponseValidationError({
      source: 'programSearch',
      userMessage: '검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: backendParsed.error,
    });
  }

  return {
    items: backendParsed.data.items.map((item) => ({
      id: `lecture-${String(item.programId)}`,
      scope: 'lecture',
      to: item.detailPath,
      title: item.title,
      description: item.description?.trim() || `${item.categoryName} 강의`,
      categoryLabel: item.categoryName,
      thumbnailSrc: sanitizeRequiredPublicAssetUrl(item.thumbnailUrl, DEFAULT_PROGRAM_IMAGE),
      thumbnailAlt: `${item.title} 썸네일`,
    })),
  };
};
