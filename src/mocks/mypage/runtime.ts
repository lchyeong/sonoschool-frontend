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

export const isMyPageMockModeEnabled = (): boolean => {
  return false;
};

export const getMyPageMockScenario = (): MyPageMockScenario => {
  if (typeof window === 'undefined') {
    return 'all';
  }

  const queryValue = new URLSearchParams(window.location.search).get(
    MYPAGE_MOCK_SCENARIO_QUERY_PARAM,
  );

  if (queryValue && MYPAGE_MOCK_SCENARIOS.has(queryValue as MyPageMockScenario)) {
    return queryValue as MyPageMockScenario;
  }

  return 'all';
};

export const getMyPageMockQueryKeySegment = (): string => {
  if (!isMyPageMockModeEnabled()) {
    return 'live';
  }

  return `mock:${getMyPageMockScenario()}`;
};
