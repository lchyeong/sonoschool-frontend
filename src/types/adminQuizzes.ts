export type AdminQuizQuestionType = 'MULTIPLE' | 'SINGLE' | 'TRUE_FALSE';
export type AdminQuizMediaType = 'IMAGE' | 'VIDEO';

export interface AdminQuizMedia {
  mediaType: AdminQuizMediaType | null;
  mediaAssetId?: number | null;
  mediaPreviewUrl?: string | null;
  mediaUrl: string | null;
}

export interface AdminQuizOption extends AdminQuizMedia {
  correct: boolean;
  id: number;
  optionText: string;
  sortOrder: number;
}

export interface AdminQuizQuestion extends AdminQuizMedia {
  explanation: string | null;
  id: number;
  options: AdminQuizOption[];
  questionText: string;
  questionType: AdminQuizQuestionType;
  sortOrder: number;
}

export interface AdminQuiz {
  description: string | null;
  id: number;
  lectureId: number;
  passScore: number;
  questions: AdminQuizQuestion[];
  title: string;
}

export interface AdminQuizOptionUpsertPayload extends AdminQuizMedia {
  correct: boolean;
  optionText: string;
  sortOrder: number;
}

export interface AdminQuizQuestionUpsertPayload extends AdminQuizMedia {
  explanation: string | null;
  options: AdminQuizOptionUpsertPayload[];
  questionText: string;
  questionType: AdminQuizQuestionType;
  sortOrder: number;
}

export interface AdminQuizUpsertPayload {
  description: string | null;
  passScore: number;
  questions: AdminQuizQuestionUpsertPayload[];
  title: string;
}
