import type { AdminProblemMediaType } from '@/types/adminProblems';

export interface AdminProblemMediaUploadTarget {
  assetId: number;
  expiresInSeconds: number;
  mediaType: AdminProblemMediaType;
  previewUrl: string;
  uploadUrl: string;
}

export interface AdminProblemMediaUploadTargetRequest {
  contentType: string;
  fileSize: number;
  filename: string;
}
