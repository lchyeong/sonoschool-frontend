import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { adminAuthRouteTree, adminConsoleRouteTree, appRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useAuthStore } from '@/stores/useAuthStore';

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

afterEach(() => {
  cleanup();
  useAdminAuthStore.setState({
    adminDisplayName: null,
    isAuthenticated: false,
  });
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

describe('router layouts', () => {
  it('does not render the common header and footer on the admin login route', async () => {
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin/login'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '관리자 로그인' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: env.appName })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '푸터 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('renders the admin sidebar navigation on admin console routes without the common header and footer', async () => {
    useAdminAuthStore.setState({
      adminDisplayName: '소노스쿨 운영 관리자',
      isAuthenticated: true,
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin/notices'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '공지사항 관리' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '관리자 메뉴' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: env.appName })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '푸터 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('keeps the lecture management navigation active on nested admin lecture editor routes', async () => {
    useAdminAuthStore.setState({
      adminDisplayName: '소노스쿨 운영 관리자',
      isAuthenticated: true,
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin/programs/doctor-course-internal-medicine-abdomen-practice/edit'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '내과과정 복부 실전 워크숍 편집' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /강의 관리/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('redirects guest users from mypage to the login page', async () => {
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/mypage'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
  });

  it('redirects authenticated users away from guest-only login routes', async () => {
    useAuthStore.setState({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: '2026-03-17T00:00:00Z',
      loginId: 'student01',
      displayName: '길동',
      role: 'ROLE_STUDENT',
      isAuthenticated: true,
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/login'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '마이페이지' }),
    ).toBeInTheDocument();
  });

  it('renders the account recovery page for guest users', async () => {
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/account/recovery'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '아이디/비밀번호 찾기' }),
    ).toBeInTheDocument();
  });
});
