import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import AdminConsolePage from '@/pages/AdminConsolePage/AdminConsolePage';
import ProgramPage from '@/pages/ProgramPage/ProgramPage';
import { adminConsoleRouteTree, appRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useToastStore } from '@/stores/useToastStore';

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

const renderAdminConsolePage = (
  section: 'dashboard' | 'programMenus' | 'programs' = 'dashboard',
) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminConsolePage section={section} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const renderProgramsRoute = (initialEntry = '/programs') => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter([appRouteTree], {
    initialEntries: [initialEntry],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

const renderAdminConsoleRoute = (initialEntry = '/admin/programs') => {
  const queryClient = createTestQueryClient();

  useAdminAuthStore.setState({
    adminDisplayName: '소노스쿨 운영 관리자',
    isAuthenticated: true,
  });

  const router = createMemoryRouter([adminConsoleRouteTree], {
    initialEntries: [initialEntry],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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

afterEach(() => {
  cleanup();
  useAdminAuthStore.setState({
    adminDisplayName: null,
    isAuthenticated: false,
  });
  useToastStore.getState().clearToasts();
});

describe('AdminConsolePage', () => {
  it('renders the admin dashboard summary and navigation cards with mocked data', async () => {
    renderAdminConsolePage();

    expect(await screen.findByRole('heading', { level: 1, name: '운영 개요' })).toBeInTheDocument();
    expect(screen.getByText('운영 중 강의')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /공지사항 관리/i })).toHaveAttribute(
      'href',
      '/admin/notices',
    );
    expect(screen.getByRole('link', { name: /Q&A 관리/i })).toHaveAttribute('href', '/admin/qna');
    expect(screen.getByRole('link', { name: /강의 관리/i })).toHaveAttribute(
      'href',
      '/admin/programs',
    );
  });

  it('starts from a leaf menu lecture list and moves to the dedicated create page when requested', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByText('강의메뉴 기준으로 시작')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryAllByRole('heading', { level: 3, name: '의사과정 / 내과과정 강의 목록' })
          .length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' }).length,
      ).toBeGreaterThan(0);
      expect(
        screen
          .queryAllByRole('button', { name: '새 강의 등록' })
          .some((element) => !element.hasAttribute('disabled')),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: '새 강의 등록' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 강의 등록' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('강의메뉴 기준으로 시작')).not.toBeInTheDocument();
  });

  it('edits a site-linked lecture from admin and reflects the change on the public page', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' }).length,
      ).toBeGreaterThan(0);
    });

    const siteProgramRow =
      screen
        .getAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' })
        .find((element) => element.closest('article'))
        ?.closest('article') ?? null;

    if (!siteProgramRow) {
      throw new Error('사이트 연동 강의 row를 찾지 못했습니다.');
    }

    expect(within(siteProgramRow).getByText('사이트 연동 강의')).toBeInTheDocument();
    const publicPath = within(siteProgramRow)
      .getByRole('link', { name: '공개 페이지' })
      .getAttribute('href');

    fireEvent.click(within(siteProgramRow).getByRole('button', { name: '편집' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '내과과정 복부 실전 워크숍 편집' }),
      ).toBeInTheDocument();
    });

    const editorWorkspace = screen
      .getByRole('heading', {
        level: 1,
        name: '내과과정 복부 실전 워크숍 편집',
      })
      .closest('section');

    if (!editorWorkspace) {
      throw new Error('사이트 연동 강의 편집 워크스페이스를 찾지 못했습니다.');
    }

    await waitFor(() => {
      expect(
        screen.getByLabelText<HTMLInputElement>('공개 URL 슬러그').value.trim().length,
      ).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByLabelText('소개 문구'), {
      target: { value: '사이트 연동 강의 수정 반영을 확인하는 테스트 소개 문구입니다.' },
    });
    const editorForm = editorWorkspace.querySelector('form');

    if (!editorForm) {
      throw new Error('사이트 연동 강의 편집 form을 찾지 못했습니다.');
    }

    fireEvent.submit(editorForm);

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '강의 초안을 저장했습니다.'),
      ).toBe(true);
    });

    cleanup();

    if (!publicPath) {
      throw new Error('사이트 연동 강의 공개 경로를 찾지 못했습니다.');
    }

    renderProgramPage(publicPath);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '내과과정 복부 실전 워크숍' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('사이트 연동 강의 수정 반영을 확인하는 테스트 소개 문구입니다.'),
    ).toBeInTheDocument();
  });

  it('updates shared lecture menu data from admin and reflects it in the public header navigation', async () => {
    renderAdminConsolePage('programMenus');

    expect(
      await screen.findByRole('heading', { level: 1, name: '강의메뉴관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue('doctor-course')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '일반과정 메뉴 선택' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('general-course')).toBeInTheDocument();
    });

    fireEvent.change(await screen.findByLabelText('메뉴명'), {
      target: { value: '일반과정 실습' },
    });
    fireEvent.click(screen.getByRole('button', { name: '메뉴 저장' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '일반과정 실습 메뉴 선택' })).toBeInTheDocument();
    });

    cleanup();

    renderProgramsRoute();

    expect(await screen.findByRole('link', { name: '일반과정 실습' })).toBeInTheDocument();
  });

  it('lets admins collapse and expand the tree, then narrow it down with search', async () => {
    renderAdminConsolePage('programMenus');

    expect(await screen.findByDisplayValue('doctor-course')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '복부과정 메뉴 선택' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '일반과정 하위 메뉴 열기' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '복부과정 메뉴 선택' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '일반과정 하위 메뉴 닫기' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '복부과정 메뉴 선택' })).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('메뉴 검색'), {
      target: { value: '복부 Basic' },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: '복부 Basic 스캔 6주 메뉴 선택' }),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('메뉴 검색'), {
      target: { value: '응급/POCUS과정' },
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '응급/POCUS과정 메뉴 선택' }).length).toBe(2);
    });

    fireEvent.change(screen.getByLabelText('메뉴 검색'), {
      target: { value: 'FAST 집중과정' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'FAST 집중과정 메뉴 선택' })).toBeInTheDocument();
    });
  });

  it('shows descendant-inclusive lecture counts for branch menus in program menu management', async () => {
    renderAdminConsolePage('programMenus');

    expect(await screen.findByDisplayValue('doctor-course')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('메뉴 검색'), {
      target: { value: 'FAST 집중과정' },
    });

    const branchButton = await screen.findByRole('button', { name: '응급/POCUS과정 메뉴 선택' });
    const totalProgramMeta = within(branchButton).getByText('총 강의').closest('div');

    if (!totalProgramMeta) {
      throw new Error('총 강의 메타 정보를 찾지 못했습니다.');
    }

    expect(within(totalProgramMeta).getByText('총 강의')).toBeInTheDocument();
    expect(within(totalProgramMeta).getByText('3개')).toBeInTheDocument();
  });

  it('shows linked lectures and a direct create entry when a leaf menu is selected', async () => {
    renderAdminConsolePage('programMenus');

    expect(await screen.findByDisplayValue('doctor-course')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('메뉴 검색'), {
      target: { value: '복부 Advance 스캔 6주' },
    });
    fireEvent.click(await screen.findByRole('button', { name: '복부 Advance 스캔 6주 메뉴 선택' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('abdomen-advance-6-weeks')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 4, name: '연결 강의' })).toBeInTheDocument();
    expect(screen.getAllByText('복부 Advance 스캔 6주').length).toBeGreaterThan(1);
    expect(screen.getByText('복부 도플러 증례 피드백 4주')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '이 메뉴에 새 강의 만들기' })).toHaveAttribute(
      'href',
      '/admin/programs/new?parentCollectionPath=%2Fprograms%2Fgeneral-course%2Fabdomen%2Fabdomen-advance-6-weeks',
    );
  });

  it('shows repeated-title cohort lectures with schedule labels in the linked program list', async () => {
    renderAdminConsolePage('programMenus');

    expect(await screen.findByDisplayValue('doctor-course')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('메뉴 검색'), {
      target: { value: '복부 Basic 스캔 6주' },
    });
    fireEvent.click(await screen.findByRole('button', { name: '복부 Basic 스캔 6주 메뉴 선택' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('abdomen-basic-6-weeks')).toBeInTheDocument();
    });

    expect(screen.getAllByText('복부 Basic 스캔 6주').length).toBeGreaterThan(2);
    expect(screen.getByText(/2026\.03\.01 - 2026\.04\.30 진행/)).toBeInTheDocument();
    expect(screen.getByText(/2026\.05\.01 - 2026\.06\.30 진행/)).toBeInTheDocument();
    expect(screen.getByText(/2026\.09\.01 - 2026\.10\.31 진행/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '이 메뉴에 새 강의 만들기' })).toHaveAttribute(
      'href',
      '/admin/programs/new?parentCollectionPath=%2Fprograms%2Fgeneral-course%2Fabdomen%2Fabdomen-basic-6-weeks',
    );
  });

  it('moves to a dedicated duplicate page and pre-fills the source lecture', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryAllByRole('heading', { level: 3, name: '의사과정 / 내과과정 강의 목록' })
          .length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' }).length,
      ).toBeGreaterThan(0);
    });

    const siteProgramRow =
      screen
        .getAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' })
        .find((element) => element.closest('article'))
        ?.closest('article') ?? null;

    if (!siteProgramRow) {
      throw new Error('복제할 사이트 연동 강의 row를 찾지 못했습니다.');
    }

    fireEvent.click(within(siteProgramRow).getByRole('button', { name: '복제' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '내과과정 복부 실전 워크숍 복제' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText<HTMLInputElement>('강의명').value).toBe(
      '내과과정 복부 실전 워크숍',
    );
    expect(screen.getByLabelText<HTMLInputElement>('공개 URL 슬러그').value).toBe(
      'abdomen-practice-copy',
    );
  });

  it('restores the lecture list state after returning from the dedicated edit page', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' }).length,
      ).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByLabelText('강의 검색'), {
      target: { value: '워크숍' },
    });
    await waitFor(() => {
      expect(
        screen.queryAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' }).length,
      ).toBeGreaterThan(0);
    });

    const siteProgramRow =
      screen
        .getAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' })
        .find((element) => element.closest('article'))
        ?.closest('article') ?? null;

    if (!siteProgramRow) {
      throw new Error('편집할 사이트 연동 강의 row를 찾지 못했습니다.');
    }

    fireEvent.click(within(siteProgramRow).getByRole('button', { name: '편집' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '내과과정 복부 실전 워크숍 편집' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '목록으로 돌아가기' }));

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();
    expect(screen.getByLabelText<HTMLInputElement>('강의 검색').value).toBe('워크숍');
    expect(
      screen.getByRole('heading', { level: 3, name: '의사과정 / 내과과정 강의 목록' }),
    ).toBeInTheDocument();
  });

  it('shows descendant-inclusive lecture badges for branch menus in lecture management', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('메뉴 검색'), {
      target: { value: 'FAST 집중과정' },
    });

    const branchLabel = await screen.findByText('응급/POCUS과정');
    const branchButton = branchLabel.closest('button');

    if (!branchButton) {
      throw new Error('합산 강의 수를 확인할 브랜치 메뉴 버튼을 찾지 못했습니다.');
    }

    expect(within(branchButton).getByText('총 3강의')).toBeInTheDocument();
  });

  it('creates a lecture from the selected menu page, then publishes it to the public program page', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryAllByRole('heading', { level: 4, name: '내과과정 복부 실전 워크숍' }).length,
      ).toBeGreaterThan(0);
      expect(
        screen
          .queryAllByRole('button', { name: '새 강의 등록' })
          .some((element) => !element.hasAttribute('disabled')),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: '새 강의 등록' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 강의 등록' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('강의명'), {
      target: { value: '테스트 복부 실습 4주' },
    });
    fireEvent.change(screen.getByLabelText('공개 URL 슬러그'), {
      target: { value: 'test-abdomen-practice-4-weeks' },
    });
    fireEvent.change(screen.getByLabelText('모집 시작일'), {
      target: { value: '2026-03-20' },
    });
    fireEvent.change(screen.getByLabelText('모집 종료일'), {
      target: { value: '2026-03-31' },
    });
    const lessonStartDateFields = screen.getAllByLabelText('하위 강의 시작일');
    const lessonEndDateFields = screen.getAllByLabelText('하위 강의 종료일');
    fireEvent.change(lessonStartDateFields[0] as HTMLInputElement, {
      target: { value: '2026-04-07' },
    });
    fireEvent.change(lessonEndDateFields[0] as HTMLInputElement, {
      target: { value: '2026-04-07' },
    });
    fireEvent.change(lessonStartDateFields.at(-1) as HTMLInputElement, {
      target: { value: '2026-05-04' },
    });
    fireEvent.change(lessonEndDateFields.at(-1) as HTMLInputElement, {
      target: { value: '2026-05-04' },
    });
    fireEvent.change(screen.getByLabelText('소개 문구'), {
      target: { value: '관리자 등록 플로우를 검증하기 위한 테스트 강의입니다.' },
    });
    fireEvent.change(screen.getByLabelText('대표 이미지 설명'), {
      target: { value: '테스트 복부 실습 4주 대표 이미지' },
    });

    fireEvent.click(screen.getByRole('button', { name: '게시' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '테스트 복부 실습 4주 편집' }),
      ).toBeInTheDocument();
    });
    const editorWorkspace = screen
      .getByRole('heading', { level: 1, name: '테스트 복부 실습 4주 편집' })
      .closest('section');
    if (!editorWorkspace) {
      throw new Error('편집 워크스페이스를 찾지 못했습니다.');
    }

    await waitFor(() => {
      expect(within(editorWorkspace).getByRole('button', { name: '숨김' })).toBeInTheDocument();
    });
    const publicPath = screen.getByRole('link', { name: '공개 페이지' }).getAttribute('href');

    cleanup();

    if (!publicPath) {
      throw new Error('공개 페이지 링크를 찾지 못했습니다.');
    }
    renderProgramPage(publicPath);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '테스트 복부 실습 4주' })).toBeInTheDocument();
    });
    expect(
      screen.getByText('관리자 등록 플로우를 검증하기 위한 테스트 강의입니다.'),
    ).toBeInTheDocument();
  });
});
