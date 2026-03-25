import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import CommonHeader from '@/components/layout/CommonHeader/CommonHeader';
import styles from '@/components/layout/CommonHeader/CommonHeader.module.scss';
import { useAuthStore } from '@/stores/useAuthStore';

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
        <CommonHeader LinkComponent={Link} logo={{ label: 'SONO SCHOOL', to: '/' }} />
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
  useAuthStore.setState({
    accessToken: '',
    tokenType: '',
    expiresAt: '',
    loginId: '',
    displayName: '',
    role: '',
    isAuthenticated: false,
  });
  window.localStorage.clear();
});

describe('CommonHeader', () => {
  it('renders the desktop login action as a link to the login page', () => {
    renderCommonHeader();

    expect(screen.queryByRole('link', { name: '회원가입' })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  });

  it('switches the header action to mypage when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: '2099-03-17T00:00:00Z',
      loginId: 'student01',
      displayName: '길동',
      role: 'ROLE_STUDENT',
      isAuthenticated: true,
    });

    renderCommonHeader();

    fireEvent.click(screen.getByRole('button', { name: '계정 메뉴' }));

    const myPageLink = screen.getByRole('link', { name: '마이페이지' });
    const logoutButton = screen.getByRole('button', { name: '로그아웃' });

    expect(myPageLink).toBeInTheDocument();
    expect(logoutButton).toBeInTheDocument();
    expect(getComputedStyle(myPageLink).fontSize).toBe(getComputedStyle(logoutButton).fontSize);
    expect(getComputedStyle(myPageLink).fontWeight).toBe(getComputedStyle(logoutButton).fontWeight);
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
  });

  it('applies separate icon size modifiers to cart and account actions', () => {
    useAuthStore.setState({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: '2099-03-17T00:00:00Z',
      loginId: 'student01',
      displayName: '길동',
      role: 'ROLE_STUDENT',
      isAuthenticated: true,
    });

    renderCommonHeader();

    const cartIcon = screen.getAllByRole('link', { name: '장바구니' })[0]?.querySelector('img');
    const accountIcon = screen.getByRole('button', { name: '계정 메뉴' }).querySelector('img');

    expect(cartIcon).toHaveClass(styles['iconImage'], styles['iconImageCart']);
    expect(accountIcon).toHaveClass(styles['iconImage'], styles['iconImageMy']);
  });

  it('shows a cart count badge when cart items exist', async () => {
    useAuthStore.setState({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: '2099-03-17T00:00:00Z',
      loginId: 'student01',
      displayName: '길동',
      role: 'ROLE_STUDENT',
      isAuthenticated: true,
    });

    renderCommonHeader();

    let cartBadges: HTMLElement[] = [];

    await waitFor(() => {
      cartBadges = screen.getAllByTestId('cart-count-badge');
      expect(cartBadges).toHaveLength(2);
    });

    expect(cartBadges[0]?.textContent).toMatch(/^\d+\+?$/);
    expect(cartBadges[0]?.textContent).toBe(cartBadges[1]?.textContent);
  });

  it('hides the header while the KCP payment layer is visible', async () => {
    renderCommonHeader();

    const header = screen.getByRole('banner');

    window.dispatchEvent(
      new CustomEvent('sonoschool:kcp-payment-visibility', {
        detail: { visible: true },
      }),
    );

    await waitFor(() => {
      expect(header.className).toMatch(/headerPaymentHidden/);
    });

    window.dispatchEvent(
      new CustomEvent('sonoschool:kcp-payment-visibility', {
        detail: { visible: false },
      }),
    );

    await waitFor(() => {
      expect(header.className).not.toMatch(/headerPaymentHidden/);
    });
  });

  it('closes the mobile drawer when navigating to the login page', () => {
    renderCommonHeader();

    const mobileMenuButton = screen.getByRole('button', { name: '모바일 메뉴 열기' });

    fireEvent.click(mobileMenuButton);

    const mobileDrawer = screen.getByRole('dialog', { name: '모바일 메뉴' });

    fireEvent.click(within(mobileDrawer).getByRole('link', { name: '로그인' }));

    expect(screen.queryByRole('dialog', { name: '모바일 메뉴' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '로그인' })[0]).toHaveAttribute('href', '/login');
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
