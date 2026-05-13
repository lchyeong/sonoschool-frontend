import { z } from 'zod';

import { toApiResponseValidationError } from '@/api/errors';
import { http } from '@/api/http';
import type { SiteNavigationResponse } from '@/types/siteNavigation';

const MAX_SITE_NAVIGATION_DEPTH = 4;

interface SiteNavigationItemPayload {
  id: string;
  label: string;
  to: string;
  description?: string | undefined;
  children?: SiteNavigationItemPayload[] | undefined;
}

const siteNavigationItemSchema: z.ZodType<SiteNavigationItemPayload> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    to: z.string().min(1),
    description: z.string().optional(),
    children: z.array(siteNavigationItemSchema).optional(),
  }),
);

const siteNavigationResponseSchema = z.object({
  items: z.array(siteNavigationItemSchema),
});

const collectNavigationIds = (
  items: SiteNavigationItemPayload[],
  ids: Set<string> = new Set(),
): Set<string> => {
  items.forEach((item) => {
    ids.add(item.id);
    if (item.children) {
      collectNavigationIds(item.children, ids);
    }
  });

  return ids;
};

const countNavigationItems = (items: SiteNavigationItemPayload[]): number => {
  return items.reduce((count, item) => {
    return count + 1 + countNavigationItems(item.children ?? []);
  }, 0);
};

const getMaxNavigationDepth = (items: SiteNavigationItemPayload[], depth = 1): number => {
  return items.reduce((maxDepth, item) => {
    const childDepth = item.children?.length
      ? getMaxNavigationDepth(item.children, depth + 1)
      : depth;

    return Math.max(maxDepth, childDepth);
  }, depth);
};

// 사이트 헤더 메뉴를 서버에서 가져오는 메인 함수입니다.
//
// 흐름 요약:
// 1. API 요청
// 2. Zod로 기본 구조 검증
// 3. 중복 id 검사
// 4. 최대 깊이 4 검사
// 5. 모두 통과하면 안전한 데이터 반환
export const fetchSiteNavigation = async (): Promise<SiteNavigationResponse> => {
  const responseData = await http.get<unknown>('/api/v1/navigation/programs');

  const parsed = siteNavigationResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'siteNavigation',
      userMessage: '교육과정 메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  const itemCount = countNavigationItems(parsed.data.items);
  const uniqueIdCount = collectNavigationIds(parsed.data.items).size;
  const maxDepth = getMaxNavigationDepth(parsed.data.items);

  if (itemCount !== uniqueIdCount) {
    throw toApiResponseValidationError({
      details: ['items: duplicate id detected'],
      source: 'siteNavigation',
      userMessage: '교육과정 메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }

  if (maxDepth > MAX_SITE_NAVIGATION_DEPTH) {
    throw toApiResponseValidationError({
      details: [`items: maximum depth is ${String(MAX_SITE_NAVIGATION_DEPTH)}`],
      source: 'siteNavigation',
      userMessage: '교육과정 메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }

  return parsed.data;
};
