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
  it('prefills development credentials on the login page', () => {
    renderLoginPage();

    expect(screen.getByLabelText('아이디')).toHaveValue('student01');
    expect(screen.getByLabelText('비밀번호')).toHaveValue('password123');
  });
});
