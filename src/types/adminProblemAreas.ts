export interface AdminProblemArea {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  parentName: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminProblemAreaCreatePayload {
  name: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
}

export interface AdminProblemAreaUpdatePayload extends AdminProblemAreaCreatePayload {
  active: boolean;
}
