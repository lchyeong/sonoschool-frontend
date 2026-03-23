export interface AdminCategoryTreeItem {
  id: number;
  name: string;
  slug: string;
  depth: number;
  sortOrder: number;
  active: boolean;
  children: AdminCategoryTreeItem[];
}

export interface AdminCategoryRecord {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  depth: number;
  sortOrder: number;
  active: boolean;
}

export interface AdminCategoryUpsertPayload {
  name: string;
  slug: string;
  sortOrder: number;
}

export interface AdminCategoryCreatePayload extends AdminCategoryUpsertPayload {
  parentId: number | null;
}

export interface AdminCategoryReorderItem {
  id: number;
  sortOrder: number;
}
