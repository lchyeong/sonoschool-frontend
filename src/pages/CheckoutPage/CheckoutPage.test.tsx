import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CheckoutPage from '@/pages/CheckoutPage/CheckoutPage';
import { resetCartSelectionState, useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import type { CartSummary, UserProfile } from '@/types/mypage';

const testCart: CartSummary = {
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
  totalOriginalPrice: 1326000,
  totalPayablePrice: 1301000,
};

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
const approveKcpPcPaymentMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/mypage', () => ({
  fetchMyApplicationSummary: vi.fn(),
  fetchMyCart: vi.fn(() => Promise.resolve(testCart)),
  fetchMyEnrollmentDetail: vi.fn(),
  fetchMyEnrollments: vi.fn(),
  fetchMyLearningPlayerSnapshot: vi.fn(),
  fetchMyProfile: vi.fn(() => Promise.resolve(testProfile)),
  fetchMyRefunds: vi.fn(),
}));

vi.mock('@/api/payments', () => ({
  approveKcpPcPayment: approveKcpPcPaymentMock,
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
  useToastStore.getState().clearToasts();
  window.localStorage.clear();
  delete window.KCP_Pay_Execute_Web;
  vi.useRealTimers();
});

beforeEach(() => {
  resetCartSelectionState();
  window.localStorage.clear();
  prepareKcpPcCheckoutPaymentMock.mockReset();
  approveKcpPcPaymentMock.mockReset();
});

describe('CheckoutPage', () => {
  it('shows real-checkout summary and allows multi-item checkout', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: '결제하기' })).toBeInTheDocument();
    expect(await screen.findByText('선택 상품 수')).toBeInTheDocument();
    expect(screen.getByText('9개')).toBeInTheDocument();
    expect(screen.getByText('1,301,000원')).toBeInTheDocument();
    expect(
      screen.getByText(
        '현재는 카드 결제를 지원하며, 선택한 장바구니 항목 전체가 한 번에 결제됩니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실결제 진행' })).toBeEnabled();
  });

  it('sends all selected cart item ids to checkout prepare', async () => {
    useCartSelectionStore.setState({
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
      orderReference: 'checkout-draft-1',
      ordrIdxx: 'ORDER-1',
      payMethod: 'CARD',
      paymentId: null,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });
    window.KCP_Pay_Execute_Web = vi.fn();

    renderCheckoutPage();

    expect(await screen.findByText('POCUS 워크숍')).toBeInTheDocument();
    expect(screen.getByText('3개')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '실결제 진행' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '실결제 진행' }));

    await waitFor(() => {
      expect(prepareKcpPcCheckoutPaymentMock).toHaveBeenCalledWith({
        cartItemIds: [55, 100, 101],
        paymentMethod: 'CARD',
      });
    });

    expect(window.KCP_Pay_Execute_Web).toHaveBeenCalledTimes(1);
  });

  it('waits for the delayed KCP executor before opening the payment layer', async () => {
    const delayedExecutor = vi.fn();

    prepareKcpPcCheckoutPaymentMock.mockResolvedValue({
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      buyrTel2: testProfile.phoneNumber,
      currency: 'WON',
      goodExpr: '0',
      goodMny: 419000,
      goodName: 'POCUS 워크숍 외 2건',
      jsUrl: 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
      orderReference: 'checkout-draft-2',
      ordrIdxx: 'ORDER-2',
      payMethod: 'CARD',
      paymentId: null,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });

    const appendSpy = vi
      .spyOn(document.head, 'append')
      .mockImplementation((...args: Array<string | Node>) => {
        const script = args[0] as HTMLScriptElement;

        window.setTimeout(() => {
          script.onload?.(new Event('load'));

          window.setTimeout(() => {
            window.KCP_Pay_Execute_Web = delayedExecutor;
          }, 80);
        }, 0);

        return;
      });

    renderCheckoutPage();

    const payButton = await screen.findByRole('button', { name: '결제창 준비 중...' });

    await waitFor(() => {
      expect(payButton).toHaveTextContent('실결제 진행');
      expect(payButton).toBeEnabled();
    });

    fireEvent.click(payButton);

    await waitFor(() => {
      expect(delayedExecutor).toHaveBeenCalledTimes(1);
    });

    appendSpy.mockRestore();
  });

  it('locks background scroll while the KCP payment layer is visible', async () => {
    prepareKcpPcCheckoutPaymentMock.mockResolvedValue({
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      buyrTel2: testProfile.phoneNumber,
      currency: 'WON',
      goodExpr: '0',
      goodMny: 419000,
      goodName: 'POCUS 워크숍 외 2건',
      jsUrl: 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
      orderReference: 'checkout-draft-3',
      ordrIdxx: 'ORDER-3',
      payMethod: 'CARD',
      paymentId: null,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });
    window.KCP_Pay_Execute_Web = vi.fn();

    renderCheckoutPage();

    fireEvent.click(await screen.findByRole('button', { name: '실결제 진행' }));

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.touchAction).toBe('none');
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.documentElement.style.overscrollBehavior).toBe('none');
    });

    window.dispatchEvent(new Event('pagehide'));

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.touchAction || '').toBe('');
      expect(document.documentElement.style.overflow).toBe('');
      expect(document.documentElement.style.overscrollBehavior || '').toBe('');
    });
  });

  it('re-prepares checkout automatically when the payment window open step fails', async () => {
    prepareKcpPcCheckoutPaymentMock.mockResolvedValue({
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      buyrTel2: testProfile.phoneNumber,
      currency: 'WON',
      goodExpr: '0',
      goodMny: 419000,
      goodName: 'POCUS 워크숍 외 2건',
      jsUrl: 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
      orderReference: 'checkout-draft-retry',
      ordrIdxx: 'ORDER-RETRY',
      payMethod: 'CARD',
      paymentId: null,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });
    window.KCP_Pay_Execute_Web = vi.fn();

    renderCheckoutPage();

    const payButton = await screen.findByRole('button', { name: '실결제 진행' });
    delete window.KCP_Pay_Execute_Web;

    fireEvent.click(payButton);

    await waitFor(() => {
      expect(prepareKcpPcCheckoutPaymentMock).toHaveBeenCalledTimes(2);
    });
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
      '결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
  });

  it('recovers when the user returns after closing the payment window without completing', async () => {
    prepareKcpPcCheckoutPaymentMock.mockResolvedValue({
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      buyrTel2: testProfile.phoneNumber,
      currency: 'WON',
      goodExpr: '0',
      goodMny: 419000,
      goodName: 'POCUS 워크숍 외 2건',
      jsUrl: 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
      orderReference: 'checkout-draft-return',
      ordrIdxx: 'ORDER-RETURN',
      payMethod: 'CARD',
      paymentId: null,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });
    window.KCP_Pay_Execute_Web = vi.fn();

    renderCheckoutPage();

    const payButton = await screen.findByRole('button', { name: '실결제 진행' });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });

    window.dispatchEvent(new Event('focus'));

    await waitFor(
      () => {
        expect(prepareKcpPcCheckoutPaymentMock).toHaveBeenCalledTimes(2);
        expect(document.body.style.overflow).toBe('');
      },
      { timeout: 3000 },
    );
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
      '결제창이 닫혀 결제가 완료되지 않았습니다. 다시 시도해 주세요.',
    );
  });

  it('keeps the user on checkout when the payment window reports a user cancellation', async () => {
    prepareKcpPcCheckoutPaymentMock.mockResolvedValue({
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      buyrTel2: testProfile.phoneNumber,
      currency: 'WON',
      goodExpr: '0',
      goodMny: 419000,
      goodName: 'POCUS 워크숍 외 2건',
      jsUrl: 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
      orderReference: 'checkout-draft-cancel',
      ordrIdxx: 'ORDER-CANCEL',
      payMethod: 'CARD',
      paymentId: null,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });
    window.KCP_Pay_Execute_Web = vi.fn();

    renderCheckoutPage();

    fireEvent.click(await screen.findByRole('button', { name: '실결제 진행' }));

    await waitFor(() => {
      expect(typeof window.m_Completepayment).toBe('function');
    });

    await window.m_Completepayment?.(
      {
        res_cd: '3001',
        res_msg: '사용자 취소',
      },
      undefined,
    );

    await waitFor(() => {
      expect(prepareKcpPcCheckoutPaymentMock).toHaveBeenCalledTimes(2);
    });
    expect(approveKcpPcPaymentMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: '결제하기' })).toBeInTheDocument();
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
      '결제가 취소되었습니다. 다시 결제를 진행해 주세요.',
    );
  });
});
