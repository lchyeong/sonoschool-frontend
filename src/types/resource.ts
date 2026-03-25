export type ResourceScope = 'GLOBAL' | 'PROGRAM';
export type ResourceVisibility = 'PUBLIC' | 'ENROLLED_ONLY';

export interface ResourceItem {
  id: number;
  scope: ResourceScope;
  visibility: ResourceVisibility;
  programId: number | null;
  programTitle: string | null;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sortOrder: number;
  createdAt: string;
}

export interface ResourceDownloadItem {
  documentId: number;
  fileName: string;
  downloadUrl: string;
  expiresAt: number;
}
