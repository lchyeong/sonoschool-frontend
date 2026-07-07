export type AdminResourceScope = 'GLOBAL' | 'PROGRAM';
export type AdminResourceVisibility = 'PUBLIC' | 'ENROLLED_ONLY' | 'HIDDEN';

export interface AdminResourceItem {
  createdAt: string;
  description: string | null;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  id: number;
  lectureId: number | null;
  lectureTitle: string | null;
  mimeType: string | null;
  programId: number | null;
  programTitle: string | null;
  scope: AdminResourceScope;
  sortOrder: number;
  title: string;
  visibility: AdminResourceVisibility;
}

export interface AdminResourceUpsertPayload {
  description: string | null;
  fileName: string;
  lectureId: number | null;
  mediaAssetId: number | null;
  programId: number | null;
  scope: AdminResourceScope;
  sortOrder: number;
  title: string;
  visibility: AdminResourceVisibility;
}
