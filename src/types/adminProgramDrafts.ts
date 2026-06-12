import type { AdminLectureType } from '@/types/adminCurriculum';
import type { AdminProblemMediaType, AdminProblemQuestionType } from '@/types/adminProblems';
import type {
  AdminProgramAccessPolicy,
  AdminProgramFaqItem,
  AdminProgramLevel,
  AdminProgramSummaryInfoItem,
  AdminProgramType,
} from '@/types/adminProgramsLive';
import type { AdminResourceVisibility } from '@/types/adminResources';

export type AdminProgramDraftStatus = 'ACTIVE' | 'DISCARDED' | 'FINALIZED';
export type AdminDraftUploadStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface AdminProgramDraftBasicInfo {
  accessDays: number | null;
  accessPolicy: AdminProgramAccessPolicy | null;
  categoryId: number | null;
  checklists: string[];
  description: string | null;
  faqs: AdminProgramFaqItem[];
  learningEndAt: string | null;
  learningPoints: string[];
  learningOutcomes: AdminProgramSummaryInfoItem[];
  learningStartAt: string | null;
  level: AdminProgramLevel | null;
  maxStudents: number | null;
  price: number | null;
  programType: AdminProgramType | null;
  recommendedFor: string[];
  saleEndAt: string | null;
  salePrice: number | null;
  saleStartAt: string | null;
  summaryItems: AdminProgramSummaryInfoItem[];
  thumbnailCropOffsetX?: number | null;
  thumbnailCropOffsetY?: number | null;
  thumbnailCropZoom?: number | null;
  thumbnailUrl: string | null;
  thumbnailPreviewUrl?: string | null;
  title: string | null;
}

export interface AdminProgramDraftLecture {
  description: string | null;
  durationSeconds: number | null;
  key: string;
  lectureType: AdminLectureType;
  offlineSchedules: AdminProgramDraftLectureOfflineSchedule[];
  preview: boolean;
  published: boolean;
  sortOrder: number;
  title: string | null;
  videoId: number | null;
  videoUploadErrorMessage: string | null;
  videoUploadFileName: string | null;
  videoUploadStatus: AdminDraftUploadStatus | null;
}

export interface AdminProgramDraftLectureOfflineSchedule {
  date: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  startTime: string | null;
}

export interface AdminProgramDraftSection {
  description: string | null;
  key: string;
  lectures: AdminProgramDraftLecture[];
  sortOrder: number;
  title: string | null;
}

export interface AdminProgramDraftProblemOption {
  correct: boolean;
  mediaType: null;
  mediaUrl: null;
  optionText: string;
  sortOrder: number;
}

export interface AdminProgramDraftProblemQuestion {
  explanation: string | null;
  mediaAssetId: number | null;
  mediaType: AdminProblemMediaType | null;
  mediaUploadErrorMessage: string | null;
  mediaUploadFileName: string | null;
  mediaUploadStatus: AdminDraftUploadStatus | null;
  mediaUrl: string | null;
  mediaVideoId: number | null;
  options: AdminProgramDraftProblemOption[];
  problemAreaId: number | null;
  questionText: string;
  questionType: AdminProblemQuestionType;
  sortOrder: number;
}

export interface AdminProgramDraftProblem {
  lectureKey: string;
  passScore?: number | null;
  problemAreaId?: number | null;
  retakeAllowed?: boolean | null;
  questions: AdminProgramDraftProblemQuestion[];
  timeLimitSeconds?: number | null;
  title: string | null;
}

export interface AdminProgramDraftResource {
  description: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  key: string;
  lectureKey: string;
  mimeType: string | null;
  sortOrder: number;
  title: string | null;
  uploadErrorMessage: string | null;
  uploadStatus: AdminDraftUploadStatus | null;
  visibility: AdminResourceVisibility | null;
}

export interface AdminProgramDraftPayload {
  basicInfo: AdminProgramDraftBasicInfo;
  problems: AdminProgramDraftProblem[];
  resources: AdminProgramDraftResource[];
  sections: AdminProgramDraftSection[];
}

export type AdminProgramDraftQuizOption = AdminProgramDraftProblemOption;
export type AdminProgramDraftQuizQuestion = AdminProgramDraftProblemQuestion;
export type AdminProgramDraftQuiz = AdminProgramDraftProblem;

export interface AdminProgramDraftSummary {
  createdAt: string | null;
  finalProgramId: number | null;
  id: number;
  status: AdminProgramDraftStatus;
  titlePreview: string | null;
  updatedAt: string | null;
}

export interface AdminProgramDraftDetail extends AdminProgramDraftSummary {
  payload: AdminProgramDraftPayload;
}

export interface AdminProgramDraftFinalizeResponse {
  draftId: number;
  programId: number;
}
