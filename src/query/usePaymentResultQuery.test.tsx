import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchPaymentResultMock, fetchPaymentResultByTokenMock } = vi.hoisted(() => {
  return {
    fetchPaymentResultByTokenMock: vi.fn(),
    fetchPaymentResultMock: vi.fn(),
  };
});

vi.mock('@/api/payments', () => {
  return {
    fetchPaymentResult: fetchPaymentResultMock,
    fetchPaymentResultByToken: fetchPaymentResultByTokenMock,
  };
});

import { usePaymentResultQuery } from '@/query/usePaymentResultQuery';
import type { PaymentResult } from '@/types/payment';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockPaymentResult: PaymentResult = {
  id: 301,
  orderType: 'CART_CHECKOUT',
  orderName: 'POCUS 워크숍 외 2건',
  orderNumber: 'ORD-301',
  amount: 419000,
  paymentMethod: 'CARD',
  approvedAmount: 419000,
  receiptUrl: 'https://example.com/receipt',
  status: 'COMPLETED',
  requestedAt: '2026-03-24T00:00:00Z',
  registeredAt: null,
  paidAt: '2026-03-24T00:01:00Z',
  failedAt: null,
  cancelledAt: null,
  cancelReason: null,
};

describe('usePaymentResultQuery', () => {
  beforeEach(() => {
    fetchPaymentResultMock.mockReset();
    fetchPaymentResultByTokenMock.mockReset();
  });

  it('uses the result token when token lookup succeeds', async () => {
    fetchPaymentResultByTokenMock.mockResolvedValue(mockPaymentResult);

    const { result } = renderHook(() => usePaymentResultQuery(301, 'signed-token'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetchPaymentResultByTokenMock).toHaveBeenCalledWith('signed-token');
    expect(fetchPaymentResultMock).not.toHaveBeenCalled();
  });

  it('falls back to paymentId lookup when the result token lookup fails', async () => {
    fetchPaymentResultByTokenMock.mockRejectedValue(new Error('token expired'));
    fetchPaymentResultMock.mockResolvedValue(mockPaymentResult);

    const { result } = renderHook(() => usePaymentResultQuery(301, 'expired-token'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetchPaymentResultByTokenMock).toHaveBeenCalledWith('expired-token');
    expect(fetchPaymentResultMock).toHaveBeenCalledWith(301);
    expect(result.current.data).toEqual(mockPaymentResult);
  });
});
