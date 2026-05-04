import '@testing-library/jest-dom/vitest';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetMockAdminPaymentsData } from '@/mocks/data/adminPayments';
import { resetMockAdminProgramsLiveData } from '@/mocks/data/adminProgramsLive';
import { resetMockMyPageData } from '@/mocks/data/mypage';
import { resetMockProgramCatalogData } from '@/mocks/data/programCatalog';
import { resetMockResourcesData } from '@/mocks/data/resources';
import { resetMockStudentAuthState } from '@/mocks/data/studentAuth';
import { server } from '@/mocks/server';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
  });

  class TestIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];

    disconnect = () => {};
    observe = () => {};
    takeRecords = () => [];
    unobserve = () => {};
  }

  globalThis.IntersectionObserver = TestIntersectionObserver;

  class TestResizeObserver implements ResizeObserver {
    disconnect = () => {};
    observe = () => {};
    unobserve = () => {};
  }

  globalThis.ResizeObserver = TestResizeObserver;
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockAdminPaymentsData();
  resetMockAdminProgramsLiveData();
  resetMockMyPageData();
  resetMockProgramCatalogData();
  resetMockResourcesData();
  resetMockStudentAuthState();
});

afterAll(() => {
  server.close();
});
