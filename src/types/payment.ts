export type PaymentStatus = 'PENDING' | 'REGISTERED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'VIRTUAL_ACCOUNT';
export type PaymentMethodValue = PaymentMethod | (string & {});
export type PaymentOrderType = 'PROGRAM' | 'CART_CHECKOUT';

export interface MockCheckoutRedirectPayload {
  paymentId: number;
  resultToken: string;
  status: PaymentStatus;
  code: string | null;
  gatewayOrderId: string;
  message: string;
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK_TRANSFER: '계좌이체',
  CARD: '카드 결제',
  VIRTUAL_ACCOUNT: '가상계좌',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  CANCELLED: '결제 취소',
  COMPLETED: '결제 완료',
  FAILED: '결제 실패',
  PENDING: '결제 대기',
  REGISTERED: '입금 대기',
};

export const formatPaymentMethodLabel = (value: PaymentMethodValue): string => {
  if (Object.prototype.hasOwnProperty.call(paymentMethodLabels, value)) {
    return paymentMethodLabels[value as PaymentMethod];
  }

  return value;
};

export interface PaymentResult {
  id: number;
  buyerKey: string;
  orderType: PaymentOrderType;
  orderReference: string;
  orderName: string;
  amount: number;
  paymentMethod: PaymentMethodValue;
  gateway: string;
  gatewayOrderId: string;
  gatewayTid: string | null;
  gatewayTraceNo: string | null;
  gatewayPayType: string | null;
  gatewayResponseCode: string | null;
  gatewayResponseMessage: string | null;
  approvedAmount: number | null;
  receiptUrl: string | null;
  easyPayProvider: string | null;
  easyPayKind: string | null;
  gatewayServiceCorpId: string | null;
  gatewayCardOtherPayType: string | null;
  cashReceiptIssued: string | null;
  status: PaymentStatus;
  requestedAt: string;
  registeredAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}
