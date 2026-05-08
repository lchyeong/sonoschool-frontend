export type ResourceScope = 'GLOBAL' | 'PROGRAM';
export type ResourceVisibility = 'PUBLIC' | 'ENROLLED_ONLY';

export interface ResourceAttachmentItem {
  documentId: number;
  publicSlug: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sortOrder: number;
}

export interface ResourceItem {
  id: number;
  publicSlug: string;
  scope: ResourceScope;
  visibility: ResourceVisibility;
  programId: number | null;
  programTitle: string | null;
  title: string;
  description: string;
  createdAt: string;
  attachments: ResourceAttachmentItem[];
}
