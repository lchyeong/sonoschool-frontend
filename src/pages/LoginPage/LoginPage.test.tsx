import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import LoginPage from '@/pages/LoginPage/LoginPage';
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

const renderLoginPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  useAuthStore.setState({
    accessToken: '',
    tokenType: '',
    expiresAt: '',
    loginId: '',
    displayName: '',
    role: '',
    isAuthenticated: false,
  });
});

describe('LoginPage', () => {
  it('renders the Figma-aligned login form without prefilled credentials', () => {
    renderLoginPage();

    expect(screen.getByLabelText('아이디')).toHaveValue('');
    expect(screen.getByLabelText('비밀번호')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: '아이디 저장' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '회원가입' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '아이디/비밀번호 찾기' })).toBeInTheDocument();
  });
});
