export interface AdminProblemLectureSummary {
  attemptCount: number;
  averageScore: number | null;
  hasProblem: boolean;
  lastSubmittedAt: string | null;
  lastUpdatedAt: string | null;
  lectureId: number;
  questionCount: number;
  problemId: number | null;
}
