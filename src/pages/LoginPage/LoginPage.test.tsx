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

  it('restores an active login SMS challenge after returning to the login page', async () => {
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
      expect(screen.getByLabelText('아이디')).toHaveValue('student01');
    });
    expect(screen.getByText('이미 발송된 인증번호가 아직 유효합니다.')).toBeInTheDocument();
    expect(
      screen.getByText('화면을 닫아도 남은 시간 동안 같은 인증번호를 입력할 수 있습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재전송 대기' })).toBeDisabled();
  });
});
