import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CheckoutPage from '@/pages/CheckoutPage/CheckoutPage';
import { resetCartSelectionState, useCartSelectionStore } from '@/stores/useCartSelectionStore';
import type { CartSummary, UserCoupon, UserProfile } from '@/types/mypage';

const testCart: CartSummary = {
  appliedCoupon: null,
  itemCount: 9,
  items: [
    {
      addedAt: '2026-03-22T00:00:00Z',
      detailPath: '/programs/pocus-workshop',
      id: 55,
      instructorName: '장은희',
      originalPrice: 150000,
      payablePrice: 125000,
      programId: 1001,
      programType: 'OFFLINE',
      saleEndAt: null,
      salePrice: 125000,
      saleStartAt: null,
      thumbnailUrl: null,
      title: 'POCUS 워크숍',
    },
    ...Array.from({ length: 8 }, (_, index) => ({
      addedAt: '2026-03-22T00:00:00Z',
      detailPath: `/programs/test-${String(index + 1)}`,
      id: index + 100,
      instructorName: '장은희',
      originalPrice: 150000,
      payablePrice: 147000,
      programId: 2000 + index,
      programType: 'ONLINE' as const,
      saleEndAt: null,
      salePrice: 147000,
      saleStartAt: null,
      thumbnailUrl: null,
      title: `테스트 강의 ${String(index + 1)}`,
    })),
  ],
  totalDiscountAmount: 25000,
  totalOriginalPrice: 1326000,
  totalPayablePrice: 1301000,
};

const testCoupons: UserCoupon[] = [
  {
    appliesTo: 'ALL',
    code: 'SPRING',
    description: '테스트 쿠폰',
    discountType: 'FIXED_AMOUNT',
    discountValue: 25000,
    expiresAt: '2026-04-05T14:59:59Z',
    id: 10,
    issuedAt: '2026-03-12T09:00:00Z',
    minimumOrderAmount: 150000,
    name: '봄맞이 할인',
    usable: true,
    validFromAt: '2026-03-12T09:00:00Z',
  },
];

const testProfile: UserProfile = {
  displayName: '홍길동',
  email: 'student01@example.com',
  loginId: 'student01',
  name: '홍길동',
  nickname: '길벗',
  phoneNumber: '010-1111-2222',
  phoneVerifiedAt: '2026-03-01T09:00:00Z',
  role: 'ROLE_STUDENT',
};

const { prepareKcpPcCheckoutPaymentMock } = vi.hoisted(() => ({
  prepareKcpPcCheckoutPaymentMock: vi.fn(),
}));

vi.mock('@/api/mypage', () => ({
  fetchMyApplicationSummary: vi.fn(),
  fetchMyCart: vi.fn(() => Promise.resolve(testCart)),
  fetchMyCoupons: vi.fn(() => Promise.resolve(testCoupons)),
  fetchMyEnrollmentDetail: vi.fn(),
  fetchMyEnrollments: vi.fn(),
  fetchMyLearningPlayerSnapshot: vi.fn(),
  fetchMyProfile: vi.fn(() => Promise.resolve(testProfile)),
  fetchMyRefunds: vi.fn(),
}));

vi.mock('@/api/payments', () => ({
  approveKcpPcPayment: vi.fn(),
  fetchPaymentHistory: vi.fn(),
  fetchPaymentResult: vi.fn(),
  fetchPaymentResultByToken: vi.fn(),
  prepareKcpPcCheckoutPayment: prepareKcpPcCheckoutPaymentMock,
  prepareKcpPcPayment: vi.fn(),
  registerKcpMobileCheckoutPayment: vi.fn(),
  registerKcpMobilePayment: vi.fn(),
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
};

const renderCheckoutPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  resetCartSelectionState();
  window.localStorage.clear();
});

beforeEach(() => {
  resetCartSelectionState();
  window.localStorage.clear();
  prepareKcpPcCheckoutPaymentMock.mockReset();
});

describe('CheckoutPage', () => {
  it('shows real-checkout summary and allows multi-item checkout', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: '결제하기' })).toBeInTheDocument();
    expect(await screen.findByText('선택 상품 수')).toBeInTheDocument();
    expect(screen.getByText('9개')).toBeInTheDocument();
    expect(screen.getByText('1,301,000원')).toBeInTheDocument();
    expect(screen.getByText('쿠폰 미적용')).toBeInTheDocument();
    expect(
      screen.getByText(
        '현재는 카드 결제를 지원하며, 선택한 장바구니 항목 전체가 한 번에 결제됩니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실결제 진행' })).toBeEnabled();
  });

  it('sends all selected cart item ids and the selected coupon to checkout prepare', async () => {
    useCartSelectionStore.setState({
      selectedCouponId: 10,
      selectedItemIds: [55, 100, 101],
    });
    prepareKcpPcCheckoutPaymentMock.mockResolvedValue({
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      buyrTel2: testProfile.phoneNumber,
      currency: 'WON',
      goodExpr: '0',
      goodMny: 419000,
      goodName: 'POCUS 워크숍 외 2건',
      jsUrl: 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
      ordrIdxx: 'ORDER-1',
      payMethod: 'CARD',
      paymentId: 3000,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });
    window.KCP_Pay_Execute_Web = vi.fn();

    renderCheckoutPage();

    expect(await screen.findByText('POCUS 워크숍')).toBeInTheDocument();
    expect(screen.getByText('3개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실결제 진행' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '실결제 진행' }));

    await waitFor(() => {
      expect(prepareKcpPcCheckoutPaymentMock).toHaveBeenCalledWith({
        cartItemIds: [55, 100, 101],
        paymentMethod: 'CARD',
        selectedCouponId: 10,
      });
    });
  });
});
