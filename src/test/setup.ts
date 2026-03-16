import '@testing-library/jest-dom/vitest';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetMockAdminConsoleData } from '@/mocks/data/adminConsole';
import { resetMockProgramCatalogData } from '@/mocks/data/programCatalog';
import { server } from '@/mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockAdminConsoleData();
  resetMockProgramCatalogData();
});

afterAll(() => {
  server.close();
});
