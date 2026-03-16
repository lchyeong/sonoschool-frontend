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
  tags: z.array(z.string().trim().min(1)).max(8),
  thumbnailSrc: z.string().min(1),
  thumbnailAlt: z.string().min(1),
});

const programSearchIndexResponseSchema = z.object({
  items: z.array(programSearchItemSchema).max(200),
});

export const fetchProgramSearchIndex = async (
  siteKey: string,
): Promise<ProgramSearchIndexResponse> => {
  const encodedSiteKey = encodeURIComponent(siteKey);
  const responseData = await http.get<unknown>(`/sites/${encodedSiteKey}/program-search-index`);

  const parsed = programSearchIndexResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw new Error(`[programSearch] Invalid response.${toZodErrorMessage(parsed.error)}`);
  }

  return parsed.data;
};
