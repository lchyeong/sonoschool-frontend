import type { SiteNavigationResponse } from '@/types/siteNavigation';

import { getMockProgramNavigationItems } from './programCatalog';

export const getMockSiteNavigation = (siteKey: string): SiteNavigationResponse => {
  return {
    items: getMockProgramNavigationItems(siteKey),
  };
};
