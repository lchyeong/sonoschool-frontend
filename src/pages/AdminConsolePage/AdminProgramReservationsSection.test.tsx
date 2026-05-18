import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import AdminProgramReservationsSection from '@/pages/AdminConsolePage/AdminProgramReservationsSection';

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

const renderSection = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminProgramReservationsSection />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
});

describe('AdminProgramReservationsSection', () => {
  it('renders reservation inquiries and advances a new inquiry status', async () => {
    renderSection();

    const row = (await screen.findByText('복부 Basic 스캔 6주')).closest('tr');

    expect(row).not.toBeNull();
    expect(within(row as HTMLTableRowElement).getByText('이찬형')).toBeInTheDocument();
    expect(within(row as HTMLTableRowElement).getByText('01026051835')).toBeInTheDocument();
    expect(within(row as HTMLTableRowElement).getByText('내과')).toBeInTheDocument();
    expect(
      within(row as HTMLTableRowElement).queryByText(
        '/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-mar-apr',
      ),
    ).not.toBeInTheDocument();
    expect(
      within(row as HTMLTableRowElement).queryByText(
        '주말반 개설 일정과 수강 준비물을 상담받고 싶습니다.',
      ),
    ).not.toBeInTheDocument();
    expect(within(row as HTMLTableRowElement).getByText('신규')).toBeInTheDocument();

    fireEvent.click(within(row as HTMLTableRowElement).getByRole('button', { name: '연락완료' }));

    await waitFor(() => {
      expect(within(row as HTMLTableRowElement).getByText('연락완료')).toBeInTheDocument();
    });
  });
});
