import type { ProgramCurriculumTrack } from '@/types/programCatalog';

export type EnrollmentStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type RefundStatus = 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';
export type ProgramType = 'ONLINE' | 'OFFLINE' | 'HYBRID' | 'PROBLEM_SOLVING';

export interface AddToCartPayload {
  instructorName: string | null;
  originalPrice: number;
  payablePrice: number;
  programId: number;
  programType: ProgramType;
  salePrice: number | null;
  sourcePath: string;
  thumbnailUrl: string | null;
  title: string;
}

export interface UserProfile {
  loginId: string;
  email: string;
  name: string;
  nickname: string | null;
  displayName: string;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  role: string;
}

export interface UserProfileUpdatePayload {
  nickname: string;
}

export interface UserPasswordVerifyPayload {
  password: string;
}

export interface EnrollmentSummary {
  id: number;
  programId: number;
  programTitle: string;
  programThumbnailUrl: string | null;
  status: EnrollmentStatus;
  active: boolean;
  enrolledAt: string;
  expireAt: string | null;
  totalLectures: number;
  completedLectures: number;
  completionRate: number;
  completed: boolean;
  completedAt: string | null;
  certificateEligible: boolean;
  hasPracticum: boolean;
  reviewWritable?: boolean;
  reviewWritten?: boolean;
  lastLearningAt: string | null;
}

export interface EnrollmentReview {
  id: number;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface LectureProgress {
  lectureId: number;
  watchedSeconds: number;
  completed: boolean;
  lastWatchedAt: string | null;
  completedAt: string | null;
}

export interface LectureProgressSaveResponse {
  lectureId: number;
  watchedSeconds: number;
  completed: boolean;
  lastWatchedAt: string | null;
  completedAt: string | null;
}

export interface LearningPlayerEnrollmentState {
  id: number;
  programId: number;
  programTitle: string;
  status: EnrollmentStatus;
  active: boolean;
  enrolledAt: string;
  expireAt: string | null;
  totalLessons: number;
  completedLessons: number;
  completionRate: number;
}

export interface LearningPlayerLessonProgress {
  lectureId: number;
  watchedSeconds: number;
  completed: boolean;
  progressPercent: number;
  lastWatchedAt: string | null;
  completedAt: string | null;
}

export interface LearningPlayerQnaContext {
  programId: number;
  programThreadCount: number;
}

export interface EnrollmentDetail {
  id: number;
  programId: number;
  programTitle: string;
  status: EnrollmentStatus;
  active: boolean;
  enrolledAt: string;
  expireAt: string | null;
  totalLectures: number;
  completedLectures: number;
  completionRate: number;
  completed: boolean;
  completedAt: string | null;
  certificateEligible: boolean;
  reviewWritable?: boolean;
  reviewWritten?: boolean;
  review?: EnrollmentReview | null;
  progress: LectureProgress[];
}

export interface EnrollmentReviewPayload {
  rating: number;
  content: string;
}

export interface LearningPlayerSnapshot {
  enrollment?: LearningPlayerEnrollmentState;
  curriculumTrack: ProgramCurriculumTrack;
  currentLessonId: string | null;
  nextLessonId: string | null;
  completedLessonIds: string[];
  lessonPlaybackById: Record<string, LearningPlayerSource>;
  lessonProgressByLessonId?: Record<string, LearningPlayerLessonProgress>;
  resourceAttachmentsByLessonId?: Record<string, LearningPlayerResourceAttachment[]>;
  qnaContext?: LearningPlayerQnaContext | undefined;
  lastPlaybackAt: string | null;
  resumeAtSeconds: number;
}

export interface LearningPlayerSource {
  lectureId: number;
  mimeType: 'application/x-mpegURL' | null;
  posterUrl: string | null;
}

export interface LearningPlayerResourceAttachment {
  id: number;
  title: string | null;
  description: string | null;
  fileName: string;
  fileSize: number | null;
  fileUrl: string | null;
  mimeType: string | null;
  sortOrder: number;
  updatedAt?: string | null;
}

export interface ProtectedLectureStream {
  expiresAt: number;
  hlsKeyUrl: string;
  hlsUrl: string;
  playbackSessionToken: string;
}

export interface CartItem {
  id: number;
  programId: number;
  title: string;
  detailPath: string;
  thumbnailUrl: string | null;
  programType: ProgramType;
  instructorName: string | null;
  originalPrice: number;
  salePrice: number | null;
  payablePrice: number;
  saleStartAt: string | null;
  saleEndAt: string | null;
  addedAt: string;
}

export interface CartSummary {
  items: CartItem[];
  itemCount: number;
  totalOriginalPrice: number;
  totalPayablePrice: number;
}

export type UserCouponDiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE';
export type UserCouponAppliesTo = 'ALL' | 'ONLINE' | 'OFFLINE';

export interface UserCoupon {
  appliesTo: UserCouponAppliesTo;
  code: string;
  description: string | null;
  discountType: UserCouponDiscountType;
  discountValue: number;
  expiresAt: string | null;
  id: number;
  issuedAt: string;
  maxDiscountAmount?: number | null;
  minimumOrderAmount: number;
  name: string;
  usable: boolean;
  validFromAt: string | null;
}

export interface ApplicationSummaryItem {
  cartItemId: number;
  programId: number;
  title: string;
  programType: ProgramType;
  payablePrice: number;
}

export interface ApplicationSummary {
  onlineItems: ApplicationSummaryItem[];
  offlineItems: ApplicationSummaryItem[];
  onlinePayablePrice: number;
  offlineItemCount: number;
  hasOnlineCheckout: boolean;
}

export interface RefundHistory {
  id: number;
  programId: number;
  programTitle: string;
  orderName: string;
  status: RefundStatus;
  refundAmount: number;
  requestedAt: string;
  processedAt: string | null;
  paymentMethod: string | null;
  reason: string | null;
}

export type MyQuestionScope = 'GLOBAL' | 'PROGRAM';
export type MyQuestionAuthorType = 'ADMIN' | 'ENROLLED' | 'MEMBER';
export type MyQuestionAnsweredFilter = 'ALL' | 'ANSWERED' | 'WAITING';

export interface MyQuestionReply {
  id: number;
  authorName: string;
  authorType: MyQuestionAuthorType;
  content: string;
  mine: boolean;
  adminReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MyQuestionItem {
  id: number;
  scope: MyQuestionScope;
  programId: number | null;
  programTitle: string | null;
  authorName: string;
  authorType: MyQuestionAuthorType;
  title: string;
  content: string;
  mine: boolean;
  answered: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies: MyQuestionReply[];
}

export interface MyQuestionPage {
  content: MyQuestionItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
