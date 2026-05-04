export interface AdminUserSearchItem {
  active: boolean;
  displayName: string;
  email: string;
  id: number;
  loginId: string;
  name: string;
  nickname: string | null;
}

export interface AdminUserManagementItem extends AdminUserSearchItem {
  activeEnrollmentCount: number;
  joinedAt: string | null;
  phoneNumber: string;
  upcomingPracticumCount: number;
}

export interface AdminUserDetailOptionItem {
  optionId: number;
  optionText: string;
}

export interface AdminUserDetailQuestionResultItem {
  correct: boolean;
  correctOptions: AdminUserDetailOptionItem[];
  explanation: string | null;
  problemAreaId?: number | null;
  problemAreaName?: string | null;
  questionId: number;
  questionText: string;
  questionType: string;
  submittedOptions: AdminUserDetailOptionItem[];
}

export interface AdminUserDetailProblemAreaResultItem {
  problemAreaId: number;
  problemAreaName: string;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
}

export interface AdminUserDetailProblemAttemptItem {
  attemptId: number;
  areaResults?: AdminUserDetailProblemAreaResultItem[];
  correctAnswerCount: number;
  correctRate?: number;
  passCorrectCount: number;
  passed: boolean;
  questionCount: number;
  questionResults: AdminUserDetailQuestionResultItem[];
  score: number;
  submittedAt: string | null;
  wrongAnswerCount?: number;
}

export interface AdminUserDetailProblemItem {
  attemptCount: number;
  attempted: boolean;
  attempts: AdminUserDetailProblemAttemptItem[];
  bestScore: number | null;
  lastSubmittedAt: string | null;
  latestCorrectAnswerCount: number | null;
  latestScore: number | null;
  passCorrectCount: number;
  questionCount: number;
  problemId: number;
  title: string;
}

export interface AdminUserDetailLectureItem {
  completed: boolean;
  completedAt: string | null;
  durationSeconds: number | null;
  lastWatchedAt: string | null;
  lectureId: number;
  lectureSortOrder: number;
  lectureTitle: string;
  lectureType: string;
  progressRate: number;
  problem: AdminUserDetailProblemItem | null;
  sectionId: number;
  sectionSortOrder: number;
  sectionTitle: string;
  watchedSeconds: number;
}

export interface AdminUserDetailPaymentItem {
  amount: number;
  approvedAmount: number | null;
  cancelledAt: string | null;
  paidAt: string | null;
  paymentId: number;
  paymentMethod: string;
  paymentStatus: string;
  programId: number | null;
  programTitle: string | null;
  requestedAt: string | null;
}

export interface AdminUserDetailEnrollmentItem {
  attemptedProblemLectureCount: number;
  completedLectureCount: number;
  completionRate: number;
  current: boolean;
  enrolledAt: string | null;
  enrollmentId: number;
  enrollmentStatus: string;
  expireAt: string | null;
  firstLearningAt: string | null;
  lectures: AdminUserDetailLectureItem[];
  lastLearningAt: string | null;
  payment: AdminUserDetailPaymentItem | null;
  programId: number;
  programTitle: string;
  programType: string;
  totalLectureCount: number;
  totalProblemLectureCount: number;
}

export interface AdminUserDetailPaymentSummary {
  cancelledPaymentCount: number;
  completedPaymentCount: number;
  lastPaidAt: string | null;
  totalCancelledAmount: number;
  totalPaidAmount: number;
}

export interface AdminUserDetailMarketingConsentItem {
  agreed: boolean;
  agreedAt: string | null;
  revokedAt: string | null;
  termVersion: string | null;
}

export interface AdminUserDetailCertificateProfileItem {
  englishName: string | null;
  koreanName: string | null;
  lockedAt: string | null;
  registered: boolean;
}

export interface AdminUserDetailQuestionItem {
  answered: boolean;
  content: string;
  createdAt: string | null;
  latestReplyAt: string | null;
  programId: number | null;
  programTitle: string | null;
  questionId: number;
  replyCount: number;
  scope: string;
  title: string;
}

export interface AdminUserDetail {
  active: boolean;
  activeEnrollmentCount: number;
  certificateProfile: AdminUserDetailCertificateProfileItem;
  displayName: string;
  email: string;
  enrollments: AdminUserDetailEnrollmentItem[];
  id: number;
  joinedAt: string | null;
  loginId: string;
  marketingConsent: AdminUserDetailMarketingConsentItem;
  name: string;
  nickname: string | null;
  paymentSummary: AdminUserDetailPaymentSummary;
  payments: AdminUserDetailPaymentItem[];
  phoneNumber: string;
  phoneVerifiedAt: string | null;
  questions: AdminUserDetailQuestionItem[];
  upcomingPracticumCount: number;
}
