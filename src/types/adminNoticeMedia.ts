export type AdminNoticeMediaDomain = 'NOTICE';
export type AdminNoticeMediaType = 'FILE' | 'IMAGE';

export interface AdminNoticeMediaUploadTargetRequest {
  contentType: string;
  domain: AdminNoticeMediaDomain;
  fileSize: number;
  filename: string;
}

export interface AdminNoticeMediaUploadTarget {
  assetId: number;
  expiresInSeconds: number;
  mediaType: AdminNoticeMediaType;
  previewUrl: string;
  storageUrl: string;
  uploadUrl: string;
}
