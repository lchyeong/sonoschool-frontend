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
    canCancel: payment.status === 'COMPLETED',
    completedLectureCount: payment.status === 'COMPLETED' ? 3 : 0,
    failedAt: payment.failedAt,
    orderName: payment.orderName,
    orderNumber: payment.orderNumber,
    orderType: payment.orderType,
    paidAt: payment.paidAt,
    paymentId: payment.id,
    paymentMethod: payment.paymentMethod,
    receiptUrl: payment.receiptUrl,
    registeredAt: payment.registeredAt,
    requestedAt: payment.requestedAt,
    status: payment.status,
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
      completedLectureCount: payment.completedLectureCount,
      orderName: payment.orderName,
      orderNumber: payment.orderNumber,
      orderType: payment.orderType,
      paidAt: payment.paidAt,
      paymentId: payment.paymentId,
      paymentMethod: payment.paymentMethod,
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
): AdminPaymentDetail | null => {
  const targetIndex = adminPaymentDetails.findIndex((item) => item.paymentId === paymentId);

  if (targetIndex < 0) {
    return null;
  }

  const current = adminPaymentDetails[targetIndex];

  if (!current || current.status !== 'COMPLETED') {
    return null;
  }

  const nextPayment: AdminPaymentDetail = {
    ...current,
    canCancel: false,
    cancelReason: reason,
    cancelledAt: '2026-03-21T02:00:00Z',
    status: 'CANCELLED',
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
