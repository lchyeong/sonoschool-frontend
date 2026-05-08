import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosPostMock } = vi.hoisted(() => {
  return {
    axiosPostMock: vi.fn(),
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      post: axiosPostMock,
    },
  };
});

vi.mock('@/utils/authDeviceId', () => {
  return {
    getOrCreateAuthDeviceId: () => 'student-device-id',
  };
});

import {
  loginStudent,
  refreshStudentSession,
  registerStudent,
  sendSmsVerification,
  verifySmsCode,
  verifyStudentLoginSms,
} from '@/api/auth';

describe('student auth API', () => {
  beforeEach(() => {
    axiosPostMock.mockReset();
  });

  it('sends the device header when logging in', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          accessToken: 'student-token',
          challengeExpiresAt: null,
          challengeToken: null,
          displayName: '학생',
          expiresAt: '2099-01-01T00:00:00Z',
          loginId: 'student01',
          maskedPhoneNumber: null,
          role: 'ROLE_STUDENT',
          status: 'COMPLETED',
          tokenType: 'Bearer',
        },
      },
    });

    await loginStudent({
      loginId: 'student01',
      password: 'password123',
    });

    expect(axiosPostMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      {
        loginId: 'student01',
        password: 'password123',
      },
      {
        headers: {
          'X-Auth-Device-Id': 'student-device-id',
        },
      },
    );
  });

  it('sends the device header when verifying login SMS', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          accessToken: 'student-token',
          challengeExpiresAt: null,
          challengeToken: null,
          displayName: '학생',
          expiresAt: '2099-01-01T00:00:00Z',
          loginId: 'student01',
          maskedPhoneNumber: null,
          role: 'ROLE_STUDENT',
          status: 'COMPLETED',
          tokenType: 'Bearer',
        },
      },
    });

    await verifyStudentLoginSms({
      challengeToken: 'challenge-token',
      code: '123456',
    });

    expect(axiosPostMock).toHaveBeenCalledWith(
      '/api/v1/auth/login/verify-sms',
      {
        challengeToken: 'challenge-token',
        code: '123456',
      },
      {
        headers: {
          'X-Auth-Device-Id': 'student-device-id',
        },
      },
    );
  });

  it('sends the device header when refreshing the student session', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          accessToken: 'student-token',
          displayName: '학생',
          expiresAt: '2099-01-01T00:00:00Z',
          loginId: 'student01',
          role: 'ROLE_STUDENT',
          tokenType: 'Bearer',
        },
      },
    });

    await refreshStudentSession();

    expect(axiosPostMock).toHaveBeenCalledWith('/api/v1/auth/refresh', undefined, {
      headers: {
        'X-Auth-Device-Id': 'student-device-id',
      },
    });
  });

  it('sends the device header when registering a student', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          accessToken: 'student-token',
          displayName: '학생',
          expiresAt: '2099-01-01T00:00:00Z',
          loginId: 'student01',
          role: 'ROLE_STUDENT',
          tokenType: 'Bearer',
        },
      },
    });

    await registerStudent({
      acceptedTerms: [
        { code: 'SERVICE_TERMS', version: '2026-03-17' },
        { code: 'PRIVACY_POLICY', version: '2026-03-17' },
      ],
      email: 'student@sono.test',
      loginId: 'student01',
      name: '학생',
      nickname: '학생',
      password: 'password123',
      phoneNumber: '010-1234-5678',
      phoneVerificationToken: 'phone-token',
    });

    expect(axiosPostMock).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      {
        acceptedTerms: [
          { code: 'SERVICE_TERMS', version: '2026-03-17' },
          { code: 'PRIVACY_POLICY', version: '2026-03-17' },
        ],
        email: 'student@sono.test',
        loginId: 'student01',
        name: '학생',
        nickname: '학생',
        password: 'password123',
        phoneNumber: '010-1234-5678',
        phoneVerificationToken: 'phone-token',
      },
      {
        headers: {
          'X-Auth-Device-Id': 'student-device-id',
        },
      },
    );
  });

  it('sends the device header when sending signup SMS', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          phoneNumber: '01012345678',
          expiresAt: '2099-01-01T00:03:00Z',
        },
      },
    });

    await sendSmsVerification({ phoneNumber: '010-1234-5678' });

    expect(axiosPostMock).toHaveBeenCalledWith(
      '/api/v1/auth/sms/send',
      { phoneNumber: '010-1234-5678' },
      {
        headers: {
          'X-Auth-Device-Id': 'student-device-id',
        },
      },
    );
  });

  it('sends the device header when verifying signup SMS', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          phoneNumber: '01012345678',
          verifiedAt: '2099-01-01T00:00:00Z',
          verificationToken: 'phone-token',
        },
      },
    });

    await verifySmsCode({ phoneNumber: '010-1234-5678', code: '123456' });

    expect(axiosPostMock).toHaveBeenCalledWith(
      '/api/v1/auth/sms/verify',
      { phoneNumber: '010-1234-5678', code: '123456' },
      {
        headers: {
          'X-Auth-Device-Id': 'student-device-id',
        },
      },
    );
  });
});
