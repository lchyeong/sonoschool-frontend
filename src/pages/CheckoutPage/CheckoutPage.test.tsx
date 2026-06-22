import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/errors';
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
      durationLabel: '결제일로부터 60일',
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

const {
  completeFreeCheckoutPaymentMock,
  fetchMyCartMock,
  fetchMyProfileMock,
  prepareKcpPcCheckoutPaymentMock,
  registerKcpMobileCheckoutPaymentMock,
} = vi.hoisted(() => ({
  completeFreeCheckoutPaymentMock: vi.fn(),
  fetchMyCartMock: vi.fn(),
  fetchMyProfileMock: vi.fn(),
  prepareKcpPcCheckoutPaymentMock: vi.fn(),
  registerKcpMobileCheckoutPaymentMock: vi.fn(),
}));
const approveKcpPcPaymentMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/mypage', () => ({
  fetchMyApplicationSummary: vi.fn(),
  fetchMyCart: fetchMyCartMock,
  fetchMyEnrollmentDetail: vi.fn(),
  fetchMyEnrollments: vi.fn(),
  fetchMyLearningPlayerSnapshot: vi.fn(),
  fetchMyProfile: fetchMyProfileMock,
  fetchMyRefunds: vi.fn(),
}));

vi.mock('@/api/payments', () => ({
  approveKcpPcPayment: approveKcpPcPaymentMock,
  completeFreeCheckoutPayment: completeFreeCheckoutPaymentMock,
  fetchPaymentHistory: vi.fn(),
  fetchPaymentResult: vi.fn(),
  fetchPaymentResultByToken: vi.fn(),
  prepareKcpPcCheckoutPayment: prepareKcpPcCheckoutPaymentMock,
  prepareKcpPcPayment: vi.fn(),
  registerKcpMobileCheckoutPayment: registerKcpMobileCheckoutPaymentMock,
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

const agreePaymentTerms = async () => {
  fireEvent.click(await screen.findByRole('checkbox', { name: /주문 내용, 결제 금액, 환불정책/ }));
};

const getFormValue = (form: HTMLFormElement, name: string) => {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value : '';
};

afterEach(() => {
  cleanup();
  resetCartSelectionState();
  useToastStore.getState().clearToasts();
  window.localStorage.clear();
  delete window.KCP_Pay_Execute_Web;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

beforeEach(() => {
  resetCartSelectionState();
  window.localStorage.clear();
  fetchMyCartMock.mockReset();
  fetchMyProfileMock.mockReset();
  prepareKcpPcCheckoutPaymentMock.mockReset();
  completeFreeCheckoutPaymentMock.mockReset();
  approveKcpPcPaymentMock.mockReset();
  registerKcpMobileCheckoutPaymentMock.mockReset();
  fetchMyCartMock.mockResolvedValue(testCart);
  fetchMyProfileMock.mockResolvedValue(testProfile);
});

describe('CheckoutPage', () => {
  it('shows real-checkout summary and allows multi-item checkout', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: '결제' })).toBeInTheDocument();
    expect(await screen.findByText('선택 상품 수')).toBeInTheDocument();
    expect(screen.getByText('결제일로부터 60일')).toBeInTheDocument();
    expect(screen.getByText('9개')).toBeInTheDocument();
    expect(screen.getByText('1,301,000원')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '결제 수단' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결제하기' })).toBeDisabled();
    await agreePaymentTerms();
    expect(screen.getByRole('button', { name: '결제하기' })).toBeEnabled();
  });

  it('opens checkout policy content in a modal instead of navigating away', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: '결제' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: '구매조건' })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: '환불정책' }));

    expect(await screen.findByRole('dialog', { name: '환불정책' })).toBeInTheDocument();
    expect(screen.getByText(/환불 요청은 마이페이지 결제 내역/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '환불정책 모달 닫기' }));

    expect(screen.queryByRole('dialog', { name: '환불정책' })).not.toBeInTheDocument();
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
    await agreePaymentTerms();
    expect(await screen.findByRole('button', { name: '결제하기' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '결제하기' }));

    await waitFor(() => {
      expect(prepareKcpPcCheckoutPaymentMock).toHaveBeenCalledWith({
        cartItemIds: [55, 100, 101],
        paymentMethod: 'CARD',
      });
    });

    expect(window.KCP_Pay_Execute_Web).toHaveBeenCalledTimes(1);
  });

  it('submits mobile checkout through the KCP UTF-8 encoding filter', async () => {
    useCartSelectionStore.setState({
      selectedItemIds: [55],
    });
    const userAgentSpy = vi
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile');
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {
      return;
    });

    registerKcpMobileCheckoutPaymentMock.mockResolvedValue({
      approvalKey: 'approval-key',
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      currency: '410',
      encodingTrans: 'UTF-8',
      formActionUrl: 'https://rsmpay.kcp.co.kr/pay/jsp/encodingFilter/encodingFilter.jsp',
      goodMny: 419000,
      goodName: '상복부비뇨기 이론+실습',
      hashData: 'hash',
      ordrIdxx: 'KCP-ORDER-1',
      payMethod: 'CARD',
      payUrl: 'https://rsmpay.kcp.co.kr/pay/mobileGW.kcp',
      paymentId: 900,
      paymentMethodCode: 'CARD',
      retUrl: 'https://api.sonoschool.kr/api/v1/payments/kcp/return',
      shopUserId: '10',
      siteCd: 'T0000',
      traceNo: 'trace',
    });

    renderCheckoutPage();

    await agreePaymentTerms();
    fireEvent.click(await screen.findByRole('button', { name: '결제하기' }));

    await waitFor(() => {
      expect(registerKcpMobileCheckoutPaymentMock).toHaveBeenCalledWith({
        cartItemIds: [55],
        paymentMethod: 'CARD',
      });
    });

    const mobileForm = document.querySelector<HTMLFormElement>(
      'form[action="https://rsmpay.kcp.co.kr/pay/jsp/encodingFilter/encodingFilter.jsp"]',
    );

    expect(mobileForm).not.toBeNull();
    expect(mobileForm?.method).toBe('post');
    expect(mobileForm?.acceptCharset).toBe('UTF-8');
    expect(mobileForm ? getFormValue(mobileForm, 'PayUrl') : '').toBe(
      'https://rsmpay.kcp.co.kr/pay/mobileGW.kcp',
    );
    expect(mobileForm ? getFormValue(mobileForm, 'encoding_trans') : '').toBe('UTF-8');
    expect(mobileForm ? getFormValue(mobileForm, 'good_name') : '').toBe('상복부비뇨기 이론+실습');
    expect(submitSpy).toHaveBeenCalledTimes(1);

    userAgentSpy.mockRestore();
    submitSpy.mockRestore();
  });

  it('uses the free checkout API when the total payable price is zero', async () => {
    fetchMyCartMock.mockResolvedValueOnce({
      ...testCart,
      itemCount: 1,
      items: [
        {
          ...testCart.items[0],
          originalPrice: 0,
          payablePrice: 0,
          salePrice: 0,
        },
      ],
      totalOriginalPrice: 0,
      totalPayablePrice: 0,
    });
    completeFreeCheckoutPaymentMock.mockResolvedValue({
      amount: 0,
      approvedAmount: 0,
      cancelReason: null,
      cancelledAt: null,
      failedAt: null,
      id: 7001,
      orderName: 'POCUS 워크숍',
      orderNumber: 'ORD-FREE-7001',
      orderType: 'CART_CHECKOUT',
      paidAt: '2026-04-06T08:00:00Z',
      paymentMethod: 'FREE',
      receiptUrl: null,
      registeredAt: null,
      requestedAt: '2026-04-06T08:00:00Z',
      status: 'COMPLETED',
    });

    renderCheckoutPage();

    expect(await screen.findByRole('button', { name: '무료 신청' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: '결제 수단' })).not.toBeInTheDocument();
    await agreePaymentTerms();
    fireEvent.click(screen.getByRole('button', { name: '무료 신청' }));

    await waitFor(() => {
      expect(completeFreeCheckoutPaymentMock).toHaveBeenCalledWith({
        cartItemIds: [55],
        paymentMethod: 'FREE',
      });
    });
    expect(prepareKcpPcCheckoutPaymentMock).not.toHaveBeenCalled();
  });

  it('shows a fulfillment wait message while free checkout creates enrollments', async () => {
    fetchMyCartMock.mockResolvedValueOnce({
      ...testCart,
      itemCount: 1,
      items: [
        {
          ...testCart.items[0],
          originalPrice: 0,
          payablePrice: 0,
          salePrice: 0,
        },
      ],
      totalOriginalPrice: 0,
      totalPayablePrice: 0,
    });
    completeFreeCheckoutPaymentMock.mockImplementation(() => new Promise(() => undefined));

    renderCheckoutPage();

    await agreePaymentTerms();
    fireEvent.click(await screen.findByRole('button', { name: '무료 신청' }));

    expect(
      await screen.findByText(
        '수강 등록을 처리 중입니다. 여러 신청이 동시에 들어오면 잠시 걸릴 수 있습니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '신청 처리 중...' })).toBeDisabled();
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
      expect(payButton).toHaveTextContent('결제하기');
    });

    await agreePaymentTerms();
    expect(payButton).toBeEnabled();
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

    await agreePaymentTerms();
    fireEvent.click(await screen.findByRole('button', { name: '결제하기' }));

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

    const payButton = await screen.findByRole('button', { name: '결제하기' });
    await agreePaymentTerms();
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

    const payButton = await screen.findByRole('button', { name: '결제하기' });
    await agreePaymentTerms();
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

    await agreePaymentTerms();
    fireEvent.click(await screen.findByRole('button', { name: '결제하기' }));

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
    expect(screen.getByRole('heading', { name: '결제' })).toBeInTheDocument();
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
      '결제가 취소되었습니다. 다시 결제를 진행해 주세요.',
    );
  });

  it('shows approval wait copy and treats pending fulfillment as a non-retry result', async () => {
    prepareKcpPcCheckoutPaymentMock.mockResolvedValue({
      buyrMail: testProfile.email,
      buyrName: testProfile.name,
      buyrTel2: testProfile.phoneNumber,
      currency: 'WON',
      goodExpr: '0',
      goodMny: 419000,
      goodName: 'POCUS 워크숍 외 2건',
      jsUrl: 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
      orderReference: 'checkout-draft-pending-fulfillment',
      ordrIdxx: 'ORDER-PENDING-FULFILLMENT',
      payMethod: 'CARD',
      paymentId: 901,
      shopUserId: '10',
      siteCd: 'T0000',
      siteName: 'SONOSCHOOL',
    });
    window.KCP_Pay_Execute_Web = vi.fn();
    const rejectApprovalRef: { current: ((error: ApiError) => void) | null } = {
      current: null,
    };
    approveKcpPcPaymentMock.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectApprovalRef.current = reject;
        }),
    );

    renderCheckoutPage();

    await agreePaymentTerms();
    fireEvent.click(await screen.findByRole('button', { name: '결제하기' }));

    await waitFor(() => {
      expect(typeof window.m_Completepayment).toBe('function');
    });

    const completion = window.m_Completepayment?.(
      {
        enc_data: 'encrypted-data',
        enc_info: 'encrypted-info',
        res_cd: '0000',
        res_msg: '정상처리',
        tran_cd: '00100000',
      },
      undefined,
    );

    expect(
      await screen.findByText(
        '결제 승인을 확인하고 수강 등록을 처리 중입니다. 접속자가 많으면 잠시 걸릴 수 있습니다.',
      ),
    ).toBeInTheDocument();
    expect(rejectApprovalRef.current).not.toBeNull();
    rejectApprovalRef.current?.(
      new ApiError({
        code: 'PAYMENT_409_FULFILLMENT_PENDING',
        status: 409,
        userMessage:
          '결제 승인은 완료됐고 수강 등록을 확인 중입니다. 잠시 후 내 강의실을 확인해 주세요.',
      }),
    );
    await completion;
    expect(useToastStore.getState().toasts.at(-1)).toMatchObject({
      message: '결제 승인은 완료됐고 수강 등록을 확인 중입니다. 잠시 후 내 강의실을 확인해 주세요.',
      variant: 'info',
    });
  });
});
