import type { SiteNavigationResponse } from '@/types/siteNavigation';
import type { HeaderNavigationItem } from '@/utils/buildHeaderNavigation';

export const EMPTY_NAVIGATION_ITEMS: SiteNavigationResponse['items'] = [];
export const DESKTOP_DROPDOWN_ANIMATION_DURATION_MS = 500;
export const HEADER_HIDE_START_SCROLL_Y_PX = 8;
export const RECENT_SCROLL_INPUT_GRACE_PERIOD_MS = 300;
export const DEFAULT_HEADER_OFFSET_HEIGHT_PX = 73;

export const hasNavigationChildren = (item: HeaderNavigationItem): boolean => {
  return Boolean(item.children?.length);
};

export const getNavigationDescription = (
  description: string | undefined,
  fallbackText: string,
): string => {
  const normalizedDescription = description?.trim();

  return normalizedDescription && normalizedDescription.length > 0
    ? normalizedDescription
    : fallbackText;
};
