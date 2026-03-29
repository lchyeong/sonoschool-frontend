export interface AdminQuizLectureSummary {
  attemptCount: number;
  averageScore: number | null;
  hasQuiz: boolean;
  lastSubmittedAt: string | null;
  lastUpdatedAt: string | null;
  lectureId: number;
  questionCount: number;
  quizId: number | null;
}
