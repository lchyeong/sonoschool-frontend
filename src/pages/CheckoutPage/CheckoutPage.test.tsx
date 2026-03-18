import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import CheckoutPage from '@/pages/CheckoutPage/CheckoutPage';

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
});

describe('CheckoutPage', () => {
  it('shows checkout as a single order flow without online/offline split copy', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: '결제하기' })).toBeInTheDocument();
    expect(
      await screen.findByText('장바구니에 담긴 항목을 하나의 주문으로 결제합니다.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/오프라인 신청 대기/)).not.toBeInTheDocument();
  });
});
