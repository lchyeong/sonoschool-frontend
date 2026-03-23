import type { PaymentMethodValue, PaymentStatus } from '@/types/payment';

export interface AdminPaymentListItem {
  paymentId: number;
  orderName: string;
  orderType: string;
  buyerLoginId: string;
  buyerDisplayName: string;
  paymentMethod: PaymentMethodValue;
  status: PaymentStatus;
  amount: number;
  approvedAmount: number | null;
  requestedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
}

export interface AdminPaymentDetail {
  paymentId: number;
  orderName: string;
  orderType: string;
  buyerLoginId: string;
  buyerDisplayName: string;
  paymentMethod: PaymentMethodValue;
  status: PaymentStatus;
  amount: number;
  approvedAmount: number | null;
  requestedAt: string;
  registeredAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  receiptUrl: string | null;
  canCancel: boolean;
}
