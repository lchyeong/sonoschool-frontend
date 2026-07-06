import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/pages/LoginPage/LoginPage';
import { useAuthStore } from '@/stores/useAuthStore';

const { loginStudentMock, verifyStudentLoginSmsMock } = vi.hoisted(() => ({
  loginStudentMock: vi.fn(),
  verifyStudentLoginSmsMock: vi.fn(),
}));

vi.mock('@/api/auth', () => {
  return {
    loginStudent: loginStudentMock,
    verifyStudentLoginSms: verifyStudentLoginSmsMock,
  };
});

vi.mock('@/utils/authDeviceId', () => ({
  getOrCreateAuthDeviceId: () => 'test-device-id',
}));

const LOGIN_SMS_CHALLENGE_STORAGE_KEY = 'sonoschool:login:sms-challenge';

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
  cleanup();
  window.sessionStorage.clear();
  vi.clearAllMocks();
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

  it('clears a stale login SMS challenge when returning to the login page', async () => {
    window.sessionStorage.setItem(
      LOGIN_SMS_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        challenge: {
          challengeExpiresAt: new Date(Date.now() + 180_000).toISOString(),
          challengeToken: 'challenge-token',
          displayName: '학생',
          loginId: 'student01',
          maskedPhoneNumber: '010-****-2222',
          role: 'ROLE_STUDENT',
          status: 'SMS_REQUIRED',
        },
        deviceId: 'test-device-id',
      }),
    );

    renderLoginPage();

    await waitFor(() => {
      expect(window.sessionStorage.getItem(LOGIN_SMS_CHALLENGE_STORAGE_KEY)).toBeNull();
    });
    expect(screen.getByLabelText('아이디')).toHaveValue('');
    expect(screen.queryByText('이미 발송된 인증번호가 아직 유효합니다.')).not.toBeInTheDocument();
  });
});
