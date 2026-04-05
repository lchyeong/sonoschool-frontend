export type AdminProgramMediaType = 'IMAGE';

export interface AdminProgramThumbnailUploadTargetRequest {
  contentType: string;
  fileSize: number;
  filename: string;
}

export interface AdminProgramThumbnailUploadTarget {
  assetId: number;
  expiresInSeconds: number;
  mediaType: AdminProgramMediaType;
  previewUrl: string;
  storageUrl: string;
  uploadUrl: string;
}
