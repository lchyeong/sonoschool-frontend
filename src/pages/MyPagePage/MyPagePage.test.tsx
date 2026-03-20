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
  LearningPlayerSnapshot,
  OfflineReservation,
  RefundHistory,
  UserCoupon,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';

const fetchMyProfileMock = vi.fn<() => Promise<UserProfile>>();
const updateMyProfileMock = vi.fn<(payload: UserProfileUpdatePayload) => Promise<UserProfile>>();
const sendMyPhoneVerificationMock = vi.fn<(payload: SmsSendPayload) => Promise<SmsSendResponse>>();
const verifyMyPhoneChangeMock = vi.fn<(payload: SmsVerifyPayload) => Promise<UserProfile>>();
const fetchMyEnrollmentsMock = vi.fn<() => Promise<EnrollmentSummary[]>>();
const fetchMyEnrollmentDetailMock = vi.fn<(enrollmentId: number) => Promise<EnrollmentDetail>>();
const fetchMyLearningPlayerSnapshotMock =
  vi.fn<(enrollmentId: number) => Promise<LearningPlayerSnapshot>>();
const fetchMyCartMock = vi.fn<() => Promise<CartSummary>>();
const fetchMyCouponsMock = vi.fn<() => Promise<UserCoupon[]>>();
const fetchMyApplicationSummaryMock = vi.fn<() => Promise<ApplicationSummary>>();
const fetchMyReservationsMock = vi.fn<() => Promise<OfflineReservation[]>>();
const fetchMyRefundsMock = vi.fn<() => Promise<RefundHistory[]>>();
const logoutStudentMock = vi.fn<() => Promise<void>>();

vi.mock('@/api/mypage', () => ({
  fetchMyApplicationSummary: () => fetchMyApplicationSummaryMock(),
  fetchMyCart: () => fetchMyCartMock(),
  fetchMyCoupons: () => fetchMyCouponsMock(),
  fetchMyEnrollmentDetail: (enrollmentId: number) => fetchMyEnrollmentDetailMock(enrollmentId),
  fetchMyEnrollments: () => fetchMyEnrollmentsMock(),
  fetchMyLearningPlayerSnapshot: (enrollmentId: number) =>
    fetchMyLearningPlayerSnapshotMock(enrollmentId),
  fetchMyProfile: () => fetchMyProfileMock(),
  fetchMyRefunds: () => fetchMyRefundsMock(),
  fetchMyReservations: () => fetchMyReservationsMock(),
  sendMyPhoneVerification: (payload: SmsSendPayload) => sendMyPhoneVerificationMock(payload),
  updateMyProfile: (payload: UserProfileUpdatePayload) => updateMyProfileMock(payload),
  verifyMyPhoneChange: (payload: SmsVerifyPayload) => verifyMyPhoneChangeMock(payload),
}));

