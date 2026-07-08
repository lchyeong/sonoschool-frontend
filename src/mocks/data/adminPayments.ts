import { getMockMyProfile } from '@/mocks/data/mypage';
import { getMockPaymentHistory } from '@/mocks/data/payments';
import type { AdminPaymentDetail, AdminPaymentListItem } from '@/types/adminPayment';

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const createAdminPaymentDetail = (paymentId: number): AdminPaymentDetail | null => {
  const payment = getMockPaymentHistory().find((item) => item.id === paymentId);

  if (!payment) {
    return null;
  }

  const profile = getMockMyProfile();

  return {
    amount: payment.amount,
    approvedAmount: payment.approvedAmount,
    buyerDisplayName: profile.displayName,
    buyerLoginId: profile.loginId,
    cancelReason: payment.cancelReason,
    cancelledAt: payment.cancelledAt,
    cancelledAmount: payment.cancelledAmount,
    canCancel: payment.status === 'COMPLETED',
    completedLectureCount: payment.status === 'COMPLETED' ? 3 : 0,
    failedAt: payment.failedAt,
    orderName: payment.orderName,
    orderNumber: payment.orderNumber,
    orderType: payment.orderType,
    paidAt: payment.paidAt,
    paymentId: payment.id,
    paymentMethod: payment.paymentMethod,
    remainingAmount: payment.remainingAmount,
    receiptUrl: payment.receiptUrl,
    registeredAt: payment.registeredAt,
    requestedAt: payment.requestedAt,
    status: payment.status,
    lastCancelledAt: payment.lastCancelledAt,
    totalLectureCount: payment.status === 'COMPLETED' ? 20 : 0,
  };
};

let adminPaymentDetails = getMockPaymentHistory()
  .map((payment) => createAdminPaymentDetail(payment.id))
  .filter((payment): payment is AdminPaymentDetail => payment !== null);

export const getMockAdminPayments = (): AdminPaymentListItem[] => {
  return cloneData(
    adminPaymentDetails.map((payment) => ({
      amount: payment.amount,
      approvedAmount: payment.approvedAmount,
      buyerDisplayName: payment.buyerDisplayName,
      buyerLoginId: payment.buyerLoginId,
      canCancel: payment.canCancel,
      cancelledAt: payment.cancelledAt,
      cancelledAmount: payment.cancelledAmount,
      completedLectureCount: payment.completedLectureCount,
      lastCancelledAt: payment.lastCancelledAt,
      orderName: payment.orderName,
      orderNumber: payment.orderNumber,
      orderType: payment.orderType,
      paidAt: payment.paidAt,
      paymentId: payment.paymentId,
      paymentMethod: payment.paymentMethod,
      remainingAmount: payment.remainingAmount,
      requestedAt: payment.requestedAt,
      status: payment.status,
      totalLectureCount: payment.totalLectureCount,
    })),
  );
};

export const getMockAdminPaymentDetail = (paymentId: number): AdminPaymentDetail | null => {
  const payment = adminPaymentDetails.find((item) => item.paymentId === paymentId) ?? null;
  return payment ? cloneData(payment) : null;
};

export const cancelMockAdminPayment = (
  paymentId: number,
  reason: string,
  cancelType: 'FULL' | 'PARTIAL' = 'FULL',
  cancelAmount?: number,
): AdminPaymentDetail | null => {
  const targetIndex = adminPaymentDetails.findIndex((item) => item.paymentId === paymentId);

  if (targetIndex < 0) {
    return null;
  }

  const current = adminPaymentDetails[targetIndex];

  if (current.status !== 'COMPLETED' && current.status !== 'PARTIALLY_CANCELLED') {
    return null;
  }

  const approvedAmount = current.approvedAmount ?? current.amount;
  const currentCancelledAmount = current.cancelledAmount;
  const requestedCancelAmount =
    cancelType === 'PARTIAL'
      ? Math.min(cancelAmount ?? 0, Math.max(0, approvedAmount - currentCancelledAmount - 1))
      : approvedAmount - currentCancelledAmount;
  const nextCancelledAmount = Math.min(
    approvedAmount,
    currentCancelledAmount + requestedCancelAmount,
  );
  const nextRemainingAmount = Math.max(0, approvedAmount - nextCancelledAmount);

  const nextPayment: AdminPaymentDetail = {
    ...current,
    canCancel: nextRemainingAmount > 0,
    cancelReason: reason,
    cancelledAt: '2026-03-21T02:00:00Z',
    cancelledAmount: nextCancelledAmount,
    lastCancelledAt: '2026-03-21T02:00:00Z',
    remainingAmount: nextRemainingAmount,
    status: nextRemainingAmount > 0 ? 'PARTIALLY_CANCELLED' : 'CANCELLED',
  };

  adminPaymentDetails = adminPaymentDetails.map((payment) => {
    return payment.paymentId === paymentId ? nextPayment : payment;
  });

  return cloneData(nextPayment);
};

export const resetMockAdminPaymentsData = () => {
  adminPaymentDetails = getMockPaymentHistory()
    .map((payment) => createAdminPaymentDetail(payment.id))
    .filter((payment): payment is AdminPaymentDetail => payment !== null);
};
