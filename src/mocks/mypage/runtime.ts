import { env } from '@/config/env';

export const MYPAGE_MOCK_SCENARIO_QUERY_PARAM = 'mypageMock';

export const MYPAGE_MOCK_SCENARIO_LABELS = {
  all: '전체 검증',
  certificate: '수료증 검증',
  empty: '빈 상태 검증',
  expired: '수강 종료 검증',
} as const;

export type MyPageMockScenario = keyof typeof MYPAGE_MOCK_SCENARIO_LABELS;

const MYPAGE_MOCK_SCENARIOS = new Set<MyPageMockScenario>(
  Object.keys(MYPAGE_MOCK_SCENARIO_LABELS) as MyPageMockScenario[],
);

const isMyPagePath = (pathname: string) => pathname.startsWith('/mypage');

export const isMyPageMockModeEnabled = (): boolean => {
  if (!env.VITE_ENABLE_MYPAGE_MOCK || typeof window === 'undefined') {
    return false;
  }

  return isMyPagePath(window.location.pathname);
};

export const getMyPageMockScenario = (): MyPageMockScenario => {
  if (typeof window === 'undefined') {
    return env.VITE_MYPAGE_MOCK_SCENARIO;
  }

  const queryValue = new URLSearchParams(window.location.search).get(
    MYPAGE_MOCK_SCENARIO_QUERY_PARAM,
  );

  if (queryValue && MYPAGE_MOCK_SCENARIOS.has(queryValue as MyPageMockScenario)) {
    return queryValue as MyPageMockScenario;
  }

  return env.VITE_MYPAGE_MOCK_SCENARIO;
};

export const getMyPageMockQueryKeySegment = (): string => {
  if (!isMyPageMockModeEnabled()) {
    return 'live';
  }

  return `mock:${getMyPageMockScenario()}`;
};
