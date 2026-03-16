import type { SearchScope } from '@/search/programSearchShared';

export type { SearchScope, SearchScopeOption } from '@/search/programSearchShared';

export interface ProgramSearchItem {
  id: string;
  scope: SearchScope;
  to: string;
  title: string;
  description: string;
  categoryLabel: string;
  tags: string[];
  thumbnailSrc: string;
  thumbnailAlt: string;
}

export interface ProgramSearchIndexResponse {
  items: ProgramSearchItem[];
}
