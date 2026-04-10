export interface AdminProblemAttempt {
  id: number;
  userId: number;
  loginId: string;
  displayName: string;
  score: number;
  passScore: number;
  passed: boolean;
  submittedAt: string;
}
