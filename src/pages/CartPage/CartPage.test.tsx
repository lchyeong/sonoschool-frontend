import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import CartPage from '@/pages/CartPage/CartPage';
import { resetCartSelectionState } from '@/stores/useCartSelectionStore';

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

const renderCartPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CartPage />
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

describe('CartPage', () => {
  it('renders each cart item title as a lecture detail link', async () => {
    renderCartPage();

    const lectureLink = await screen.findByRole('link', { name: 'POCUS 워크숍' });
    const thumbnail = screen.getByRole('img', { name: 'POCUS 워크숍 대표 이미지' });

    expect(lectureLink).toHaveAttribute('href', '/programs/doctor-course/pocus/fast/2026-mar-apr');
    expect(thumbnail).toHaveAttribute('src');
  });

  it('removes a cart item when the delete action is clicked', async () => {
    renderCartPage();

    expect(await screen.findByText('POCUS 워크숍')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0] as HTMLButtonElement);

    expect(await screen.findByText('심장초음파 실전 마스터 클래스')).toBeInTheDocument();
    expect(screen.queryByText('POCUS 워크숍')).not.toBeInTheDocument();
  });

  it('updates the total when a cart item is unchecked and a coupon is changed', async () => {
    renderCartPage();

    expect(await screen.findByText('1,301,000원')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '복부초음파 오프라인 핸즈온 선택' }));

    expect(await screen.findByText('1,116,000원')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '쿠폰 선택' }));
    fireEvent.click(screen.getByRole('option', { name: /온라인 집중 10%/ }));

    expect(await screen.findByText('1,064,600원')).toBeInTheDocument();
  });
});
