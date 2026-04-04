export type AdminPopupMediaType = 'IMAGE';

export interface AdminPopupMediaUploadTargetRequest {
  contentType: string;
  fileSize: number;
  filename: string;
}

export interface AdminPopupMediaUploadTarget {
  assetId: number;
  expiresInSeconds: number;
  mediaType: AdminPopupMediaType;
  previewUrl: string;
  uploadUrl: string;
}
