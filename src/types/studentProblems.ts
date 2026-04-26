export type StudentProblemQuestionType = 'MULTIPLE' | 'SINGLE' | 'TRUE_FALSE';
export type StudentProblemMediaType = 'IMAGE' | 'VIDEO';

export interface StudentProblemMedia {
  mediaType: StudentProblemMediaType | null;
  mediaAssetId?: number | null;
  mediaPreviewUrl?: string | null;
  mediaUrl: string | null;
}

export interface StudentProblemOption extends StudentProblemMedia {
  id: number;
  optionText: string;
  sortOrder: number;
}

export interface StudentProblemQuestion extends StudentProblemMedia {
  id: number;
  questionText: string;
  questionType: StudentProblemQuestionType;
  explanation: string | null;
  sortOrder: number;
  options: StudentProblemOption[];
}

export interface StudentProblem {
  id: number;
  lectureId: number;
  title: string;
  passScore: number;
  timeLimitSeconds: number | null;
  questions: StudentProblemQuestion[];
  session: StudentProblemSession | null;
  latestAttempt: StudentProblemAttemptResult | null;
}

export interface StudentProblemSession {
  status: 'IN_PROGRESS' | 'SUBMITTED';
  answers: Record<number, number[]>;
  flaggedQuestionIds: number[];
  currentQuestionIndex: number;
  elapsedSeconds: number;
  startedAt: string | null;
  remainingSeconds: number | null;
}

export interface StudentProblemSubmitPayload {
  answers: Record<number, number[]>;
  elapsedSeconds: number;
}

export interface StudentProblemSessionSavePayload {
  answers: Record<number, number[]>;
  flaggedQuestionIds: number[];
  currentQuestionIndex: number;
  elapsedSeconds: number;
}

export interface StudentProblemQuestionResult {
  questionId: number;
  questionText: string;
  correct: boolean;
  submittedOptionIds: number[];
  correctOptionIds: number[];
  explanation: string | null;
}

export interface StudentProblemAttemptResult {
  id: number;
  score: number;
  passScore: number;
  passed: boolean;
  submittedAt: string;
  results: StudentProblemQuestionResult[];
}
