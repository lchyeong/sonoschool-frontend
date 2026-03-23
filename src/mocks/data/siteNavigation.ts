import type { SiteNavigationResponse } from '@/types/siteNavigation';

import { getMockProgramNavigationItems } from './programCatalog';

const DEFAULT_PROGRAM_SITE_ID = 'sono-school-main';

export const getMockSiteNavigation = (): SiteNavigationResponse => {
  return {
    items: getMockProgramNavigationItems(DEFAULT_PROGRAM_SITE_ID),
  };
};
