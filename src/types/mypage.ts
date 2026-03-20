import type { ProgramCurriculumTrack } from '@/types/programCatalog';

export type EnrollmentStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type ReservationStatus = 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';
export type RefundStatus = 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';
export type ProgramType = 'ONLINE' | 'OFFLINE' | 'HYBRID';
export type CouponDiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE';
export type CouponAppliesTo = 'ALL' | 'ONLINE' | 'OFFLINE';

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
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
  marketingOptInUpdatedAt: string | null;
  role: string;
}

export interface UserProfileUpdatePayload {
  email: string;
  name: string;
  nickname: string;
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
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
}

export interface LectureProgress {
  lectureId: number;
  watchedSeconds: number;
  completed: boolean;
  lastWatchedAt: string | null;
  completedAt: string | null;
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
  progress: LectureProgress[];
}

export interface LearningPlayerSnapshot {
  curriculumTrack: ProgramCurriculumTrack;
  currentLessonId: string | null;
  nextLessonId: string | null;
  completedLessonIds: string[];
  lessonPlaybackById: Record<string, LearningPlayerSource>;
  lastPlaybackAt: string | null;
  resumeAtSeconds: number;
}

export interface LearningPlayerSource {
  lectureId: number;
  mimeType: 'application/x-mpegURL';
  posterUrl: string | null;
}

export interface ProtectedLectureStream {
  expiresAt: number;
  hlsKeyUrl: string;
  hlsUrl: string;
  playbackSessionToken: string;
}

export interface AppliedCoupon {
  id: number;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: number;
  discountAmount: number;
}

export interface UserCoupon {
  id: number;
  code: string;
  name: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  appliesTo: CouponAppliesTo;
  validFromAt: string | null;
  expiresAt: string;
  issuedAt: string;
  usable: boolean;
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
  totalDiscountAmount: number;
  totalPayablePrice: number;
  appliedCoupon: AppliedCoupon | null;
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
  hasOfflineReservation: boolean;
  appliedCoupon: AppliedCoupon | null;
}

export interface OfflineReservation {
  id: number;
  programId: number;
  programTitle: string;
  detailPath: string;
  thumbnailUrl: string | null;
  scheduleId: number;
  scheduleTitle: string;
  scheduleStartAt: string;
  scheduleEndAt: string;
  location: string | null;
  status: ReservationStatus;
  note: string | null;
  createdAt: string;
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
