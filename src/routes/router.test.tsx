import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { getMockAdminProgramDetailLive } from '@/mocks/data/adminProgramsLive';
import { server } from '@/mocks/server';
import { adminAuthRouteTree, adminConsoleRouteTree, appRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useAuthStore } from '@/stores/useAuthStore';

const ACTIVE_SESSION_EXPIRES_AT = '2099-01-01T00:00:00Z';

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
    accessToken: '',
    adminDisplayName: '',
    expiresAt: '',
    isAuthenticated: false,
    loginId: '',
    role: '',
    tokenType: '',
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
      accessToken: 'admin-token',
      adminDisplayName: '소노스쿨 운영 관리자',
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
      isAuthenticated: true,
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
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
    expect(screen.getByRole('link', { name: '팝업' })).toHaveAttribute('href', '/admin/popups');
    expect(screen.getByRole('link', { name: '프로그램 수강생 관리' })).toHaveAttribute(
      'href',
      '/admin/program-enrollments',
    );
    expect(screen.queryByRole('img', { name: env.appName })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '푸터 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('redirects /admin to program management and hides dashboard navigation', async () => {
    useAdminAuthStore.setState({
      accessToken: 'admin-token',
      adminDisplayName: '소노스쿨 운영 관리자',
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
      isAuthenticated: true,
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 관리' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: '운영 개요' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '대시보드' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '교육후기' })).not.toBeInTheDocument();
  });

  it('keeps the program management navigation active on nested admin program editor routes', async () => {
    useAdminAuthStore.setState({
      accessToken: 'admin-token',
      adminDisplayName: '소노스쿨 운영 관리자',
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
      isAuthenticated: true,
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
    });

    const queryClient = createTestQueryClient();
    server.use(
      http.get('*/api/v1/admin/programs/:programId', ({ params }) => {
        const programId = Number(params['programId']);
        const programDetail = getMockAdminProgramDetailLive(programId);

        if (!programDetail) {
          return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
        }

        return HttpResponse.json({ data: programDetail });
      }),
      http.get('*/api/v1/admin/programs/:programId/enrollments', () => {
        return HttpResponse.json({ data: [] });
      }),
    );
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin/programs/2001/edit'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수정' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /프로그램 관리/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders the program enrollment management route with selected program students', async () => {
    useAdminAuthStore.setState({
      accessToken: 'admin-token',
      adminDisplayName: '소노스쿨 운영 관리자',
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
      isAuthenticated: true,
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
    });

    const queryClient = createTestQueryClient();
    server.use(
      http.get('*/api/v1/admin/programs', () => {
        return HttpResponse.json({
          data: {
            content: [
              {
                activeEnrollmentCount: 1,
                catalogStatus: 'OPEN',
                categoryId: 11,
                categoryName: '일반과정',
                currentStudents: 1,
                featured: false,
                full: false,
                id: 2001,
                level: 'BEGINNER',
                maxStudents: null,
                price: 100000,
                programType: 'ONLINE',
                published: true,
                saleEndAt: null,
                salePrice: null,
                saleStartAt: null,
                slug: 'abdomen-basic',
                thumbnailUrl: null,
                title: '복부초음파 기초',
              },
            ],
          },
        });
      }),
      http.get('*/api/v1/admin/programs/2001/enrollments', () => {
        return HttpResponse.json({
          data: [
            {
              cancelledAt: null,
              cancelReason: null,
              canCancelEnrollment: true,
              canCancelPayment: true,
              enrolledAt: '2026-04-01T09:00:00Z',
              enrollmentId: 101,
              enrollmentStatus: 'ACTIVE',
              expireAt: '2026-06-30T14:59:59Z',
              loginId: 'student01',
              paidAt: '2026-03-28T02:30:00Z',
              paymentId: 501,
              paymentStatus: 'COMPLETED',
              phoneNumber: '010-1234-5678',
              userId: 77,
              userName: '김소노',
            },
          ],
        });
      }),
    );
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin/program-enrollments?programId=2001'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '프로그램 수강생 관리' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '프로그램 수강생 관리' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(await screen.findByText('김소노')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '아이디' })).toBeInTheDocument();
    expect(screen.getByText('student01')).toBeInTheDocument();
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '결제일' })).toBeInTheDocument();
  });

  it('keeps the notice navigation active on nested admin notice create routes', async () => {
    useAdminAuthStore.setState({
      accessToken: 'admin-token',
      adminDisplayName: '소노스쿨 운영 관리자',
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
      isAuthenticated: true,
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin/notices/new'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: '공지 작성' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지사항' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the resource navigation active on nested admin resource create routes', async () => {
    useAdminAuthStore.setState({
      accessToken: 'admin-token',
      adminDisplayName: '소노스쿨 운영 관리자',
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
      isAuthenticated: true,
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/admin/resources/new'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 자료 등록' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '자료실' })).toHaveAttribute('aria-current', 'page');
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
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
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

  it('shows the refund request guide instead of cancelling payments from mypage', async () => {
    useAuthStore.setState({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: ACTIVE_SESSION_EXPIRES_AT,
      loginId: 'student01',
      displayName: '길동',
      role: 'ROLE_STUDENT',
      isAuthenticated: true,
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter([adminAuthRouteTree, adminConsoleRouteTree, appRouteTree], {
      initialEntries: ['/mypage?view=payments'],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    fireEvent.click((await screen.findAllByRole('button', { name: '결제 취소' }))[0]);

    expect(await screen.findByRole('dialog', { name: '환불 신청 안내' })).toBeInTheDocument();
    expect(screen.getByText(/결제 취소 접수는 운영 Q&A 게시판을 통해/)).toBeInTheDocument();
    expect(screen.getByText(/번거로우시겠지만 운영 Q&A 게시판에 비밀글로/)).toBeInTheDocument();
    expect(screen.getByText(/환불 사유를 간략히 작성해 주시면/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Q&A로 이동' })).toBeInTheDocument();
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
