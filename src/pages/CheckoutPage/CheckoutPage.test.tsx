import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import CheckoutPage from '@/pages/CheckoutPage/CheckoutPage';
import { resetCartSelectionState, useCartSelectionStore } from '@/stores/useCartSelectionStore';

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
});

describe('CheckoutPage', () => {
  it('shows checkout based on the selected cart items and coupon discount', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: '결제하기' })).toBeInTheDocument();
    expect(await screen.findByText('선택 상품 수')).toBeInTheDocument();
    expect(screen.getByText('9개')).toBeInTheDocument();
    expect(screen.getByText('25,000원')).toBeInTheDocument();
    expect(screen.getByText('1,301,000원')).toBeInTheDocument();
    expect(screen.getByText('봄맞이 할인')).toBeInTheDocument();
    expect(screen.queryByText(/적용 쿠폰/)).not.toBeInTheDocument();
    expect(screen.queryByText('선택한 온라인')).not.toBeInTheDocument();
    expect(screen.queryByText('선택한 오프라인')).not.toBeInTheDocument();
  });

  it('shows only checked cart items in the checkout list', async () => {
    useCartSelectionStore.setState({
      selectedCouponId: null,
      selectedItemIds: [55, 56],
    });

    renderCheckoutPage();

    expect(await screen.findByText('POCUS 워크숍')).toBeInTheDocument();
    expect(screen.getByText('심장초음파 실전 마스터 클래스')).toBeInTheDocument();
    expect(screen.queryByText('복부초음파 오프라인 핸즈온')).not.toBeInTheDocument();
    expect(screen.queryByText('FAST 케이스 퀵리뷰')).not.toBeInTheDocument();
    expect(screen.getByText('2개')).toBeInTheDocument();
  });
});
