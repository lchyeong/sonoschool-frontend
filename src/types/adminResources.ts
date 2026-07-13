export type AdminResourceScope = 'GLOBAL' | 'PROGRAM';
export type AdminResourceVisibility = 'PUBLIC' | 'ENROLLED_ONLY' | 'HIDDEN';

export interface AdminResourceAttachmentItem {
  documentId: number;
  publicSlug: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  sortOrder: number;
}

export interface AdminResourceItem {
  attachments?: AdminResourceAttachmentItem[];
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
  attachments?: AdminResourceAttachmentPayload[];
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

export interface AdminResourceAttachmentPayload {
  documentId?: number | null;
  fileName: string;
  mediaAssetId?: number | null;
  sortOrder: number;
}
