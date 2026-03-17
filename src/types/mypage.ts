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
  name: string;
  nickname: string;
}

export interface EnrollmentSummary {
  id: number;
  programId: number;
  programTitle: string;
  programThumbnailUrl: string | null;
  status: string;
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
  status: string;
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

export interface AppliedCoupon {
  id: number;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
}

export interface CartItem {
  id: number;
  programId: number;
  title: string;
  thumbnailUrl: string | null;
  programType: string;
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
  programType: string;
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
  scheduleId: number;
  scheduleTitle: string;
  scheduleStartAt: string;
  scheduleEndAt: string;
  location: string | null;
  status: string;
  note: string | null;
  createdAt: string;
}
