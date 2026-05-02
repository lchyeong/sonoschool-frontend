export interface AdminProblemAttempt {
  id: number;
  userId: number;
  loginId: string;
  displayName: string;
  score: number;
  passCorrectCount: number;
  passed: boolean;
  submittedAt: string;
}
