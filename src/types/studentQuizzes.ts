export type StudentQuizQuestionType = 'MULTIPLE' | 'SINGLE' | 'TRUE_FALSE';
export type StudentQuizMediaType = 'IMAGE' | 'VIDEO';

export interface StudentQuizMedia {
  mediaType: StudentQuizMediaType | null;
  mediaAssetId?: number | null;
  mediaPreviewUrl?: string | null;
  mediaUrl: string | null;
}

export interface StudentQuizOption extends StudentQuizMedia {
  id: number;
  optionText: string;
  sortOrder: number;
}

export interface StudentQuizQuestion extends StudentQuizMedia {
  id: number;
  questionText: string;
  questionType: StudentQuizQuestionType;
  explanation: string | null;
  sortOrder: number;
  options: StudentQuizOption[];
}

export interface StudentQuiz {
  id: number;
  lectureId: number;
  title: string;
  description: string | null;
  passScore: number;
  questions: StudentQuizQuestion[];
  session: StudentQuizSession | null;
}

export interface StudentQuizSession {
  status: 'IN_PROGRESS' | 'SUBMITTED';
  answers: Record<number, number[]>;
  flaggedQuestionIds: number[];
  currentQuestionIndex: number;
  elapsedSeconds: number;
}

export interface StudentQuizSubmitPayload {
  answers: Record<number, number[]>;
}

export interface StudentQuizSessionSavePayload {
  answers: Record<number, number[]>;
  flaggedQuestionIds: number[];
  currentQuestionIndex: number;
  elapsedSeconds: number;
}

export interface StudentQuizQuestionResult {
  questionId: number;
  questionText: string;
  correct: boolean;
  submittedOptionIds: number[];
  correctOptionIds: number[];
  explanation: string | null;
}

export interface StudentQuizAttemptResult {
  id: number;
  score: number;
  passScore: number;
  passed: boolean;
  submittedAt: string;
  results: StudentQuizQuestionResult[];
}
