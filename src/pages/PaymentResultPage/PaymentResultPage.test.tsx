import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PaymentResultPage from '@/pages/PaymentResultPage/PaymentResultPage';
import { usePaymentResultQuery } from '@/query/usePaymentResultQuery';
import type { PaymentResult } from '@/types/payment';

vi.mock('@/query/usePaymentResultQuery', () => ({
  usePaymentResultQuery: vi.fn(),
}));

const mockedUsePaymentResultQuery = vi.mocked(usePaymentResultQuery);

const mockPaymentResult: PaymentResult = {
  id: 301,
  orderType: 'PROGRAM',
  orderName: '복부 초음파 기초 과정',
  orderNumber: 'ORD-301',
  amount: 120000,
  paymentMethod: 'CARD',
  approvedAmount: 120000,
  receiptUrl: 'https://example.com/receipt',
  status: 'COMPLETED',
  requestedAt: '2026-03-18T10:00:00Z',
  registeredAt: '2026-03-18T10:01:00Z',
  paidAt: '2026-03-18T10:02:00Z',
  failedAt: null,
  cancelledAt: null,
  cancelReason: null,
};

const mockPendingPaymentResult: PaymentResult = {
  ...mockPaymentResult,
  amount: 100,
  approvedAmount: null,
  orderName: '내과과정 복부 실전 워크숍',
  orderType: 'CART_CHECKOUT',
  paidAt: null,
  status: 'PENDING',
};

describe('PaymentResultPage', () => {
  beforeEach(() => {
    mockedUsePaymentResultQuery.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders payment details when the payment query succeeds', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: mockPaymentResult,
      error: null,
      isError: false,
      isPending: false,
    } as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?paymentId=301&status=COMPLETED']}>
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '결제가 완료되었습니다.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '결제 정보' })).toBeInTheDocument();
    expect(screen.getByText('복부 초음파 기초 과정')).toBeInTheDocument();
    expect(screen.getByText('단일 강의 결제')).toBeInTheDocument();
    expect(screen.getByText('카드 결제')).toBeInTheDocument();
    expect(screen.getByText('120,000원')).toBeInTheDocument();
    expect(screen.getByText('결제 완료')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 강의로 이동' })).toHaveAttribute('href', '/mypage');
    expect(screen.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '영수증 보기' })).toHaveAttribute(
      'href',
      'https://example.com/receipt',
    );
  });

  it('falls back to redirect parameters when the payment query fails', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: undefined,
      error: new Error('권한이 없어 결제 상세를 읽지 못했습니다.'),
      isError: true,
      isPending: false,
    } as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter
        initialEntries={[
          '/payments/result?status=FAILED&message=결제가 승인되지 않았습니다.',
        ]}
      >
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: '결제가 완료되지 않았습니다.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('결제가 승인되지 않았습니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '결제 정보' })).toBeInTheDocument();
    expect(screen.getByText('결제 실패')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: '영수증 보기' })).not.toBeInTheDocument();
  });

  it('redirects pending fallback results back to checkout', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
    } as unknown as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?status=PENDING']}>
        <Routes>
          <Route element={<PaymentResultPage />} path='/payments/result' />
          <Route element={<div>checkout-page</div>} path='/payments/checkout' />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('checkout-page')).toBeInTheDocument();
  });

  it('hides payment details when the fetched payment is still pending', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: mockPendingPaymentResult,
      error: null,
      isError: false,
      isPending: false,
    } as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?paymentId=401']}>
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '결제가 완료되지 않았습니다.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '결제 정보' })).not.toBeInTheDocument();
  });

  it('redirects cancelled fallback results back to checkout', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
    } as unknown as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?status=CANCELLED']}>
        <Routes>
          <Route element={<PaymentResultPage />} path='/payments/result' />
          <Route element={<div>checkout-page</div>} path='/payments/checkout' />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('checkout-page')).toBeInTheDocument();
  });

  it('renders stored cancelled payments without redirecting to checkout', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: {
        ...mockPaymentResult,
        cancelReason: '사용자 요청 취소',
        cancelledAt: '2026-03-18T10:03:00Z',
        paidAt: null,
        receiptUrl: null,
        status: 'CANCELLED',
      },
      error: null,
      isError: false,
      isPending: false,
    } as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?paymentId=301&status=CANCELLED']}>
        <Routes>
          <Route element={<PaymentResultPage />} path='/payments/result' />
          <Route element={<div>checkout-page</div>} path='/payments/checkout' />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '결제가 취소되었습니다.' })).toBeInTheDocument();
    expect(screen.getByText('사용자 요청 취소')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '결제 정보' })).toBeInTheDocument();
  });
});
