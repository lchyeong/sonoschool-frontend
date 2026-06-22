import type { ProgramCurriculumTrack } from '@/types/programCatalog';

export type EnrollmentStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type EnrollmentLearningStatus = 'PENDING' | 'IN_PROGRESS' | 'ENDED' | 'CANCELLED';
export type EnrollmentReviewAction = 'NONE' | 'CREATE' | 'EDIT';
export type RefundStatus = 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';
export type ProgramType = 'ONLINE' | 'OFFLINE' | 'HYBRID' | 'PROBLEM_SOLVING';

export interface AddToCartPayload {
  durationLabel?: string | null;
  instructorName: string | null;
  originalPrice: number;
  payablePrice: number;
  programId: number;
  programType: ProgramType;
  salePrice: number | null;
  sourcePath: string;
  thumbnailCropOffsetX?: number | null | undefined;
  thumbnailCropOffsetY?: number | null | undefined;
  thumbnailCropZoom?: number | null | undefined;
  thumbnailUrl: string | null;
  title: string;
}

export interface UserProfile {
  loginId: string;
  email: string | null;
  name: string;
  nickname: string | null;
  displayName: string;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  role: string;
}

export interface UserProfileUpdatePayload {
  email: string;
  nickname: string | null;
}

export interface UserPasswordVerifyPayload {
  password: string;
}

export interface UserPasswordChangePayload {
  password: string;
  passwordConfirm: string;
}

export interface CertificateProfile {
  registered: boolean;
  koreanName: string | null;
  englishName: string | null;
  lockedAt: string | null;
}

export interface CertificateProfileCreatePayload {
  koreanName: string;
  englishName: string;
}

export interface CertificateDownload {
  blob: Blob;
  filename: string;
}

export interface EnrollmentSummary {
  id: number;
  programId: number;
  programTitle: string;
  programThumbnailUrl: string | null;
  status: EnrollmentStatus;
  active: boolean;
  learningStatus: EnrollmentLearningStatus;
  enrolledAt: string;
  expireAt: string | null;
  totalLectures: number;
  completedLectures: number;
  completionRate: number;
  completed: boolean;
  completedAt: string | null;
  certificateEligible: boolean;
  hasPracticum: boolean;
  reviewAction: EnrollmentReviewAction;
  lastLearningAt: string | null;
}

export interface LearningStartNotice {
  required: boolean;
  accepted: boolean;
  acceptedAt: string | null;
  version: string;
  title: string;
  messages: string[];
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
  learningStatus: EnrollmentLearningStatus;
  enrolledAt: string;
  expireAt: string | null;
  totalLectures: number;
  completedLectures: number;
  completionRate: number;
  completed: boolean;
  completedAt: string | null;
  certificateEligible: boolean;
  reviewAction: EnrollmentReviewAction;
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
  downloadCount?: number;
  downloadLimit?: number;
  remainingDownloadCount?: number;
  downloadable?: boolean;
}

export interface ProtectedLectureStream {
  expiresAt: number;
  hlsKeyUrl: string;
  hlsUrl: string;
  playbackWatermarkSessionCode: string;
  playbackWatermarkText: string;
  playbackSessionToken: string;
}

export interface CartItem {
  id: number;
  programId: number;
  title: string;
  detailPath: string;
  thumbnailUrl: string | null;
  thumbnailCropOffsetX?: number | null | undefined;
  thumbnailCropOffsetY?: number | null | undefined;
  thumbnailCropZoom?: number | null | undefined;
  programType: ProgramType;
  instructorName: string | null;
  originalPrice: number;
  salePrice: number | null;
  payablePrice: number;
  saleStartAt: string | null;
  saleEndAt: string | null;
  durationLabel?: string | null;
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
  privateQuestion: boolean;
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
