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

    expect(screen.getByRole('heading', { name: '결제가 완료되었습니다' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '결제 정보' })).toBeInTheDocument();
    expect(screen.getByText('복부 초음파 기초 과정')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '구매한 강의' })).toBeInTheDocument();
    expect(screen.getByText('카드 결제')).toBeInTheDocument();
    expect(screen.getAllByText('120,000원')).toHaveLength(2);
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
        initialEntries={['/payments/result?status=FAILED&message=결제가 승인되지 않았습니다.']}
      >
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: '결제가 완료되지 않았습니다.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('결제가 승인되지 않았습니다.')).toBeInTheDocument();
    expect(screen.getByText('결제 실패')).toBeInTheDocument();
    expect(screen.getByText('주문번호')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '결제 다시 시도' })).toHaveAttribute(
      'href',
      '/payments/checkout',
    );
    expect(screen.getByRole('link', { name: '장바구니로 돌아가기' })).toHaveAttribute(
      'href',
      '/cart',
    );
    expect(screen.queryByRole('link', { name: '홈으로 이동' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '영수증 보기' })).not.toBeInTheDocument();
  });

  it('renders status-check screen for pending fallback results', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
    } as unknown as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?status=PENDING']}>
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '결제 상태를 확인해 주세요' })).toBeInTheDocument();
    expect(screen.getByText('결제 취소 또는 승인 대기')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '결제 다시 시도' })).toHaveAttribute(
      'href',
      '/payments/checkout',
    );
  });

  it('shows a clear wait message while checking payment and enrollment result', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: true,
    } as unknown as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?paymentId=401&status=PENDING']}>
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('결제 승인과 수강 등록 결과를 확인 중입니다. 잠시만 기다려 주세요.'),
    ).toBeInTheDocument();
  });

  it('renders fulfillment-pending results without retry actions', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: {
        ...mockPendingPaymentResult,
        approvedAmount: 100,
        paidAt: '2026-03-18T10:02:00Z',
        status: 'APPROVED_PENDING_FULFILLMENT',
      },
      error: null,
      isError: false,
      isPending: false,
    } as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?paymentId=401']}>
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '수강 등록을 확인 중입니다' })).toBeInTheDocument();
    expect(screen.getByText('수강 등록 확인 중')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 강의로 이동' })).toHaveAttribute('href', '/mypage');
    expect(screen.queryByRole('link', { name: '결제 다시 시도' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '장바구니로 돌아가기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '결제 정보' })).not.toBeInTheDocument();
  });

  it('renders status details when the fetched payment is still pending', () => {
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

    expect(screen.getByRole('heading', { name: '결제 상태를 확인해 주세요' })).toBeInTheDocument();
    expect(screen.getByText('결제 취소 또는 승인 대기')).toBeInTheDocument();
    expect(screen.getByText('ORD-301')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '결제 정보' })).not.toBeInTheDocument();
  });

  it('renders status-check screen for cancelled fallback results', () => {
    mockedUsePaymentResultQuery.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
    } as unknown as ReturnType<typeof usePaymentResultQuery>);

    render(
      <MemoryRouter initialEntries={['/payments/result?status=CANCELLED']}>
        <PaymentResultPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '결제 상태를 확인해 주세요' })).toBeInTheDocument();
    expect(screen.getByText('결제 취소 또는 승인 대기')).toBeInTheDocument();
  });

  it('renders stored cancelled payments as a status-check screen', () => {
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

    expect(screen.getByRole('heading', { name: '결제 상태를 확인해 주세요' })).toBeInTheDocument();
    expect(screen.getByText(/취소 사유:/)).toHaveTextContent('사용자 요청 취소');
    expect(screen.getByText('결제 취소 또는 승인 대기')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '결제 정보' })).not.toBeInTheDocument();
  });
});
