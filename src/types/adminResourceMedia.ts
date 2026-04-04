export interface AdminResourceUploadTargetRequest {
  contentType: string;
  fileSize: number;
  filename: string;
}

export interface AdminResourceUploadTarget {
  assetId: number;
  expiresInSeconds: number;
  fileUrl: string;
  uploadUrl: string;
}
