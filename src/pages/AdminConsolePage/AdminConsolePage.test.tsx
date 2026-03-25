import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import AdminConsolePage from '@/pages/AdminConsolePage/AdminConsolePage';
import { server } from '@/mocks/server';
import { adminConsoleRouteTree } from '@/routes/router';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useToastStore } from '@/stores/useToastStore';

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

const renderAdminConsoleRoute = (initialEntry = '/admin/programs') => {
  const queryClient = createTestQueryClient();

  useAdminAuthStore.setState({
    accessToken: 'admin-token',
    adminDisplayName: '소노스쿨 운영 관리자',
    expiresAt: ACTIVE_SESSION_EXPIRES_AT,
    isAuthenticated: true,
    loginId: 'admin',
    role: 'ROLE_ADMIN',
    tokenType: 'Bearer',
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
  useToastStore.getState().clearToasts();
});

describe('AdminConsolePage', () => {
  it('renders the admin dashboard shortcuts', async () => {
    renderAdminConsolePage();

    expect(await screen.findByRole('heading', { level: 1, name: '운영 개요' })).toBeInTheDocument();
    expect(screen.getAllByText('결제 관리').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /강의 관리/i })).toHaveAttribute(
      'href',
      '/admin/programs',
    );
    expect(screen.getByRole('link', { name: /결제 관리/i })).toHaveAttribute(
      'href',
      '/admin/payments',
    );
  });

  it('keeps the admin shell visible when the program list API fails', async () => {
    server.use(
      http.get('*/api/v1/admin/programs', () => {
        return HttpResponse.json({ message: 'program list failed' }, { status: 500 });
      }),
    );

    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();
    expect(await screen.findByText('강의 목록을 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('moves from the lecture list to the dedicated create page', async () => {
    renderAdminConsoleRoute('/admin/programs');

    expect(await screen.findByRole('heading', { level: 1, name: '강의 관리' })).toBeInTheDocument();
    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '새 강의 등록' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '새 강의 등록' }),
    ).toBeInTheDocument();
  });

  it('edits a lecture on the dedicated edit page and saves it', async () => {
    renderAdminConsoleRoute('/admin/programs/2001/edit');

    expect(
      await screen.findByRole('heading', { level: 1, name: '복부초음파 기초 수정' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('강의 소개'), {
      target: { value: '강의 소개 문구를 관리자에서 수정한 테스트입니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '강의 저장' }));

    await waitFor(() => {
      expect(
        useToastStore
          .getState()
          .toasts.some((toast) => toast.message === '강의를 수정했습니다.'),
      ).toBe(true);
    });
  });

  it('renders the qna management section with pending threads first', async () => {
    renderAdminConsoleRoute('/admin/qna');

    expect(await screen.findByText('답변 대기 2건')).toBeInTheDocument();
    expect(screen.getByText('오프라인 핸즈온 과정 환불 기준이 궁금합니다.')).toBeInTheDocument();
    expect(screen.getAllByText('답변 대기').length).toBeGreaterThan(0);
  });
});
