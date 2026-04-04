import type { AdminLectureType } from '@/types/adminCurriculum';
import type {
  AdminProgramAccessPolicy,
  AdminProgramFaqItem,
  AdminProgramLevel,
  AdminProgramSummaryInfoItem,
  AdminProgramType,
} from '@/types/adminProgramsLive';
import type { AdminQuizMediaType, AdminQuizQuestionType } from '@/types/adminQuizzes';
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
  instructorBio: string | null;
  instructorName: string | null;
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
  slug: string | null;
  summaryItems: AdminProgramSummaryInfoItem[];
  thumbnailUrl: string | null;
  title: string | null;
}

export interface AdminProgramDraftLecture {
  description: string | null;
  durationSeconds: number | null;
  key: string;
  lectureType: AdminLectureType;
  offlineScheduleRule: AdminProgramDraftLectureOfflineScheduleRule | null;
  practicumDescription: string | null;
  practicumTitle: string | null;
  preview: boolean;
  published: boolean;
  sortOrder: number;
  title: string | null;
  videoId: number | null;
  videoUploadErrorMessage: string | null;
  videoUploadFileName: string | null;
  videoUploadStatus: AdminDraftUploadStatus | null;
}

export interface AdminProgramDraftLectureOfflineScheduleRule {
  endDate: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  startDate: string | null;
  startTime: string | null;
  weekdays: string[];
}

export interface AdminProgramDraftSection {
  description: string | null;
  key: string;
  lectures: AdminProgramDraftLecture[];
  sortOrder: number;
  title: string | null;
}

export interface AdminProgramDraftQuizOption {
  correct: boolean;
  mediaType: null;
  mediaUrl: null;
  optionText: string;
  sortOrder: number;
}

export interface AdminProgramDraftQuizQuestion {
  explanation: string | null;
  mediaAssetId: number | null;
  mediaType: AdminQuizMediaType | null;
  mediaUrl: string | null;
  options: AdminProgramDraftQuizOption[];
  questionText: string;
  questionType: AdminQuizQuestionType;
  sortOrder: number;
}

export interface AdminProgramDraftQuiz {
  description: string | null;
  lectureKey: string;
  passScore: number | null;
  questions: AdminProgramDraftQuizQuestion[];
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
  quizzes: AdminProgramDraftQuiz[];
  resources: AdminProgramDraftResource[];
  sections: AdminProgramDraftSection[];
}

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
