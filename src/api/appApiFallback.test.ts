/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMockAdminConsole, resetMockAdminConsoleData } from '@/mocks/data/adminConsole';
import { resetMockMyPageData } from '@/mocks/data/mypage';
import { getMockRegistrationTerms, resetMockStudentAuthState } from '@/mocks/data/studentAuth';
const { httpGetMock, axiosGetMock, axiosPostMock, axiosPatchMock, axiosDeleteMock } = vi.hoisted(
  () => {
    return {
      axiosDeleteMock: vi.fn(),
      axiosGetMock: vi.fn(),
      axiosPatchMock: vi.fn(),
      axiosPostMock: vi.fn(),
      httpGetMock: vi.fn(),
    };
  },
);

vi.mock('@/api/http', () => {
  return {
    http: {
      get: httpGetMock,
    },
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      delete: axiosDeleteMock,
      get: axiosGetMock,
      patch: axiosPatchMock,
      post: axiosPostMock,
    },
  };
});

import { fetchRegistrationTerms, loginStudent } from '@/api/auth';
import { createAdminNotice, fetchAdminConsole } from '@/api/adminConsole';
import { fetchMyProfile, updateMyProfile } from '@/api/mypage';

const siteKey = 'sono-school-main';

const createAxiosFailure = (status: number | null) => {
  return {
    isAxiosError: true,
    message: 'request failed',
    response: status === null ? undefined : { data: { message: 'request failed' }, status },
  };
};

describe('app API fallback', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
    axiosGetMock.mockReset();
    axiosPostMock.mockReset();
    axiosPatchMock.mockReset();
    axiosDeleteMock.mockReset();
    resetMockAdminConsoleData();
    resetMockMyPageData();
    resetMockStudentAuthState();
  });

  it('falls back to mock auth data when auth endpoints are unavailable', async () => {
    axiosPostMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(
      loginStudent({
        loginId: 'student01',
        password: 'password123',
      }),
    ).resolves.toMatchObject({
      displayName: '길동',
      loginId: 'student01',
      role: 'ROLE_STUDENT',
    });

    await expect(fetchRegistrationTerms()).resolves.toEqual(getMockRegistrationTerms());
  });

  it('does not use auth fallback for a reachable invalid-credential response', async () => {
    axiosPostMock.mockRejectedValueOnce(createAxiosFailure(401));

    await expect(
      loginStudent({
        loginId: 'student01',
        password: 'wrong-password',
      }),
    ).rejects.toBeTruthy();
  });

  it('falls back to mock mypage data when mypage APIs are unavailable', async () => {
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosPatchMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(fetchMyProfile()).resolves.toMatchObject({
      displayName: '홍길동',
      loginId: 'student01',
    });

    await expect(
      updateMyProfile({
        name: '김학생',
        nickname: '학생',
      }),
    ).resolves.toMatchObject({
      displayName: '학생',
      name: '김학생',
      nickname: '학생',
    });
  });

  it('falls back to mock admin data when admin APIs are unavailable', async () => {
    httpGetMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(fetchAdminConsole(siteKey)).resolves.toEqual(getMockAdminConsole(siteKey));
  });

  it('falls back to mock admin mutations when admin write APIs are unavailable', async () => {
    axiosPostMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(
      createAdminNotice(siteKey, {
        category: '운영',
        isPinned: true,
        title: 'fallback notice',
      }),
    ).resolves.toBeUndefined();

    expect(getMockAdminConsole(siteKey).notices[0]?.title).toBe('fallback notice');
  });
});
