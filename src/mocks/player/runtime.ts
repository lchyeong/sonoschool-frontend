export const PLAYER_MOCK_SCENARIO_QUERY_PARAM = 'playerMock';

export const PLAYER_MOCK_SCENARIO_LABELS = {
  empty: '빈 상태',
  offline: '오프라인 일정',
  practicum: '실습 예약',
  problem: '문제풀이',
  resource: '자료',
  video: '영상',
} as const;

export type PlayerMockScenario = keyof typeof PLAYER_MOCK_SCENARIO_LABELS;

const PLAYER_MOCK_SCENARIOS = new Set<PlayerMockScenario>(
  Object.keys(PLAYER_MOCK_SCENARIO_LABELS) as PlayerMockScenario[],
);

export const isPlayerMockModeEnabled = (): boolean => {
  return false;
};

export const getPlayerMockScenario = (): PlayerMockScenario => {
  if (typeof window === 'undefined') {
    return 'video';
  }

  const queryValue = new URLSearchParams(window.location.search).get(
    PLAYER_MOCK_SCENARIO_QUERY_PARAM,
  );

  if (queryValue && PLAYER_MOCK_SCENARIOS.has(queryValue as PlayerMockScenario)) {
    return queryValue as PlayerMockScenario;
  }

  return 'video';
};

export const getPlayerMockQueryKeySegment = (): string => {
  if (!isPlayerMockModeEnabled()) {
    return 'live';
  }

  return `mock:${getPlayerMockScenario()}`;
};
