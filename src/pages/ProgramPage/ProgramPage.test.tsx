import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CartPage from '@/pages/CartPage/CartPage';
import CheckoutPage from '@/pages/CheckoutPage/CheckoutPage';
import ProgramPage from '@/pages/ProgramPage/ProgramPage';
import { clearStudentSession, setStudentSession } from '@/stores/useAuthStore';
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

const LoginProbe = () => {
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string } } | null;
  const from = state?.from;

  return (
    <div>
      <h1>로그인 페이지</h1>
      <p>이전 경로: {from?.pathname ?? '없음'}</p>
    </div>
  );
};

const renderProgramAndLoginRoutes = (initialEntry: string) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path='/programs/*' element={<ProgramPage />} />
          <Route path='/login' element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const setAuthenticatedStudent = () => {
  setStudentSession({
    accessToken: 'test-token',
    displayName: '테스트 수강생',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    loginId: 'student01',
    role: 'USER',
    tokenType: 'Bearer',
  });
};

const getLectureCountText = (count: number) => {
  return screen.getByText((_, element) => {
    return element?.tagName === 'P' && element.textContent === `총 ${String(count)}개 과정`;
  });
};

afterEach(() => {
  cleanup();
  clearStudentSession();
  resetCartSelectionState();
  window.localStorage.clear();
});

