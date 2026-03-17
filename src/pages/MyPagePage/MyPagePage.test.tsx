import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MyPagePage from '@/pages/MyPagePage/MyPagePage';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  ApplicationSummary,
  CartSummary,
  EnrollmentDetail,
  EnrollmentSummary,
  OfflineReservation,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';

const fetchMyProfileMock = vi.fn<() => Promise<UserProfile>>();
const updateMyProfileMock = vi.fn<(payload: UserProfileUpdatePayload) => Promise<UserProfile>>();
const sendMyPhoneVerificationMock = vi.fn<(payload: SmsSendPayload) => Promise<SmsSendResponse>>();
const verifyMyPhoneChangeMock = vi.fn<(payload: SmsVerifyPayload) => Promise<UserProfile>>();
const fetchMyEnrollmentsMock = vi.fn<() => Promise<EnrollmentSummary[]>>();
const fetchMyEnrollmentDetailMock = vi.fn<(enrollmentId: number) => Promise<EnrollmentDetail>>();
const fetchMyCartMock = vi.fn<() => Promise<CartSummary>>();
const fetchMyApplicationSummaryMock = vi.fn<() => Promise<ApplicationSummary>>();
const fetchMyReservationsMock = vi.fn<() => Promise<OfflineReservation[]>>();
const logoutStudentMock = vi.fn<() => Promise<void>>();

vi.mock('@/api/mypage', () => ({
  fetchMyApplicationSummary: (...args: unknown[]) => fetchMyApplicationSummaryMock(...args),
  fetchMyCart: (...args: unknown[]) => fetchMyCartMock(...args),
  fetchMyEnrollmentDetail: (...args: unknown[]) => fetchMyEnrollmentDetailMock(...args),
  fetchMyEnrollments: (...args: unknown[]) => fetchMyEnrollmentsMock(...args),
  fetchMyProfile: (...args: unknown[]) => fetchMyProfileMock(...args),
  fetchMyReservations: (...args: unknown[]) => fetchMyReservationsMock(...args),
  sendMyPhoneVerification: (...args: unknown[]) => sendMyPhoneVerificationMock(...args),
  updateMyProfile: (...args: unknown[]) => updateMyProfileMock(...args),
  verifyMyPhoneChange: (...args: unknown[]) => verifyMyPhoneChangeMock(...args),
}));

vi.mock('@/api/auth', () => ({
  logoutStudent: (...args: unknown[]) => logoutStudentMock(...args),
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
};

const renderMyPage = (initialEntry = routePaths.mypage) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<MyPagePage />} path={routePaths.mypage} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  fetchMyProfileMock.mockResolvedValue({
    displayName: '홍길동',
    email: 'student01@example.com',
    loginId: 'student01',
    name: '홍길동',
    nickname: '길벗',
    phoneNumber: '010-1111-2222',
    phoneVerifiedAt: '2026-03-01T09:00:00Z',
    role: 'STUDENT',
  });
  updateMyProfileMock.mockResolvedValue({
    displayName: '김학생',
    email: 'student01@example.com',
    loginId: 'student01',
    name: '김학생',
    nickname: '길벗',
    phoneNumber: '010-1111-2222',
    phoneVerifiedAt: '2026-03-01T09:00:00Z',
    role: 'STUDENT',
  });
  sendMyPhoneVerificationMock.mockResolvedValue({
    expiresAt: '2026-03-17T10:30:00Z',
    phoneNumber: '010-3333-4444',
  });
  verifyMyPhoneChangeMock.mockResolvedValue({
    displayName: '홍길동',
    email: 'student01@example.com',
    loginId: 'student01',
    name: '홍길동',
    nickname: '길벗',
    phoneNumber: '010-3333-4444',
    phoneVerifiedAt: '2026-03-17T10:10:00Z',
    role: 'STUDENT',
  });
  fetchMyEnrollmentsMock.mockResolvedValue([
    {
      active: true,
      enrolledAt: '2026-02-01T09:00:00Z',
      expireAt: '2026-12-31T14:59:59Z',
      id: 101,
      programId: 2001,
      programThumbnailUrl: null,
      programTitle: '복부초음파 기초',
      status: 'ACTIVE',
    },
  ]);
  fetchMyEnrollmentDetailMock.mockResolvedValue({
    active: true,
    certificateEligible: false,
    completed: false,
    completedAt: null,
    completedLectures: 2,
    completionRate: 67,
    enrolledAt: '2026-02-01T09:00:00Z',
    expireAt: '2026-12-31T14:59:59Z',
    id: 101,
    programId: 2001,
    programTitle: '복부초음파 기초',
    progress: [
      {
        completed: true,
        completedAt: '2026-02-10T10:00:00Z',
        lastWatchedAt: '2026-02-10T10:00:00Z',
        lectureId: 1,
        watchedSeconds: 900,
      },
      {
        completed: false,
        completedAt: null,
        lastWatchedAt: '2026-03-10T08:00:00Z',
        lectureId: 2,
        watchedSeconds: 480,
      },
    ],
    status: 'ACTIVE',
    totalLectures: 3,
  });
  fetchMyCartMock.mockResolvedValue({
    appliedCoupon: {
      code: 'SPRING',
      discountAmount: 5000,
      discountType: 'FIXED_AMOUNT',
      discountValue: 5000,
      id: 10,
      name: '봄맞이 할인',
    },
    itemCount: 1,
    items: [
      {
        addedAt: '2026-03-15T08:30:00Z',
        id: 55,
        instructorName: '김강사',
        originalPrice: 120000,
        payablePrice: 99000,
        programId: 2002,
        programType: 'ONLINE',
        saleEndAt: null,
        salePrice: 99000,
        saleStartAt: null,
        thumbnailUrl: null,
        title: 'POCUS 워크숍',
      },
    ],
    totalDiscountAmount: 21000,
    totalOriginalPrice: 120000,
    totalPayablePrice: 99000,
  });
  fetchMyApplicationSummaryMock.mockResolvedValue({
    appliedCoupon: null,
    hasOfflineReservation: false,
    hasOnlineCheckout: true,
    offlineItemCount: 0,
    offlineItems: [],
    onlineItems: [
      {
        cartItemId: 55,
        payablePrice: 99000,
        programId: 2002,
        programType: 'ONLINE',
        title: 'POCUS 워크숍',
      },
    ],
    onlinePayablePrice: 99000,
  });
  fetchMyReservationsMock.mockResolvedValue([
    {
      createdAt: '2026-03-01T09:00:00Z',
      id: 700,
      location: '서울 강의장',
      note: null,
      programId: 3001,
      programTitle: '오프라인 핸즈온',
      scheduleEndAt: '2026-04-10T15:00:00Z',
      scheduleId: 901,
      scheduleStartAt: '2026-04-10T13:00:00Z',
      scheduleTitle: '4월 핸즈온',
      status: 'CONFIRMED',
    },
  ]);
  logoutStudentMock.mockResolvedValue(undefined);
  useAuthStore.setState({
    accessToken: 'token',
    displayName: '홍길동',
    expiresAt: '2026-03-30T00:00:00Z',
    isAuthenticated: true,
    loginId: 'student01',
    role: 'STUDENT',
    tokenType: 'Bearer',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: '',
    displayName: '',
    expiresAt: '',
    isAuthenticated: false,
    loginId: '',
    role: '',
    tokenType: '',
  });
  window.localStorage.clear();
});

