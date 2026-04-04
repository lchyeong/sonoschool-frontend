import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loginAdmin } from '@/api/adminAuth';
import AdminLoginPage from '@/pages/AdminLoginPage/AdminLoginPage';
import { routePaths } from '@/routes/routeRegistry';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';

vi.mock('@/api/adminAuth', () => ({
  loginAdmin: vi.fn(),
}));

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

const renderAdminLoginPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[routePaths.adminLogin]}>
        <Routes>
          <Route element={<AdminLoginPage />} path={routePaths.adminLogin} />
          <Route element={<div>admin destination</div>} path={routePaths.adminPrograms} />
        </Routes>
      </MemoryRouter>
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
  window.localStorage.clear();
});

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.mocked(loginAdmin).mockReset();
    vi.mocked(loginAdmin).mockResolvedValue({
      accessToken: 'admin-token',
      adminDisplayName: '소노스쿨 운영 관리자',
      expiresAt: '2099-01-01T00:00:00Z',
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
    });
  });

  it('renders the admin login form and validates required fields', () => {
    renderAdminLoginPage();

    expect(screen.getByRole('heading', { level: 1, name: '관리자 로그인' })).toBeInTheDocument();

    const identifierInput = screen.getByLabelText('관리자 아이디');
    const passwordInput = screen.getByLabelText('비밀번호');

    expect(identifierInput).toHaveValue('admin');
    expect(passwordInput).toHaveValue('password123');

    fireEvent.change(identifierInput, {
      target: { value: '' },
    });
    fireEvent.change(passwordInput, {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: '관리자 로그인' }));

    expect(screen.getByText('관리자 아이디를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
    expect(identifierInput).toHaveFocus();
  });

  it('navigates to the admin page when the correct credentials are submitted', async () => {
    renderAdminLoginPage();

    fireEvent.change(screen.getByLabelText('관리자 아이디'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '관리자 로그인' }));

    expect(await screen.findByText('admin destination')).toBeInTheDocument();
  });
});
