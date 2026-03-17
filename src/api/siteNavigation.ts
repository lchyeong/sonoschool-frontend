import { z } from 'zod';

import { shouldUseMockFallback } from '@/api/fallback';
import { http } from '@/api/http';
import { getMockSiteNavigation } from '@/mocks/data/siteNavigation';
import type { SiteNavigationResponse } from '@/types/siteNavigation';

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  return issues ? `\n${issues}` : '';
};

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
// 4. 최대 깊이 3 검사
// 5. 모두 통과하면 안전한 데이터 반환
export const fetchSiteNavigation = async (siteKey: string): Promise<SiteNavigationResponse> => {
  try {
    // siteKey는 URL 일부로 들어가므로 안전하게 인코딩합니다.
    // 예를 들어 공백, 한글, 특수문자가 있더라도 URL이 깨지지 않게 처리합니다.
    const encodedSiteKey = encodeURIComponent(siteKey);
    // 여기서는 응답 타입을 일단 `unknown`으로 받습니다.
    // 이유는 "서버 응답을 아직 믿지 않는다"는 의도를 코드로 명확히 표현하기 위해서입니다.
    // 검증 전까지는 무엇이 올지 모른다고 가정하는 편이 더 안전합니다.
    const responseData = await http.get<unknown>(`/sites/${encodedSiteKey}/navigation`);

    const parsed = siteNavigationResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      throw new Error(`[siteNavigation] Invalid response.${toZodErrorMessage(parsed.error)}`);
    }

    // 1. 전체 항목 개수
    const itemCount = countNavigationItems(parsed.data.items);
    // 2. 중복을 제거한 id 개수
    const uniqueIdCount = collectNavigationIds(parsed.data.items).size;
    // 3. 실제 최대 메뉴 깊이
    const maxDepth = getMaxNavigationDepth(parsed.data.items);

    // 전체 항목 수와 고유 id 수가 다르면 중복 id가 있었다는 뜻입니다.
    // React key, 메뉴 열기/닫기 상태, 링크 식별 로직이 꼬일 수 있으므로 차단합니다.
    if (itemCount !== uniqueIdCount) {
      throw new Error('[siteNavigation] Invalid response.\n- items: duplicate id detected');
    }

    // 헤더 설계상 3뎁스까지만 허용하므로 4뎁스 이상은 거부합니다.
    if (maxDepth > 3) {
      throw new Error('[siteNavigation] Invalid response.\n- items: maximum depth is 3');
    }

    // 모든 검증을 통과한 "안전한 헤더 메뉴 데이터"만 반환합니다.
    // 이 시점부터는 호출하는 쪽에서 `parsed.data`를 비교적 안심하고 사용할 수 있습니다.
    return parsed.data;
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return getMockSiteNavigation(siteKey);
  }
};
