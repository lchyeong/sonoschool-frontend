import { z } from 'zod';

import { http } from '@/api/http';
import { searchScopeValues } from '@/search/programSearchShared';
import type { ProgramSearchIndexResponse } from '@/types/programSearch';

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  return issues ? `\n${issues}` : '';
};

const programSearchItemSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(searchScopeValues),
  to: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  categoryLabel: z.string().min(1),
  thumbnailSrc: z.string().min(1),
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
    throw new Error(`[programSearch] Invalid response.${toZodErrorMessage(backendParsed.error)}`);
  }

  return {
    items: backendParsed.data.items.map((item) => ({
      id: `lecture-${String(item.programId)}`,
      scope: 'lecture',
      to: item.detailPath,
      title: item.title,
      description: item.description?.trim() || `${item.categoryName} 강의`,
      categoryLabel: item.categoryName,
      thumbnailSrc: item.thumbnailUrl || '/SRDMS_OG.png',
      thumbnailAlt: `${item.title} 썸네일`,
    })),
  };
};
