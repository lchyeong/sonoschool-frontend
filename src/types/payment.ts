export type PaymentStatus = 'PENDING' | 'REGISTERED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'BANK' | 'MOBILE' | 'POINT' | 'GIFT';
export type PaymentMethodValue =
  | PaymentMethod
  | 'BANK_TRANSFER'
  | 'VIRTUAL_ACCOUNT'
  | (string & {});
export type PaymentOrderType = 'PROGRAM' | 'CART_CHECKOUT';

export interface PaymentInitiatePayload {
  orderType: 'PROGRAM';
  orderReference: string;
  paymentMethod: PaymentMethod;
}

export interface CheckoutPaymentInitiatePayload {
  cartItemIds: number[];
  selectedCouponId: number | null;
  paymentMethod: PaymentMethod;
}

export interface KcpPcPrepareResponse {
  paymentId: number;
  jsUrl: string;
  siteCd: string;
  siteName: string;
  currency: string;
  payMethod: string;
  ordrIdxx: string;
  goodMny: number;
  goodName: string;
  shopUserId: string;
  buyrName: string;
  buyrMail: string;
  buyrTel2: string;
  goodExpr: string;
}

export interface KcpMobileRegisterResponse {
  paymentId: number;
  siteCd: string;
  payMethod: string;
  currency: string;
  approvalKey: string;
  payUrl: string;
  retUrl: string;
  ordrIdxx: string;
  goodName: string;
  goodMny: number;
  shopUserId: string;
  buyrName: string;
  buyrMail: string;
  hashData: string;
  traceNo: string;
  paymentMethodCode: string;
}

export interface KcpPcApprovePayload {
  paymentId: number;
  encData: string;
  encInfo: string;
  tranCd: string;
  resCd: string | null;
  resMsg: string | null;
}

export interface MockCheckoutRedirectPayload {
  paymentId: number;
  resultToken: string;
  status: PaymentStatus;
  code: string | null;
  gatewayOrderId: string;
  message: string;
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK: '계좌이체',
  CARD: '카드 결제',
  GIFT: '상품권',
  MOBILE: '휴대폰 결제',
  POINT: '포인트',
};

const legacyPaymentMethodLabels: Record<'BANK_TRANSFER' | 'VIRTUAL_ACCOUNT', string> = {
  BANK_TRANSFER: '계좌이체',
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
  if (Object.prototype.hasOwnProperty.call(legacyPaymentMethodLabels, value)) {
    return legacyPaymentMethodLabels[value as 'BANK_TRANSFER' | 'VIRTUAL_ACCOUNT'];
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
