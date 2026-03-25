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
    getOrCreateAuthDeviceId: () => 'admin-device-id',
  };
});

import { loginAdmin } from '@/api/adminConsole';

describe('adminConsole auth API', () => {
  beforeEach(() => {
    axiosPostMock.mockReset();
  });

  it('maps a completed admin login response into the admin session shape', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          accessToken: 'admin-token',
          displayName: 'Sono Admin',
          expiresAt: '2099-01-01T00:00:00Z',
          loginId: 'admin',
          role: 'ROLE_ADMIN',
          status: 'COMPLETED',
          tokenType: 'Bearer',
        },
      },
    });

    await expect(
      loginAdmin({
        identifier: 'admin',
        password: 'password123',
      }),
    ).resolves.toEqual({
      accessToken: 'admin-token',
      adminDisplayName: 'Sono Admin',
      expiresAt: '2099-01-01T00:00:00Z',
      loginId: 'admin',
      role: 'ROLE_ADMIN',
      tokenType: 'Bearer',
    });
  });

  it('rejects non-admin login responses even when the shared auth endpoint succeeds', async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        data: {
          displayName: '학생 사용자',
          loginId: 'student01',
          role: 'ROLE_STUDENT',
          status: 'SMS_REQUIRED',
        },
      },
    });

    await expect(
      loginAdmin({
        identifier: 'student01',
        password: 'password123',
      }),
    ).rejects.toThrow('관리자 권한 계정으로 로그인해 주세요.');
  });
});
