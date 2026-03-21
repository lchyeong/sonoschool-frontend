import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import CartPage from '@/pages/CartPage/CartPage';
import CheckoutPage from '@/pages/CheckoutPage/CheckoutPage';
import ProgramPage from '@/pages/ProgramPage/ProgramPage';
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

const renderProgramPage = (initialEntry: string) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ProgramPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const renderProgramAndCartRoutes = (initialEntry: string) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path='/programs/*' element={<ProgramPage />} />
          <Route path='/cart' element={<CartPage />} />
          <Route path='/payments/checkout' element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  resetCartSelectionState();
  window.localStorage.clear();
});

describe('ProgramPage', () => {
  it('renders a collection page when the selected menu still has descendant lectures', async () => {
    renderProgramPage('/programs/general-course');

    expect(await screen.findByRole('heading', { name: '일반과정' })).toBeInTheDocument();
    expect(screen.getByText('Clinical Curriculum')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '복부과정' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '복부 Basic 스캔 6주' }).length).toBeGreaterThan(0);
  });

  it('shows the direct parent menu name in the eyebrow for lower collection hubs', async () => {
    renderProgramPage('/programs/general-course/abdomen');

    const heading = await screen.findByRole('heading', { level: 1, name: '복부과정' });

    expect(heading).toBeInTheDocument();
    expect(
      within(heading.closest('section') as HTMLElement).getByText('일반과정'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '복부 Basic 스캔 6주' }).length).toBeGreaterThan(0);
  });

  it('renders newly added collection hubs with their parent context', async () => {
    renderProgramPage('/programs/general-course/neck-course');

    const heading = await screen.findByRole('heading', { level: 1, name: '두경부과정' });

    expect(heading).toBeInTheDocument();
    expect(
      within(heading.closest('section') as HTMLElement).getByText('일반과정'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '갑상선 Basic 스캔 6주' }).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByRole('link', { name: '경동맥 Duplex 6주' }).length).toBeGreaterThan(0);
  });

  it('renders a 2-depth doctor-course hub with multiple lectures', async () => {
    renderProgramPage('/programs/doctor-course/internal-medicine');

    const heading = await screen.findByRole('heading', { level: 1, name: '내과과정' });

    expect(heading).toBeInTheDocument();
    expect(
      within(heading.closest('section') as HTMLElement).getByText('의사과정'),
    ).toBeInTheDocument();
    expect(screen.getByText('총 3개 강의를 보여주고 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내과과정 복부 실전 워크숍' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내과과정 간·담도 증례 워크숍' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '내과과정 신장·요로 실습 워크숍' }),
    ).toBeInTheDocument();
  });

  it('renders a 3-depth doctor-course branch and exposes its third-level hubs', async () => {
    renderProgramPage('/programs/doctor-course/pocus');

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: '응급/POCUS과정',
    });

    expect(heading).toBeInTheDocument();
    expect(
      within(heading.closest('section') as HTMLElement).getByText('의사과정'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'FAST 집중과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RUSH 쇼크 평가과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '폐초음파과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '응급 POCUS FAST 집중 워크숍' })).toBeInTheDocument();
  });

  it('renders repeated-title cohort lectures under the abdomen basic hub', async () => {
    renderProgramPage('/programs/general-course/abdomen/abdomen-basic-6-weeks');

    const heading = await screen.findByRole('heading', { level: 1, name: '복부 Basic 스캔 6주' });

    expect(heading).toBeInTheDocument();
    expect(
      within(heading.closest('section') as HTMLElement).getByText('복부과정'),
    ).toBeInTheDocument();
    expect(screen.getByText('총 3개 강의를 보여주고 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('2026.03.01 - 2026.04.30 진행')).toBeInTheDocument();
    expect(screen.getByText('2026.05.01 - 2026.06.30 진행')).toBeInTheDocument();
    expect(screen.getByText('2026.09.01 - 2026.10.31 진행')).toBeInTheDocument();
  });

  it('keeps single-lecture hubs as hub pages until the detail child is opened', async () => {
    renderProgramPage('/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks');

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: '산과 1삼분기 스캔 4주',
    });

    expect(heading).toBeInTheDocument();
    expect(
      within(heading.closest('section') as HTMLElement).getByText('여성초음파과정'),
    ).toBeInTheDocument();
    expect(screen.getByText('총 1개 강의를 보여주고 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '산과 1삼분기 스캔 4주' })).toBeInTheDocument();
  });

  it('renders a cohort lecture detail page on its direct child path', async () => {
    renderProgramPage('/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-mar-apr');

    expect(await screen.findByRole('heading', { name: '복부 Basic 스캔 6주' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '먼저 경험한 수강생들 후기' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '커리큘럼' })).toBeInTheDocument();
    expect(screen.getByText('운영 기간')).toBeInTheDocument();
    expect(screen.getByText('2026.03.01 - 2026.04.30')).toBeInTheDocument();
  });

  it('renders a single-lecture detail page only on the /detail path', async () => {
    renderProgramPage(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '먼저 경험한 수강생들 후기' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '커리큘럼' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '강의 소개' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '예약하기' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수강 신청 하기' })).toBeInTheDocument();
  });

  it('adds the selected lecture to the cart and redirects to the cart page', async () => {
    renderProgramAndCartRoutes(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '장바구니' }));

    expect(await screen.findByRole('heading', { name: '장바구니' })).toBeInTheDocument();
    expect(await screen.findByText('산과 1삼분기 스캔 4주')).toBeInTheDocument();
  });

  it('moves directly to checkout when the apply action is clicked', async () => {
    renderProgramAndCartRoutes(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '수강 신청 하기' }));

    expect(await screen.findByRole('heading', { name: '결제하기' })).toBeInTheDocument();
    expect(await screen.findByText('산과 1삼분기 스캔 4주')).toBeInTheDocument();
    expect(screen.getByText('1개')).toBeInTheDocument();
  });
});
