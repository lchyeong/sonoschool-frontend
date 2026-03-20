import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import AdminLoginPage from '@/pages/AdminLoginPage/AdminLoginPage';
import { routePaths } from '@/routes/routeRegistry';
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

const renderAdminLoginPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[routePaths.adminLogin]}>
        <Routes>
          <Route element={<AdminLoginPage />} path={routePaths.adminLogin} />
          <Route element={<div>admin destination</div>} path={routePaths.admin} />
        </Routes>
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
  window.localStorage.clear();
});

describe('AdminLoginPage', () => {
  it('renders the admin login form and validates required fields', () => {
    renderAdminLoginPage();

    expect(screen.getByRole('heading', { level: 1, name: '관리자 로그인' })).toBeInTheDocument();

    const identifierInput = screen.getByLabelText('관리자 아이디');
    const passwordInput = screen.getByLabelText('비밀번호');

    expect(identifierInput).toHaveValue('admin');
    expect(passwordInput).toHaveValue('1234');

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
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: '관리자 로그인' }));

    expect(await screen.findByText('admin destination')).toBeInTheDocument();
  });
});
