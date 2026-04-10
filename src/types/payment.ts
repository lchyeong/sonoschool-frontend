export type PaymentStatus = 'PENDING' | 'REGISTERED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type CheckoutPaymentMethod = 'CARD' | 'FREE';
export type PaymentMethodValue =
  | CheckoutPaymentMethod
  | 'BANK'
  | 'MOBILE'
  | 'POINT'
  | 'GIFT'
  | 'BANK_TRANSFER'
  | 'VIRTUAL_ACCOUNT'
  | (string & {});
export type PaymentOrderType = 'PROGRAM' | 'CART_CHECKOUT';

export interface PaymentInitiatePayload {
  orderType: 'PROGRAM';
  orderReference: string;
  paymentMethod: CheckoutPaymentMethod;
}

export interface CheckoutPaymentInitiatePayload {
  cartItemIds: number[];
  paymentMethod: CheckoutPaymentMethod;
}

export interface KcpPcPrepareResponse {
  paymentId: number | null;
  orderReference: string;
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
  paymentId?: number | null;
  orderReference?: string;
  encData: string;
  encInfo: string;
  tranCd: string;
  resCd: string | null;
  resMsg: string | null;
}

export interface MockCheckoutRedirectPayload {
  paymentId: number | null;
  resultToken: string | null;
  status: PaymentStatus;
  code: string | null;
  message: string;
}

export const paymentMethodLabels: Record<
  'BANK' | 'CARD' | 'FREE' | 'GIFT' | 'MOBILE' | 'POINT',
  string
> = {
  BANK: '계좌이체',
  CARD: '카드 결제',
  FREE: '무료 신청',
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
  REGISTERED: '결제 접수',
};

export const formatPaymentMethodLabel = (value: PaymentMethodValue): string => {
  if (Object.prototype.hasOwnProperty.call(paymentMethodLabels, value)) {
    return paymentMethodLabels[value as keyof typeof paymentMethodLabels];
  }
  if (Object.prototype.hasOwnProperty.call(legacyPaymentMethodLabels, value)) {
    return legacyPaymentMethodLabels[value as 'BANK_TRANSFER' | 'VIRTUAL_ACCOUNT'];
  }

  return value;
};

export interface PaymentResult {
  id: number;
  orderType: PaymentOrderType;
  orderName: string;
  orderNumber: string | null;
  amount: number;
  paymentMethod: PaymentMethodValue;
  approvedAmount: number | null;
  receiptUrl: string | null;
  status: PaymentStatus;
  requestedAt: string;
  registeredAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}