vi.mock('@/api/auth', () => ({
  logoutStudent: () => logoutStudentMock(),
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

const testEnrollments: EnrollmentSummary[] = [
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
  {
    active: true,
    enrolledAt: '2026-02-20T09:00:00Z',
    expireAt: '2026-08-31T14:59:59Z',
    id: 102,
    programId: 2003,
    programThumbnailUrl: null,
    programTitle: '심장초음파 실전',
    status: 'ACTIVE',
  },
  {
    active: false,
    enrolledAt: '2025-11-05T09:00:00Z',
    expireAt: '2026-02-28T14:59:59Z',
    id: 103,
    programId: 2004,
    programThumbnailUrl: null,
    programTitle: 'POCUS 응급 핸즈온',
    status: 'EXPIRED',
  },
];

const testEnrollmentDetails = new Map<number, EnrollmentDetail>([
  [
    101,
    {
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
    },
  ],
  [
    102,
    {
      active: true,
      certificateEligible: true,
      completed: false,
      completedAt: null,
      completedLectures: 5,
      completionRate: 83,
      enrolledAt: '2026-02-20T09:00:00Z',
      expireAt: '2026-08-31T14:59:59Z',
      id: 102,
      programId: 2003,
      programTitle: '심장초음파 실전',
      progress: [
        {
          completed: true,
          completedAt: '2026-02-25T11:00:00Z',
          lastWatchedAt: '2026-02-25T11:00:00Z',
          lectureId: 1,
          watchedSeconds: 1200,
        },
        {
          completed: true,
          completedAt: '2026-03-02T10:20:00Z',
          lastWatchedAt: '2026-03-02T10:20:00Z',
          lectureId: 2,
          watchedSeconds: 1440,
        },
        {
          completed: true,
          completedAt: '2026-03-09T09:40:00Z',
          lastWatchedAt: '2026-03-09T09:40:00Z',
          lectureId: 3,
          watchedSeconds: 1380,
        },
        {
          completed: true,
          completedAt: '2026-03-12T08:30:00Z',
          lastWatchedAt: '2026-03-12T08:30:00Z',
          lectureId: 4,
          watchedSeconds: 960,
        },
        {
          completed: true,
          completedAt: '2026-03-15T07:50:00Z',
          lastWatchedAt: '2026-03-15T07:50:00Z',
          lectureId: 5,
          watchedSeconds: 1020,
        },
        {
          completed: false,
          completedAt: null,
          lastWatchedAt: '2026-03-16T06:45:00Z',
          lectureId: 6,
          watchedSeconds: 420,
        },
      ],
      status: 'ACTIVE',
      totalLectures: 6,
    },
  ],
  [
    103,
    {
      active: false,
      certificateEligible: false,
      completed: true,
      completedAt: '2026-02-18T09:00:00Z',
      completedLectures: 4,
      completionRate: 100,
      enrolledAt: '2025-11-05T09:00:00Z',
      expireAt: '2026-02-28T14:59:59Z',
      id: 103,
      programId: 2004,
      programTitle: 'POCUS 응급 핸즈온',
      progress: [
        {
          completed: true,
          completedAt: '2025-11-08T10:00:00Z',
          lastWatchedAt: '2025-11-08T10:00:00Z',
          lectureId: 1,
          watchedSeconds: 780,
        },
        {
          completed: true,
          completedAt: '2025-11-15T10:30:00Z',
          lastWatchedAt: '2025-11-15T10:30:00Z',
          lectureId: 2,
          watchedSeconds: 840,
        },
        {
          completed: true,
          completedAt: '2025-11-22T11:10:00Z',
          lastWatchedAt: '2025-11-22T11:10:00Z',
          lectureId: 3,
          watchedSeconds: 910,
        },
        {
          completed: true,
          completedAt: '2026-02-18T09:00:00Z',
          lastWatchedAt: '2026-02-18T09:00:00Z',
          lectureId: 4,
          watchedSeconds: 1260,
        },
      ],
      status: 'EXPIRED',
      totalLectures: 4,
    },
  ],
]);

const testCart: CartSummary = {
  appliedCoupon: {
    code: 'SPRING',
    discountAmount: 25000,
    discountType: 'FIXED_AMOUNT',
    discountValue: 25000,
    id: 10,
    name: '봄맞이 할인',
  },
  itemCount: 4,
  items: [
    {
      addedAt: '2026-03-15T08:30:00Z',
      detailPath: '/programs/doctor-course/pocus/fast/2026-mar-apr',
      id: 55,
      instructorName: '김강사',
      originalPrice: 120000,
      payablePrice: 99000,
      programId: 2002,
      programType: 'ONLINE',
      saleEndAt: null,
      salePrice: 99000,
      saleStartAt: null,
      thumbnailUrl: '/test-cart-pocus.jpg',
      title: 'POCUS 워크숍',
    },
    {
      addedAt: '2026-03-16T11:10:00Z',
      detailPath: '/programs/general-course/cardiology/cardiac-master/detail',
      id: 56,
      instructorName: '이소노',
      originalPrice: 180000,
      payablePrice: 149000,
      programId: 2003,
      programType: 'ONLINE',
      saleEndAt: '2026-03-31T14:59:59Z',
      salePrice: 149000,
      saleStartAt: '2026-03-01T00:00:00Z',
      thumbnailUrl: '/test-cart-cardiology.jpg',
      title: '심장초음파 실전 마스터 클래스',
    },
    {
      addedAt: '2026-03-16T14:40:00Z',
      detailPath: '/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-mar-apr',
      id: 57,
      instructorName: '박핸즈온',
      originalPrice: 220000,
      payablePrice: 185000,
      programId: 3001,
      programType: 'OFFLINE',
      saleEndAt: null,
      salePrice: 185000,
      saleStartAt: null,
      thumbnailUrl: '/test-cart-offline.jpg',
      title: '복부초음파 오프라인 핸즈온',
    },
    {
      addedAt: '2026-03-17T02:15:00Z',
      detailPath: '/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-may-jun',
      id: 58,
      instructorName: '최케이스',
      originalPrice: 150000,
      payablePrice: 129000,
      programId: 2008,
      programType: 'ONLINE',
      saleEndAt: '2026-03-25T14:59:59Z',
      salePrice: 129000,
      saleStartAt: '2026-03-10T00:00:00Z',
      thumbnailUrl: '/test-cart-report.jpg',
      title: '복부초음파 증례 해설 세션',
    },
  ],
  totalDiscountAmount: 108000,
  totalOriginalPrice: 670000,
  totalPayablePrice: 562000,
};

const testApplicationSummary: ApplicationSummary = {
  appliedCoupon: testCart.appliedCoupon,
  hasOfflineReservation: true,
  hasOnlineCheckout: true,
  offlineItemCount: 1,
  offlineItems: [
    {
      cartItemId: 57,
      payablePrice: 185000,
      programId: 3001,
      programType: 'OFFLINE',
      title: '복부초음파 오프라인 핸즈온',
    },
  ],
  onlineItems: [
    {
      cartItemId: 55,
      payablePrice: 99000,
      programId: 2002,
      programType: 'ONLINE',
      title: 'POCUS 워크숍',
    },
    {
      cartItemId: 56,
      payablePrice: 149000,
      programId: 2003,
      programType: 'ONLINE',
      title: '심장초음파 실전 마스터 클래스',
    },
    {
      cartItemId: 58,
      payablePrice: 129000,
      programId: 2008,
      programType: 'ONLINE',
      title: '복부초음파 증례 해설 세션',
    },
  ],
  onlinePayablePrice: 377000,
};

const testCoupons: UserCoupon[] = [
  {
    appliesTo: 'ALL',
    code: 'SPRING',
    description: '장바구니 전체 결제에 바로 적용할 수 있는 시즌 쿠폰입니다.',
    discountType: 'FIXED_AMOUNT',
    discountValue: 25000,
    expiresAt: '2026-04-05T14:59:59Z',
    id: 10,
    issuedAt: '2026-03-12T09:00:00Z',
    minimumOrderAmount: 150000,
    name: '봄맞이 할인',
    usable: true,
    validFromAt: '2026-03-12T09:00:00Z',
  },
  {
    appliesTo: 'ONLINE',
    code: 'ONLINE10',
    description: '온라인 강의 20만원 이상 선택 시 10% 할인을 제공합니다.',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    expiresAt: '2026-03-31T14:59:59Z',
    id: 11,
    issuedAt: '2026-03-10T09:00:00Z',
    minimumOrderAmount: 200000,
    name: '온라인 집중 10%',
    usable: true,
    validFromAt: '2026-03-10T09:00:00Z',
  },
];

const testReservations: OfflineReservation[] = [
  {
    createdAt: '2026-03-01T09:00:00Z',
    detailPath: '/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-mar-apr',
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
    thumbnailUrl: '/test-reservation-offline.jpg',
  },
  {
    createdAt: '2026-03-07T06:30:00Z',
    detailPath: '/programs/general-course/msk/workshop/detail',
    id: 701,
    location: '부산 세미나룸',
    note: '준비물 안내 문자 발송 예정',
    programId: 3002,
    programTitle: '근골격계 초음파 워크숍',
    scheduleEndAt: '2026-04-24T12:30:00Z',
    scheduleId: 902,
    scheduleStartAt: '2026-04-24T09:30:00Z',
    scheduleTitle: '4월 실습반',
    status: 'REQUESTED',
    thumbnailUrl: '/test-reservation-msk.jpg',
  },
  {
    createdAt: '2026-02-15T05:15:00Z',
    detailPath: '/programs/doctor-course/pocus/emergency-intensive/detail',
    id: 702,
    location: '대구 강의장',
    note: '취소 요청 완료',
    programId: 3003,
    programTitle: '응급 초음파 집중 코스',
    scheduleEndAt: '2026-03-20T17:00:00Z',
    scheduleId: 903,
    scheduleStartAt: '2026-03-20T13:00:00Z',
    scheduleTitle: '3월 집중반',
    status: 'CANCELLED',
    thumbnailUrl: '/test-reservation-emergency.jpg',
  },
];

const testRefunds: RefundHistory[] = [
  {
    id: 880,
    orderName: '복부초음파 기초',
    paymentMethod: '카드 결제',
    processedAt: '2026-03-08T02:10:00Z',
    programId: 2001,
    programTitle: '복부초음파 기초',
    reason: '수강 일정 변경',
    refundAmount: 99000,
    requestedAt: '2026-03-07T08:20:00Z',
    status: 'REFUNDED',
  },
  {
    id: 881,
    orderName: '심장초음파 실전 마스터 클래스',
    paymentMethod: '무통장입금',
    processedAt: null,
    programId: 2003,
    programTitle: '심장초음파 실전 마스터 클래스',
    reason: '결제 수단 변경 예정',
    refundAmount: 149000,
    requestedAt: '2026-03-16T05:40:00Z',
    status: 'REFUND_REQUESTED',
  },
  {
    id: 882,
    orderName: '복부초음파 오프라인 핸즈온',
    paymentMethod: '카드 결제',
    processedAt: '2026-02-25T04:30:00Z',
    programId: 3001,
    programTitle: '복부초음파 오프라인 핸즈온',
    reason: '오프라인 일정 취소',
    refundAmount: 185000,
    requestedAt: '2026-02-24T12:10:00Z',
    status: 'CANCELLED',
  },
];

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
    marketingEmailOptIn: true,
    marketingOptInUpdatedAt: '2026-03-05T09:30:00Z',
    marketingSmsOptIn: false,
    name: '홍길동',
    nickname: '길벗',
    phoneNumber: '010-1111-2222',
    phoneVerifiedAt: '2026-03-01T09:00:00Z',
    role: 'STUDENT',
  });
  updateMyProfileMock.mockResolvedValue({
    displayName: '김학생',
    email: 'newstudent@example.com',
    loginId: 'student01',
    marketingEmailOptIn: true,
    marketingOptInUpdatedAt: '2026-03-18T09:00:00Z',
    marketingSmsOptIn: true,
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
    marketingEmailOptIn: true,
    marketingOptInUpdatedAt: '2026-03-05T09:30:00Z',
    marketingSmsOptIn: false,
    name: '홍길동',
    nickname: '길벗',
    phoneNumber: '010-3333-4444',
    phoneVerifiedAt: '2026-03-17T10:10:00Z',
    role: 'STUDENT',
  });
  fetchMyEnrollmentsMock.mockResolvedValue(testEnrollments);
  fetchMyEnrollmentDetailMock.mockImplementation((enrollmentId: number) => {
    const detail = testEnrollmentDetails.get(enrollmentId);

    if (!detail) {
      throw new Error(`Enrollment detail not found for ${String(enrollmentId)}`);
    }

    return Promise.resolve(detail);
  });
  fetchMyCartMock.mockResolvedValue(testCart);
  fetchMyCouponsMock.mockResolvedValue(testCoupons);
  fetchMyApplicationSummaryMock.mockResolvedValue(testApplicationSummary);
  fetchMyReservationsMock.mockResolvedValue(testReservations);
  fetchMyRefundsMock.mockResolvedValue(testRefunds);
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
    expect(screen.getByRole('button', { name: '나의 쿠폰' })).toBeInTheDocument();

    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();
    expect(screen.getByText('심장초음파 실전')).toBeInTheDocument();
    expect(screen.getByText('POCUS 응급 핸즈온')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /복부초음파 기초/ })).toHaveTextContent('수강 기간');
    expect(screen.getByRole('button', { name: /복부초음파 기초/ })).toHaveTextContent('~');
    expect(await screen.findByText('67%')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '수강하기' })).toHaveAttribute(
      'href',
      '/mypage/learning/101',
    );
  });

  it('updates the lecture detail when another enrolled lecture is selected', async () => {
    renderMyPage();

    expect(
      await screen.findByRole('heading', { level: 3, name: '복부초음파 기초' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /심장초음파 실전/ }));

    expect(
      await screen.findByRole('heading', { level: 3, name: '심장초음파 실전' }),
    ).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getByText('5 / 6')).toBeInTheDocument();
    expect(screen.getByText('가능')).toBeInTheDocument();
  });

  it('shows multiple reservation items when the orders reservations item is selected', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '신청 내역' }));

    expect(await screen.findByText('오프라인 핸즈온')).toBeInTheDocument();
    expect(screen.getByText('근골격계 초음파 워크숍')).toBeInTheDocument();
    expect(screen.getByText('응급 초음파 집중 코스')).toBeInTheDocument();
    expect(screen.getAllByText('신청 확정').length).toBeGreaterThan(0);
    expect(screen.getAllByText('신청 완료').length).toBeGreaterThan(0);
    expect(screen.getAllByText('취소됨').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '오프라인 핸즈온' })).toHaveAttribute(
      'href',
      '/programs/general-course/abdomen/abdomen-basic-6-weeks/2026-mar-apr',
    );
    expect(screen.getByRole('img', { name: '오프라인 핸즈온 대표 이미지' })).toHaveAttribute(
      'src',
      '/test-reservation-offline.jpg',
    );
  });

  it('shows checkout data when the orders checkout item is selected', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '장바구니' }));

    expect(await screen.findByText('POCUS 워크숍')).toBeInTheDocument();
    expect(screen.getByText('심장초음파 실전 마스터 클래스')).toBeInTheDocument();
    expect(screen.getByText('복부초음파 오프라인 핸즈온')).toBeInTheDocument();
    expect(screen.getByText('복부초음파 증례 해설 세션')).toBeInTheDocument();
    expect(screen.getByText('4개')).toBeInTheDocument();
    expect(screen.getByText('3건')).toBeInTheDocument();
    expect(screen.getByText('1건')).toBeInTheDocument();
    expect(screen.getByText('562,000원')).toBeInTheDocument();
    expect(screen.getByText('670,000원')).toBeInTheDocument();
    expect(screen.getByText('108,000원')).toBeInTheDocument();
    expect(screen.getByText('쿠폰 봄맞이 할인 (25,000원)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'POCUS 워크숍' })).toHaveAttribute(
      'href',
      '/programs/doctor-course/pocus/fast/2026-mar-apr',
    );
    expect(screen.getByRole('img', { name: 'POCUS 워크숍 대표 이미지' })).toHaveAttribute(
      'src',
      '/test-cart-pocus.jpg',
    );
  });

  it('submits profile updates from the basic profile item', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '기본 정보' }));

    const emailInput = await screen.findByLabelText('이메일');
    const nameInput = await screen.findByLabelText('이름');
    await waitFor(() => {
      expect(emailInput).toHaveValue('student01@example.com');
      expect(nameInput).toHaveValue('홍길동');
    });
    fireEvent.change(emailInput, {
      target: { value: 'newstudent@example.com' },
    });
    fireEvent.change(nameInput, {
      target: { value: '김학생' },
    });
    fireEvent.click(screen.getByLabelText('문자로 일정/혜택 안내를 받겠습니다.'));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(updateMyProfileMock).toHaveBeenCalled();
      expect(updateMyProfileMock.mock.calls[0][0]).toEqual({
        email: 'newstudent@example.com',
        marketingEmailOptIn: true,
        marketingSmsOptIn: true,
        name: '김학생',
        nickname: '길벗',
      });
    });
  });

  it('opens inline phone verification from the basic profile item', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '기본 정보' }));

    expect(await screen.findByLabelText('휴대폰 인증 완료')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '휴대폰 번호 변경' }));
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

  it('shows refund history items when the refunds item is selected', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '취소/환불 내역' }));

    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();
    expect(screen.getByText('심장초음파 실전 마스터 클래스')).toBeInTheDocument();
    expect(screen.getByText('복부초음파 오프라인 핸즈온')).toBeInTheDocument();
    expect(screen.getAllByText('환불 완료').length).toBeGreaterThan(0);
    expect(screen.getAllByText('환불 진행 중').length).toBeGreaterThan(0);
    expect(screen.getAllByText('취소 완료').length).toBeGreaterThan(0);
    expect(screen.getByText(/환불 금액 99,000원/)).toBeInTheDocument();
  });

  it('shows coupon cards when the coupons item is selected', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '나의 쿠폰' }));

    expect(await screen.findByText('봄맞이 할인')).toBeInTheDocument();
    expect(screen.getByText('온라인 집중 10%')).toBeInTheDocument();
    expect(screen.getAllByText('사용 가능').length).toBeGreaterThan(0);
    expect(screen.getByText(/전체 과정 · 최소 150,000원/)).toBeInTheDocument();
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
