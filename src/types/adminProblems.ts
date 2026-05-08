export type AdminProblemQuestionType = 'MULTIPLE' | 'SINGLE' | 'TRUE_FALSE';
export type AdminProblemMediaType = 'IMAGE' | 'VIDEO';

export interface AdminProblemMedia {
  mediaType: AdminProblemMediaType | null;
  mediaAssetId?: number | null;
  mediaVideoId?: number | null;
  mediaPreviewUrl?: string | null;
  mediaUrl: string | null;
}

export interface AdminProblemOption extends AdminProblemMedia {
  correct: boolean;
  id: number;
  optionText: string;
  sortOrder: number;
}

export interface AdminProblemQuestion extends AdminProblemMedia {
  explanation: string | null;
  id: number;
  options: AdminProblemOption[];
  problemAreaId: number;
  problemAreaName: string;
  questionText: string;
  questionType: AdminProblemQuestionType;
  sortOrder: number;
}

export interface AdminProblem {
  id: number;
  lectureId: number;
  passScore: number;
  passCorrectCount: number;
  retakeAllowed: boolean;
  timeLimitSeconds: number | null;
  questions: AdminProblemQuestion[];
  title: string;
}

export interface AdminProblemOptionUpsertPayload extends AdminProblemMedia {
  correct: boolean;
  optionText: string;
  sortOrder: number;
}

export interface AdminProblemQuestionUpsertPayload extends AdminProblemMedia {
  explanation: string | null;
  options: AdminProblemOptionUpsertPayload[];
  problemAreaId: number;
  questionText: string;
  questionType: AdminProblemQuestionType;
  sortOrder: number;
}

export interface AdminProblemUpsertPayload {
  passScore: number;
  retakeAllowed?: boolean | null;
  timeLimitSeconds?: number | null;
  questions: AdminProblemQuestionUpsertPayload[];
  title: string;
}
