import { getMockMyCart } from '@/mocks/data/mypage';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import type {
  MockCheckoutRedirectPayload,
  PaymentMethodValue,
  PaymentResult,
  PaymentStatus,
} from '@/types/payment';
import { calculateSelectedCartPricing } from '@/utils/cartPricing';

interface PaymentScenarioSeed {
  code: string | null;
  orderNumber: string;
  id: number;
  method: PaymentMethodValue;
  paidAt: string | null;
  registeredAt: string | null;
  resultToken: string;
  status: PaymentStatus;
}

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const createOrderName = (): string => {
  const cart = getMockMyCart();
  const selection = useCartSelectionStore.getState();
  const selectedItemIds = selection.selectedItemIds.length
    ? selection.selectedItemIds
    : cart.items.map((item) => item.id);
  const pricing = calculateSelectedCartPricing(cart, selectedItemIds);

  if (!pricing.selectedItems.length) {
    return '손오스쿨 결제';
  }

  if (pricing.selectedItems.length === 1) {
    return pricing.selectedItems[0]?.title ?? '손오스쿨 결제';
  }

  return `${pricing.selectedItems[0]?.title ?? '손오스쿨 결제'} 외 ${String(
    pricing.selectedItems.length - 1,
  )}건`;
};

const createPaymentScenario = (seed: PaymentScenarioSeed): PaymentResult => {
  const cart = getMockMyCart();
  const selection = useCartSelectionStore.getState();
  const selectedItemIds = selection.selectedItemIds.length
    ? selection.selectedItemIds
    : cart.items.map((item) => item.id);
  const pricing = calculateSelectedCartPricing(cart, selectedItemIds);

  return {
    amount: pricing.totalPayablePrice,
    approvedAmount:
      seed.status === 'COMPLETED' ? pricing.totalPayablePrice : seed.status === 'FAILED' ? 0 : null,
    cancelledAmount: seed.status === 'CANCELLED' ? pricing.totalPayablePrice : 0,
    cancelReason: seed.status === 'CANCELLED' ? '관리자 환불 처리' : null,
    cancelledAt: seed.status === 'CANCELLED' ? '2026-03-18T10:20:00Z' : null,
    failedAt: seed.status === 'FAILED' ? '2026-03-18T10:12:00Z' : null,
    id: seed.id,
    orderName: createOrderName(),
    orderNumber: seed.orderNumber,
    orderType: 'CART_CHECKOUT',
    paidAt: seed.paidAt,
    remainingAmount: seed.status === 'CANCELLED' ? 0 : pricing.totalPayablePrice,
    paymentMethod: seed.method,
    receiptUrl:
      seed.status === 'COMPLETED' ? `https://example.com/receipt/${String(seed.id)}` : null,
    registeredAt: seed.registeredAt,
    requestedAt: '2026-03-18T10:00:00Z',
    status: seed.status,
    lastCancelledAt: seed.status === 'CANCELLED' ? '2026-03-18T10:20:00Z' : null,
    purchasedItems: pricing.selectedItems.map((item) => ({
      id: item.id,
      payablePrice: item.payablePrice,
      programType: item.programType,
      thumbnailUrl: item.thumbnailUrl,
      title: item.title,
    })),
  };
};

const paymentScenarioSeeds: PaymentScenarioSeed[] = [
  {
    code: '0000',
    orderNumber: 'ORD-501',
    id: 501,
    method: 'CARD',
    paidAt: '2026-03-18T10:05:00Z',
    registeredAt: '2026-03-18T10:04:00Z',
    resultToken: 'mock-card-completed',
    status: 'COMPLETED',
  },
  {
    code: 'B001',
    orderNumber: 'ORD-502',
    id: 502,
    method: 'CARD',
    paidAt: '2026-03-16T07:35:00Z',
    registeredAt: '2026-03-16T07:34:00Z',
    resultToken: 'mock-card-completed-2',
    status: 'COMPLETED',
  },
  {
    code: 'C001',
    orderNumber: 'ORD-503',
    id: 503,
    method: 'CARD',
    paidAt: '2026-03-12T11:01:00Z',
    registeredAt: '2026-03-12T11:00:00Z',
    resultToken: 'mock-card-cancelled',
    status: 'CANCELLED',
  },
];

const getPaymentScenarios = (): PaymentResult[] => {
  return paymentScenarioSeeds.map(createPaymentScenario);
};

export const getMockPaymentHistory = (): PaymentResult[] => {
  return cloneData(getPaymentScenarios());
};

const getScenarioByPaymentId = (paymentId: number): PaymentResult | null => {
  return getPaymentScenarios().find((payment) => payment.id === paymentId) ?? null;
};

const getScenarioByToken = (token: string): PaymentResult | null => {
  const scenario = paymentScenarioSeeds.find((seed) => seed.resultToken === token);

  if (!scenario) {
    return null;
  }

  return createPaymentScenario(scenario);
};

const getStatusMessage = (payment: PaymentResult): string => {
  switch (payment.status) {
    case 'COMPLETED':
      return '목 결제가 정상 완료되었습니다.';
    case 'FAILED':
      return '목 결제가 승인되지 않았습니다.';
    case 'REGISTERED':
      return '목 결제가 접수되었습니다. 입금 완료 후 상태가 갱신됩니다.';
    case 'CANCELLED':
      return '목 결제가 취소되었습니다.';
    case 'PENDING':
    default:
      return '목 결제 상태를 확인 중입니다.';
  }
};

export const getMockPaymentResult = (paymentId: number): PaymentResult | null => {
  const payment = getScenarioByPaymentId(paymentId);
  return payment ? cloneData(payment) : null;
};

export const getMockPaymentResultByToken = (token: string): PaymentResult | null => {
  const payment = getScenarioByToken(token);
  return payment ? cloneData(payment) : null;
};

export const createMockCheckoutRedirectPayload = (
  paymentMethod: PaymentMethodValue,
): MockCheckoutRedirectPayload => {
  const paymentId = paymentMethod === 'CARD' ? 501 : 502;
  const seed = paymentScenarioSeeds.find((item) => item.id === paymentId);

  if (!seed) {
    throw new Error('목 결제 시나리오를 찾지 못했습니다.');
  }

  const payment = createPaymentScenario(seed);

  return {
    code: seed.code,
    message: getStatusMessage(payment),
    paymentId: payment.id,
    resultToken: seed.resultToken,
    status: payment.status,
  };
};
