import '@testing-library/jest-dom/vitest';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetMockAdminConsoleData } from '@/mocks/data/adminConsole';
import { resetMockAdminPaymentsData } from '@/mocks/data/adminPayments';
import { resetMockAdminProgramsLiveData } from '@/mocks/data/adminProgramsLive';
import { resetMockMyPageData } from '@/mocks/data/mypage';
import { resetMockProgramCatalogData } from '@/mocks/data/programCatalog';
import { resetMockStudentAuthState } from '@/mocks/data/studentAuth';
import { server } from '@/mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockAdminConsoleData();
  resetMockAdminPaymentsData();
  resetMockAdminProgramsLiveData();
  resetMockMyPageData();
  resetMockProgramCatalogData();
  resetMockStudentAuthState();
});

afterAll(() => {
  server.close();
});
