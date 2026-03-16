import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { adminAuthRouteTree, adminConsoleRouteTree, appRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';

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
});
