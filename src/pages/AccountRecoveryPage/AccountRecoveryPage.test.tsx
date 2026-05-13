import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { findLoginIdMock, resetPasswordMock, sendPasswordResetSmsMock } = vi.hoisted(() => ({
  findLoginIdMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  sendPasswordResetSmsMock: vi.fn(),
}));

vi.mock('@/api/auth', () => ({
  findLoginId: findLoginIdMock,
  resetPassword: resetPasswordMock,
  sendPasswordResetSms: sendPasswordResetSmsMock,
}));

import AccountRecoveryPage from '@/pages/AccountRecoveryPage/AccountRecoveryPage';

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

const renderAccountRecoveryPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccountRecoveryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  findLoginIdMock.mockResolvedValue({ loginId: 'student01' });
  sendPasswordResetSmsMock.mockResolvedValue({
    expiresAt: new Date(Date.now() + 180_000).toISOString(),
    phoneNumber: '01011112222',
  });
  resetPasswordMock.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccountRecoveryPage', () => {
  it('switches between recovery modes and renders enabled recovery actions', () => {
    renderAccountRecoveryPage();

    expect(
      screen.getByRole('heading', { level: 1, name: '아이디/비밀번호 찾기' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '아이디 찾기' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: '아이디 확인' })).toBeEnabled();

    fireEvent.click(screen.getByRole('tab', { name: '비밀번호 찾기' }));

    expect(screen.getByRole('tab', { name: '비밀번호 찾기' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('아이디')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '인증번호 받기' })).toBeEnabled();
  });
  it('moves directly to password reset after finding the login id with phone verification', async () => {
    renderAccountRecoveryPage();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByLabelText('휴대폰번호'), {
      target: { value: '01011112222' },
    });
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));

    expect(await screen.findByText('인증번호를 발송했습니다.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));

    expect(await screen.findByText('본인 인증이 완료되었습니다.')).toBeInTheDocument();
    expect(screen.getByText('student01')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }));

    await waitFor(() => {
      expect(sendPasswordResetSmsMock).toHaveBeenCalled();
      expect(sendPasswordResetSmsMock.mock.calls[0]?.[0]).toEqual({
        loginId: 'student01',
        phoneNumber: '01011112222',
      });
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: '비밀번호 재설정' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '비밀번호 찾기' })).not.toBeInTheDocument();
  });
});
