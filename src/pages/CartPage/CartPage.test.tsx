import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import CartPage from '@/pages/CartPage/CartPage';

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
});
