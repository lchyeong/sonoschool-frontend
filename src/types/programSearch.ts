import type { SearchScope } from '@/search/programSearchShared';

export type { SearchScope, SearchScopeOption } from '@/search/programSearchShared';

export interface ProgramSearchItem {
  id: string;
  scope: SearchScope;
  to: string;
  title: string;
  description: string;
  categoryLabel: string;
  tags?: string[] | undefined;
  thumbnailSrc: string;
  thumbnailAlt: string;
  thumbnailCropOffsetX?: number | null | undefined;
  thumbnailCropOffsetY?: number | null | undefined;
  thumbnailCropZoom?: number | null | undefined;
}

export interface ProgramSearchIndexResponse {
  items: ProgramSearchItem[];
}
