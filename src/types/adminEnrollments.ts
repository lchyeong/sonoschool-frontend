export interface AdminEnrollmentResult {
  active: boolean;
  enrolledAt: string;
  expireAt: string | null;
  id: number;
  programId: number;
  programTitle: string;
  status: string;
}

export interface AdminEnrollmentCreatePayload {
  programId: number;
  userId: number;
}

export interface AdminEnrollmentMaintenanceResult {
  processedAt: string;
  processedCount: number;
}

export interface AdminEnrollmentListItem {
  attemptedQuizCount: number;
  completedLectureCount: number;
  completionRate: number;
  enrollmentId: number;
  enrolledAt: string;
  expireAt: string | null;
  hasPracticumReservation: boolean;
  loginId: string;
  phoneNumber: string;
  programId: number;
  programTitle: string;
  programType: string;
  status: string;
  totalLectureCount: number;
  totalQuizCount: number;
  userId: number;
  userName: string;
}
