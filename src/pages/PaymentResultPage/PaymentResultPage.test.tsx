import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  buyerKey: '10',
  orderType: 'PROGRAM',
  orderReference: '100',
  orderName: '복부 초음파 기초 과정',
  amount: 120000,
  paymentMethod: 'CARD',
  gateway: 'KCP',
  gatewayOrderId: 'KCP-ORDER-1',
  gatewayTid: 'TID-1234',
  gatewayTraceNo: 'TRACE-1',
  gatewayPayType: 'PACA',
  gatewayResponseCode: '0000',
  gatewayResponseMessage: '정상처리',
  approvedAmount: 120000,
  receiptUrl: 'https://example.com/receipt',
  easyPayProvider: 'NONE',
  easyPayKind: 'NONE',
  gatewayServiceCorpId: null,
  gatewayCardOtherPayType: null,
  cashReceiptIssued: null,
  status: 'COMPLETED',
  requestedAt: '2026-03-18T10:00:00Z',
  registeredAt: '2026-03-18T10:01:00Z',
  paidAt: '2026-03-18T10:02:00Z',
  failedAt: null,
  cancelledAt: null,
  cancelReason: null,
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
    expect(screen.getByText('KCP-ORDER-1')).toBeInTheDocument();
    expect(screen.getByText('카드 결제')).toBeInTheDocument();
    expect(screen.getByText('120,000원')).toBeInTheDocument();
    expect(screen.getByText('결제 완료')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 강의로 이동' })).toHaveAttribute(
      'href',
      '/mypage',
    );
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
          '/payments/result?status=FAILED&gatewayOrderId=KCP-ORDER-9&message=결제가 승인되지 않았습니다.',
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
    expect(screen.getByText('KCP-ORDER-9')).toBeInTheDocument();
    expect(screen.getByText('결제 실패')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: '영수증 보기' })).not.toBeInTheDocument();
  });
});
