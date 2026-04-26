export interface AdminVideoUploadPart {
  partNumber: number;
  uploadUrl: string;
}

export interface AdminVideoProgramSummary {
  categoryName: string;
  id: string;
  programType: 'ONLINE' | 'OFFLINE' | 'HYBRID' | 'PROBLEM_SOLVING';
  title: string;
}

export interface AdminVideoLectureOption {
  id: string;
  sectionTitle: string;
  title: string;
  videoId: number | null;
}

export interface AdminVideoUploadSessionRequest {
  contentType: string;
  fileSize: number;
  filename: string;
  partCount: number;
}

export interface AdminVideoUploadSessionResponse {
  expiresInSeconds: number;
  parts: AdminVideoUploadPart[];
  uploadId: string;
  videoId: number;
}

export interface AdminVideoCompletedPart {
  eTag: string;
  partNumber: number;
}

export interface AdminVideoUploadCompleteRequest {
  parts: AdminVideoCompletedPart[];
  uploadId: string;
}

export interface AdminVideoEncodingStartResponse {
  videoId: number;
}

export type AdminVideoStatus = 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface AdminVideoStatusResponse {
  durationSeconds: number | null;
  errorMessage: string | null;
  fileSize: number | null;
  id: number;
  originalFilename: string;
  progressPercent: number | null;
  status: AdminVideoStatus;
}

export interface AdminVideoSectionResponse {
  description: string | null;
  id: string;
  lectures: AdminLectureVideoAssignmentResponse[];
  sortOrder: number;
  title: string;
}

export interface AdminLectureVideoAssignmentResponse {
  description: string | null;
  durationSeconds: number | null;
  id: string;
  preview: boolean;
  published: boolean;
  sectionId: string;
  sortOrder: number;
  title: string;
  videoId: number | null;
}
