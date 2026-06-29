import type { PaymentStatus } from '@/types/payment';

export interface AdminProgramEnrollmentReview {
  id: number;
  rating: number;
  content: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminProgramEnrollmentItem {
  enrollmentId: number;
  userId: number;
  userName: string;
  loginId: string;
  phoneNumber: string;
  enrollmentStatus: string;
  enrolledAt: string;
  expireAt: string | null;
  paymentId: number | null;
  paymentStatus: PaymentStatus | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  canCancelPayment: boolean;
  canCancelEnrollment: boolean;
  review?: AdminProgramEnrollmentReview | null;
}

export interface AdminProgramEnrollmentReviewUpdatePayload {
  rating: number;
  content: string;
}
