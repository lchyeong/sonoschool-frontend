export interface SiteNavigationItem {
  id: string;
  label: string;
  to: string;
  description?: string | undefined;
  children?: SiteNavigationItem[] | undefined;
}

export interface SiteNavigationResponse {
  items: SiteNavigationItem[];
}
