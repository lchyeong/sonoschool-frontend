import type { SiteNavigationResponse } from '@/types/siteNavigation';

import { getMockProgramNavigationItems } from './programCatalog';

export const getMockSiteNavigation = (): SiteNavigationResponse => {
  return {
    items: getMockProgramNavigationItems(),
  };
};
