/* eslint-disable import/order */
import { resetMockMyPageData } from '@/mocks/data/mypage';
import { resetMockStudentAuthState } from '@/mocks/data/studentAuth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import { fetchAdminProgramsLive } from '@/api/adminProgramsLive';
import {
  addMyCartItem,
  fetchMyCoupons,
  fetchMyProfile,
  removeMyCartItem,
  updateMyProfile,
} from '@/api/mypage';
import { createAdminNoticeLive } from '@/api/notices';
import { fetchPaymentResult, fetchPaymentResultByToken } from '@/api/payments';
import { useAuthStore } from '@/stores/useAuthStore';

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
    useAuthStore.setState({
      accessToken: '',
      displayName: '',
      expiresAt: '',
      isAuthenticated: false,
      loginId: '',
      role: '',
      tokenType: '',
    });
    resetMockMyPageData();
    resetMockStudentAuthState();
  });

  it('keeps auth requests failing when live endpoints are unavailable', async () => {
    axiosPostMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(
      loginStudent({
        loginId: 'student01',
        password: 'password123',
      }),
    ).rejects.toBeTruthy();

    await expect(fetchRegistrationTerms()).rejects.toBeTruthy();
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

  it('keeps mypage requests failing when live endpoints are unavailable', async () => {
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosPatchMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosPostMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosDeleteMock.mockRejectedValueOnce(createAxiosFailure(404));
    useAuthStore.setState({
      accessToken: 'token',
      displayName: '홍길동',
      expiresAt: '2026-03-30T00:00:00Z',
      isAuthenticated: true,
      loginId: 'student01',
      role: 'ROLE_STUDENT',
      tokenType: 'Bearer',
    });

    await expect(fetchMyProfile()).rejects.toBeTruthy();

    await expect(
      updateMyProfile({
        name: '김학생',
        nickname: '학생',
      }),
    ).rejects.toBeTruthy();

    await expect(
      addMyCartItem({
        instructorName: '테스트 강사',
        originalPrice: 100000,
        payablePrice: 90000,
        programId: 999001,
        programType: 'ONLINE',
        salePrice: 90000,
        sourcePath: '/programs/test-course/detail',
        thumbnailUrl: null,
        title: '테스트 코스',
      }),
    ).rejects.toBeTruthy();

    await expect(removeMyCartItem(55)).rejects.toBeTruthy();

    await expect(fetchMyCoupons()).rejects.toBeTruthy();
  });

  it('keeps admin read requests failing when live endpoints are unavailable', async () => {
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(fetchAdminProgramsLive()).rejects.toBeTruthy();
  });

  it('keeps payment requests failing when live endpoints are unavailable', async () => {
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));
    axiosGetMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(fetchPaymentResult(501)).rejects.toBeTruthy();
    await expect(fetchPaymentResultByToken('mock-card-completed')).rejects.toBeTruthy();
  });

  it('keeps admin write requests failing when live endpoints are unavailable', async () => {
    axiosPostMock.mockRejectedValueOnce(createAxiosFailure(404));

    await expect(
      createAdminNoticeLive({
        content: 'fallback notice body',
        pinned: true,
        programId: null,
        published: false,
        scope: 'GLOBAL',
        title: 'fallback notice',
        visibleEndAt: null,
        visibleStartAt: null,
      }),
    ).rejects.toBeTruthy();
  });
});
