import type { PaymentStatus } from '@/types/payment';

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
}
