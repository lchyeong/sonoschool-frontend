import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/errors';
import SignupPage from '@/pages/SignupPage/SignupPage';

const {
  checkEmailAvailabilityMock,
  checkLoginIdAvailabilityMock,
  fetchRegistrationTermsMock,
  registerStudentMock,
  sendSmsVerificationMock,
  verifySmsCodeMock,
} = vi.hoisted(() => ({
  checkEmailAvailabilityMock: vi.fn(),
  checkLoginIdAvailabilityMock: vi.fn(),
  fetchRegistrationTermsMock: vi.fn(),
  registerStudentMock: vi.fn(),
  sendSmsVerificationMock: vi.fn(),
  verifySmsCodeMock: vi.fn(),
}));

vi.mock('@/api/auth', () => ({
  checkEmailAvailability: checkEmailAvailabilityMock,
  checkLoginIdAvailability: checkLoginIdAvailabilityMock,
  fetchRegistrationTerms: fetchRegistrationTermsMock,
  registerStudent: registerStudentMock,
  sendSmsVerification: sendSmsVerificationMock,
  verifySmsCode: verifySmsCodeMock,
}));

vi.mock('@/utils/mergeGuestCartIntoServer', () => ({
  mergeGuestCartIntoServer: vi.fn().mockResolvedValue({ failedCount: 0, serverCart: null }),
}));

const renderSignupPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  window.sessionStorage.clear();
  fetchRegistrationTermsMock.mockResolvedValue([]);
  sendSmsVerificationMock.mockResolvedValue({
    expiresAt: '2000-01-01T00:00:00.000Z',
    phoneNumber: '01011112222',
  });
  verifySmsCodeMock.mockResolvedValue({
    phoneNumber: '01011112222',
    verificationToken: 'verification-token',
    verifiedAt: '2026-08-01T10:36:30.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SignupPage SMS verification', () => {
  it('lets the server decide whether a code is expired', async () => {
    renderSignupPage();

    fireEvent.change(screen.getByLabelText(/휴대폰 번호/), {
      target: { value: '01011112222' },
    });
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));

    expect(
      await screen.findByText('인증 시간이 만료되었습니다. 다시 발송해 주세요.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/인증번호 입력/), {
      target: { value: '123456' },
    });
    const verifyButton = screen.getByRole('button', { name: '인증번호 확인' });
    expect(verifyButton).toBeEnabled();
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(verifySmsCodeMock.mock.calls[0]?.[0]).toEqual({
        code: '123456',
        phoneNumber: '01011112222',
      });
    });
  });

  it.each(['AUTH_400_SMS_EXPIRED', 'AUTH_429_SMS_ATTEMPTS'])(
    'resets client SMS state after the server returns %s',
    async (errorCode) => {
      sendSmsVerificationMock.mockResolvedValueOnce({
        expiresAt: new Date(Date.now() + 180_000).toISOString(),
        phoneNumber: '01011112222',
      });
      verifySmsCodeMock.mockRejectedValueOnce(
        new ApiError({
          code: errorCode,
          status: errorCode === 'AUTH_429_SMS_ATTEMPTS' ? 429 : 400,
          userMessage: '인증번호를 다시 요청해 주세요.',
        }),
      );
      renderSignupPage();

      fireEvent.change(screen.getByLabelText(/휴대폰 번호/), {
        target: { value: '01011112222' },
      });
      fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
      fireEvent.change(await screen.findByLabelText(/인증번호 입력/), {
        target: { value: '123456' },
      });
      fireEvent.click(screen.getByRole('button', { name: '인증번호 확인' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '인증번호 받기' })).toBeEnabled();
      });
      expect(screen.getByRole('button', { name: '인증번호 확인' })).toBeDisabled();
      expect(window.sessionStorage.getItem('sonoschool:signup:sms-verification')).toBeNull();
    },
  );
});

describe('SignupPage registration terms', () => {
  it('shows the marketing consent explanation below its display title', async () => {
    fetchRegistrationTermsMock.mockResolvedValueOnce([
      {
        code: 'MARKETING',
        contentUrl: '/terms/marketing',
        required: false,
        title: '마케팅 정보 수신 동의',
        version: '2026-03-17',
      },
    ]);

    renderSignupPage();

    const displayTitle = await screen.findByText(
      '[선택] 광고성 정보 수신 동의(교육 서비스 및 혜택 안내를 위한 정보 수신에 동의합니다.)',
    );
    const description = screen.getByText(
      '※ 무료 강의, 세미나, 신규 교육과정, 이벤트 및 다양한 교육 정보를 제공해 드립니다.',
    );

    expect(displayTitle.parentElement).toContainElement(description);

    fireEvent.click(screen.getByRole('button', { name: '보기' }));

    expect(screen.getByRole('heading', { name: '광고성 정보 수신 동의' })).toBeInTheDocument();
  });
});
