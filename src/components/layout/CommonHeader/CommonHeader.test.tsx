import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import CommonHeader from '@/components/layout/CommonHeader/CommonHeader';
import ModalRoot from '@/components/overlay/Modal/ModalRoot';
import { useAuthStore } from '@/stores/useAuthStore';
import { useModalStore } from '@/stores/useModalStore';

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

const renderCommonHeader = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommonHeader
          LinkComponent={Link}
          logo={{ label: 'SONO SCHOOL', to: '/' }}
          siteKey='sono-school-main'
        />
        <ModalRoot />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const setWindowScrollY = (value: number) => {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
    writable: true,
  });
};

afterEach(() => {
  cleanup();
  useModalStore.getState().closeModal();
  useAuthStore.setState({ isAuthenticated: false });
  window.localStorage.clear();
});

describe('CommonHeader', () => {
  it('removes signup action and restores focus after closing the desktop login modal', async () => {
    renderCommonHeader();

    expect(screen.queryByRole('link', { name: '회원가입' })).not.toBeInTheDocument();

    const desktopLoginButton = screen.getByRole('button', { name: '로그인' });

    fireEvent.click(desktopLoginButton);

    const loginDialog = screen.getByRole('dialog', { name: '로그인' });

    expect(loginDialog).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('이메일 또는 아이디')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByLabelText('이메일 또는 아이디'), { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();
    expect(desktopLoginButton).toHaveFocus();
  });

  it('shows validation messages and switches the header to mypage after a successful login', () => {
    renderCommonHeader();

    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    const loginDialog = screen.getByRole('dialog', { name: '로그인' });

    fireEvent.click(within(loginDialog).getByRole('button', { name: '로그인' }));

    expect(screen.getByText('이메일 또는 아이디를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일 또는 아이디')).toHaveFocus();

    fireEvent.change(screen.getByLabelText('이메일 또는 아이디'), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '로그인' })).getByRole('button', {
        name: '로그인',
      }),
    );

    expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '마이페이지' })).toBeInTheDocument();
  });

  it('closes the mobile drawer before opening the login modal', () => {
    renderCommonHeader();

    const mobileMenuButton = screen.getByRole('button', { name: '모바일 메뉴 열기' });

    fireEvent.click(mobileMenuButton);

    const mobileDrawer = screen.getByRole('dialog', { name: '모바일 메뉴' });

    fireEvent.click(within(mobileDrawer).getByRole('button', { name: '로그인' }));

    expect(screen.queryByRole('dialog', { name: '모바일 메뉴' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('이메일 또는 아이디'), { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();
    expect(mobileMenuButton).toHaveFocus();
  });

  it('renders menu descriptions from navigation data in the desktop dropdown', async () => {
    renderCommonHeader();

    const topLevelMenuLink = await screen.findByRole('link', { name: '의사과정' });

    fireEvent.focus(topLevelMenuLink);

    await waitFor(() => {
      expect(
        screen.getByText(
          '의사 대상 오프라인 심화 과정을 전공과 학습 방식에 따라 확인할 수 있습니다.',
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('심초음파 기본부터 임상 판단까지 단계적으로 익히는 의사 대상 과정입니다.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('근골격 초음파 스캔 실습을 짧은 기간에 집중적으로 훈련하는 과정입니다.'),
    ).toBeInTheDocument();
  });

  it('shows newly expanded ultrasound domains in the desktop dropdowns', async () => {
    renderCommonHeader();

    const doctorCoursesLink = await screen.findByRole('link', { name: '의사과정' });

    fireEvent.focus(doctorCoursesLink);

    await waitFor(() => {
      expect(screen.getByText('응급/POCUS과정')).toBeInTheDocument();
    });

    expect(screen.getByText('FAST 집중과정')).toBeInTheDocument();

    const generalCoursesLink = await screen.findByRole('link', { name: '일반과정' });

    fireEvent.focus(generalCoursesLink);

    await waitFor(() => {
      expect(screen.getByText('응급/POCUS과정')).toBeInTheDocument();
    });

    expect(screen.getByText('여성초음파과정')).toBeInTheDocument();

    const onlineCoursesLink = screen.getByRole('link', { name: '온라인과정' });

    fireEvent.focus(onlineCoursesLink);

    await waitFor(() => {
      expect(screen.getByText('POCUS 라이브러리')).toBeInTheDocument();
    });

    expect(screen.getByText('여성초음파 이론')).toBeInTheDocument();
  });

  it('hides the header when scrolling down and shows it again when scrolling up slightly', async () => {
    renderCommonHeader();

    const header = screen.getByRole('banner');

    setWindowScrollY(24);
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header.className).toMatch(/headerHidden/);
    });

    setWindowScrollY(18);
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header.className).not.toMatch(/headerHidden/);
    });
  });

  it('shows the header again when upward scrolling arrives in small increments', async () => {
    renderCommonHeader();

    const header = screen.getByRole('banner');

    setWindowScrollY(24);
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header.className).toMatch(/headerHidden/);
    });

    setWindowScrollY(22);
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header.className).not.toMatch(/headerHidden/);
    });
  });

  it('keeps the header visible when an upward wheel input is followed by residual downward scroll', async () => {
    renderCommonHeader();

    const header = screen.getByRole('banner');

    setWindowScrollY(24);
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header.className).toMatch(/headerHidden/);
    });

    fireEvent.wheel(window, { deltaY: -24 });

    await waitFor(() => {
      expect(header.className).not.toMatch(/headerHidden/);
    });

    setWindowScrollY(26);
    fireEvent.scroll(window);

    expect(header.className).not.toMatch(/headerHidden/);
  });
});