describe('MyPagePage', () => {
  it('renders grouped sidebar categories and the default lecture detail', async () => {
    renderMyPage();

    expect(screen.getByRole('heading', { level: 1, name: '마이페이지' })).toBeInTheDocument();
    expect(screen.getByText('학습 관리')).toBeInTheDocument();
    expect(screen.getByText('주문/결제')).toBeInTheDocument();
    expect(screen.getByText('내 정보')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내 강의' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '신청 내역' })).toBeInTheDocument();

    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();
    expect(await screen.findByText('67%')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('shows checkout data when the orders checkout item is selected', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '결제 예정' }));

    expect(await screen.findByText('POCUS 워크숍')).toBeInTheDocument();
    expect(screen.getAllByText('99,000원')).toHaveLength(2);
    expect(screen.getByText('쿠폰 봄맞이 할인 (5,000원)')).toBeInTheDocument();
  });

  it('submits profile updates from the basic profile item', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '기본 정보' }));

    const nameInput = await screen.findByLabelText('이름');
    await waitFor(() => {
      expect(nameInput).toHaveValue('홍길동');
    });
    fireEvent.change(nameInput, {
      target: { value: '김학생' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(updateMyProfileMock).toHaveBeenCalled();
      expect(updateMyProfileMock.mock.calls[0][0]).toEqual({
        name: '김학생',
        nickname: '길벗',
      });
    });
  });

  it('opens inline phone verification from the basic profile item', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '기본 정보' }));

    expect(await screen.findByLabelText('휴대폰 인증 완료')).toBeInTheDocument();
    expect(screen.queryByText(/완료 \(/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '변경' }));
    fireEvent.change(screen.getByLabelText('새 휴대폰 번호'), {
      target: { value: '010-3333-4444' },
    });
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));

    await waitFor(() => {
      expect(sendMyPhoneVerificationMock).toHaveBeenCalled();
      expect(sendMyPhoneVerificationMock.mock.calls[0][0]).toEqual({
        phoneNumber: '010-3333-4444',
      });
    });

    expect(await screen.findByText('인증번호를 보냈습니다.')).toBeInTheDocument();
  });

  it('shows the support entry without lecture browse links', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '1:1 문의' }));

    expect(
      await screen.findByText(
        '문의 내역 조회 기능은 준비 중입니다. 문의가 필요하면 문의 페이지를 이용해 주세요.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '문의하기' })).toHaveAttribute(
      'href',
      routePaths.contact,
    );
    expect(screen.queryByRole('link', { name: '강의 둘러보기' })).not.toBeInTheDocument();
  });
});