describe('ProgramPage', () => {
  it('renders a collection page when the selected menu still has descendant lectures', async () => {
    renderProgramPage('/programs/general-course');

    expect(await screen.findByRole('heading', { name: '일반과정' })).toBeInTheDocument();
    expect(screen.getByText('SONO SCHOOL')).toBeInTheDocument();
    expect(screen.queryByText('세부 과정')).toBeNull();
    expect(screen.queryByRole('link', { name: '복부과정' })).toBeNull();
    expect(screen.getAllByRole('link', { name: '복부 Basic 스캔 6주' }).length).toBeGreaterThan(0);
  });

  it('renders lower collection hubs without repeating the upper category label', async () => {
    renderProgramPage('/programs/general-course/abdomen');

    const heading = await screen.findByRole('heading', { level: 1, name: '복부과정' });

    expect(heading).toBeInTheDocument();
    expect(within(heading.closest('section') as HTMLElement).queryByText('일반과정')).toBeNull();
    expect(screen.getAllByRole('link', { name: '복부 Basic 스캔 6주' }).length).toBeGreaterThan(0);
  });

  it('renders newly added collection hubs with their parent context', async () => {
    renderProgramPage('/programs/general-course/neck-course');

    const heading = await screen.findByRole('heading', { level: 1, name: '두경부과정' });

    expect(heading).toBeInTheDocument();
    expect(within(heading.closest('section') as HTMLElement).queryByText('일반과정')).toBeNull();
    expect(screen.getAllByRole('link', { name: '갑상선 Basic 스캔 6주' }).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByRole('link', { name: '경동맥 Duplex 6주' }).length).toBeGreaterThan(0);
  });

  it('renders a 2-depth doctor-course hub with multiple lectures', async () => {
    renderProgramPage('/programs/doctor-course/internal-medicine');

    const heading = await screen.findByRole('heading', { level: 1, name: '내과과정' });

    expect(heading).toBeInTheDocument();
    expect(within(heading.closest('section') as HTMLElement).queryByText('의사과정')).toBeNull();
    expect(getLectureCountText(3)).toBeInTheDocument();
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
    expect(within(heading.closest('section') as HTMLElement).queryByText('의사과정')).toBeNull();
    expect(screen.getByRole('link', { name: 'FAST 집중과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RUSH 쇼크 평가과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '폐초음파과정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '응급 POCUS FAST 집중 워크숍' })).toBeInTheDocument();
  });

  it('hides second-level collection chips on first-depth hubs', async () => {
    renderProgramPage('/programs/doctor-course');

    expect(await screen.findByRole('heading', { level: 1, name: '의사과정' })).toBeInTheDocument();
    expect(screen.queryByText('세부 과정')).toBeNull();
    expect(screen.queryByRole('link', { name: '내과과정' })).toBeNull();
    expect(screen.queryByRole('link', { name: '응급/POCUS과정' })).toBeNull();
    expect(getLectureCountText(17)).toBeInTheDocument();
  });

  it('renders repeated-title cohort lectures under the abdomen basic hub', async () => {
    renderProgramPage('/programs/general-course/abdomen/abdomen-basic-6-weeks');

    const heading = await screen.findByRole('heading', { level: 1, name: '복부 Basic 스캔 6주' });
    const breadcrumb = screen.getByRole('navigation', { name: '교육과정 경로' });

    expect(heading).toBeInTheDocument();
    expect(within(breadcrumb).queryByText('교육과정')).toBeNull();
    expect(within(breadcrumb).getByRole('link', { name: '일반과정' })).toHaveAttribute(
      'href',
      '/programs/general-course',
    );
    expect(within(breadcrumb).getByRole('link', { name: '복부과정' })).toHaveAttribute(
      'href',
      '/programs/general-course/abdomen',
    );
    expect(within(breadcrumb).getByText('복부 Basic 스캔 6주')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(heading.closest('section') as HTMLElement).queryByText('복부과정')).toBeNull();
    expect(getLectureCountText(3)).toBeInTheDocument();
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
      within(heading.closest('section') as HTMLElement).queryByText('여성초음파과정'),
    ).toBeNull();
    expect(getLectureCountText(1)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '산과 1삼분기 스캔 4주' })).toBeInTheDocument();
  });

  it('renders a cohort lecture detail page on its direct child path', async () => {
    renderProgramPage('/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-mar-apr');

    expect(await screen.findByRole('heading', { name: '복부 Basic 스캔 6주' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '먼저 경험한 수강생들 후기' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '커리큘럼' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Q&A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '자주하는 질문' })).toBeInTheDocument();
    expect(screen.getByLabelText('운영기간 2026.03.01 - 2026.04.30')).toBeInTheDocument();
    expect(screen.getAllByText('오프라인').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('증례 적용과 복습').closest('button') as HTMLElement);

    expect(screen.getByText('문제풀이')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Q&A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '자주하는 질문' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '예약하기' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '장바구니 담기' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '수강신청하기' }).length).toBeGreaterThan(0);
  });

  it('switches to a dedicated qna tab instead of keeping qna in the one-page scroll', async () => {
    setAuthenticatedStudent();
    renderProgramPage(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Q&A' }));

    expect(
      await screen.findByText('강의 Q&A는 해당 과정의 강의 내용과 관련된 질문을 위한 공간입니다.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '전체 상태' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '답변 완료' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '답변 대기' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Q&A 검색' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '질문 작성' })).toBeInTheDocument();
    expect(await screen.findByText('등록된 질문이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByLabelText('질문 제목')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('질문 내용')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '질문 작성' }));
    expect(await screen.findByRole('heading', { name: 'Q&A 작성' })).toBeInTheDocument();
    expect(screen.getByLabelText('질문 제목')).toBeInTheDocument();
    expect(screen.getByLabelText('질문 내용')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '목록으로' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '등록하기' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '강의 Q&A' })).not.toBeInTheDocument();
    expect(screen.queryByText(/총 \d+건 중 검색 결과 \d+건/)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '번호' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '상태' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '작성자' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '작성일' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작성 닫기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '장바구니 담기' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '먼저 경험한 수강생들 후기' }),
    ).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to login before opening the course qna writer', async () => {
    renderProgramAndLoginRoutes(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Q&A' }));
    expect(await screen.findByRole('button', { name: '질문 작성' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '질문 작성' }));

    expect(await screen.findByRole('heading', { name: '로그인 페이지' })).toBeInTheDocument();
    expect(
      screen.getByText(
        '이전 경로: /programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
      ),
    ).toBeInTheDocument();
  });

  it('moves from the qna tab to the faq section in one interaction flow', async () => {
    renderProgramPage(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    const scrollToSpy = vi.fn();

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
      writable: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Q&A' }));
    expect(await screen.findByRole('button', { name: '질문 작성' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '자주하는 질문' }));

    expect(await screen.findByRole('heading', { name: '자주하는 질문' })).toBeInTheDocument();
    expect(scrollToSpy).toHaveBeenCalledTimes(2);
  });

  it('submits a reservation inquiry without requiring a login session', async () => {
    renderProgramAndCartRoutes(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: '예약하기',
      }),
    );

    const dialog = await screen.findByRole('dialog', { name: '예약 문의하기' });

    fireEvent.change(within(dialog).getByLabelText('이름'), {
      target: { value: '비회원 신청자' },
    });
    fireEvent.change(within(dialog).getByLabelText('휴대폰번호'), {
      target: { value: '01012345678' },
    });
    expect(within(dialog).queryByLabelText('문의 내용')).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '제출하기' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '예약 문의하기' })).not.toBeInTheDocument();
    });
  });

  it('adds the selected lecture to the cart and opens the cart confirmation modal', async () => {
    renderProgramAndCartRoutes(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: '장바구니 담기',
      }),
    );

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAccessibleName('장바구니에 담았습니다');
    expect(within(dialog).getByText('산과 1삼분기 스캔 4주')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '장바구니 보러가기' })).toHaveAttribute(
      'href',
      '/cart',
    );
  });

  it('opens the reservation inquiry modal when the reservation action is clicked', async () => {
    renderProgramAndCartRoutes(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: '예약하기',
      }),
    );

    expect(await screen.findByRole('heading', { name: '예약 문의하기' })).toBeInTheDocument();
    expect(screen.queryByText('일반과정은 방사선사만 신청 가능합니다.')).not.toBeInTheDocument();
    expect(
      screen.getByText('예약 문의 접수 후 담당자가 입력하신 휴대폰번호로 안내드립니다.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('접수 순서와 운영 일정에 따라 안내까지 시간이 걸릴 수 있습니다.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('문의 내용')).not.toBeInTheDocument();
  });

  it('상세 가격 카드에서 신청 상태와 잔여석을 분리해서 보여준다', async () => {
    renderProgramAndCartRoutes(
      '/programs/general-course/women-ultrasound/first-trimester-scan-4-weeks/detail',
    );

    expect(
      await screen.findByRole('heading', { name: '산과 1삼분기 스캔 4주' }),
    ).toBeInTheDocument();

    const pricingSidebar = screen.getByRole('complementary');

    expect(within(pricingSidebar).getByText('수강 가능')).toBeInTheDocument();
    expect(within(pricingSidebar).getByText(/잔여석 \d+명/)).toBeInTheDocument();
    expect(within(pricingSidebar).queryByText(/수강 가능 인원 \d+명 남음/)).not.toBeInTheDocument();
  });
});
