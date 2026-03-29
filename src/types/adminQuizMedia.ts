import type { AdminQuizMediaType } from '@/types/adminQuizzes';

export interface AdminQuizMediaUploadTarget {
  assetId: number;
  expiresInSeconds: number;
  mediaType: AdminQuizMediaType;
  previewUrl: string;
  uploadUrl: string;
}

export interface AdminQuizMediaUploadTargetRequest {
  contentType: string;
  fileSize: number;
  filename: string;
}
