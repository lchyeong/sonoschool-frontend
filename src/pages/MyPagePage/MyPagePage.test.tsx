import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MyPagePage from '@/pages/MyPagePage/MyPagePage';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  EnrollmentDetail,
  EnrollmentSummary,
  RefundHistory,
  UserCoupon,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';
import type { PaymentResult } from '@/types/payment';

const createMyEnrollmentReviewMock =
  vi.fn<(programId: number, payload: { content: string; rating: number }) => Promise<void>>();
const fetchMyEnrollmentDetailMock = vi.fn<(enrollmentId: number) => Promise<EnrollmentDetail>>();
const fetchMyProfileMock = vi.fn<() => Promise<UserProfile>>();
const updateMyProfileMock = vi.fn<(payload: UserProfileUpdatePayload) => Promise<UserProfile>>();
const sendMyPhoneVerificationMock = vi.fn<(payload: SmsSendPayload) => Promise<SmsSendResponse>>();
const updateMyEnrollmentReviewMock =
  vi.fn<(reviewId: number, payload: { content: string; rating: number }) => Promise<void>>();
const verifyMyPhoneChangeMock = vi.fn<(payload: SmsVerifyPayload) => Promise<UserProfile>>();
const fetchMyEnrollmentsMock = vi.fn<() => Promise<EnrollmentSummary[]>>();
const fetchMyCouponsMock = vi.fn<() => Promise<UserCoupon[]>>();
const fetchPaymentHistoryMock = vi.fn<() => Promise<PaymentResult[]>>();
const fetchMyRefundsMock = vi.fn<() => Promise<RefundHistory[]>>();
const logoutStudentMock = vi.fn<() => Promise<void>>();

vi.mock('@/api/mypage', () => ({
  createMyEnrollmentReview: (programId: number, payload: { content: string; rating: number }) =>
    createMyEnrollmentReviewMock(programId, payload),
  fetchMyCoupons: () => fetchMyCouponsMock(),
  fetchMyEnrollmentDetail: (enrollmentId: number) => fetchMyEnrollmentDetailMock(enrollmentId),
  fetchMyEnrollments: () => fetchMyEnrollmentsMock(),
  fetchMyProfile: () => fetchMyProfileMock(),
  fetchMyRefunds: () => fetchMyRefundsMock(),
  sendMyPhoneVerification: (payload: SmsSendPayload) => sendMyPhoneVerificationMock(payload),
  updateMyEnrollmentReview: (reviewId: number, payload: { content: string; rating: number }) =>
    updateMyEnrollmentReviewMock(reviewId, payload),
  updateMyProfile: (payload: UserProfileUpdatePayload) => updateMyProfileMock(payload),
  verifyMyPhoneChange: (payload: SmsVerifyPayload) => verifyMyPhoneChangeMock(payload),
}));

vi.mock('@/api/payments', () => ({
  fetchPaymentHistory: () => fetchPaymentHistoryMock(),
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
    certificateEligible: false,
    hasPracticum: true,
    completed: false,
    completedAt: null,
    completedLectures: 2,
    completionRate: 67,
    enrolledAt: '2026-02-01T09:00:00Z',
    expireAt: '2026-12-31T14:59:59Z',
    id: 101,
    lastLearningAt: '2026-03-10T08:00:00Z',
    programId: 2001,
    programThumbnailUrl: null,
    programTitle: '복부초음파 기초',
    reviewWritable: true,
    reviewWritten: false,
    status: 'ACTIVE',
    totalLectures: 3,
  },
  {
    active: true,
    certificateEligible: true,
    hasPracticum: false,
    completed: false,
    completedAt: null,
    completedLectures: 5,
    completionRate: 83,
    enrolledAt: '2026-02-20T09:00:00Z',
    expireAt: '2026-08-31T14:59:59Z',
    id: 102,
    lastLearningAt: '2026-03-16T06:45:00Z',
    programId: 2003,
    programThumbnailUrl: null,
    programTitle: '심장초음파 실전',
    reviewWritable: false,
    reviewWritten: true,
    status: 'ACTIVE',
    totalLectures: 6,
  },
  {
    active: false,
    certificateEligible: false,
    hasPracticum: false,
    completed: true,
    completedAt: '2026-02-18T09:00:00Z',
    completedLectures: 4,
    completionRate: 100,
    enrolledAt: '2025-11-05T09:00:00Z',
    expireAt: '2026-02-28T14:59:59Z',
    id: 103,
    lastLearningAt: '2026-02-18T09:00:00Z',
    programId: 2004,
    programThumbnailUrl: null,
    programTitle: 'POCUS 응급 핸즈온',
    reviewWritable: false,
    reviewWritten: false,
    status: 'EXPIRED',
    totalLectures: 4,
  },
  {
    active: false,
    certificateEligible: true,
    hasPracticum: false,
    completed: true,
    completedAt: '2026-03-04T09:00:00Z',
    completedLectures: 3,
    completionRate: 100,
    enrolledAt: '2026-01-05T09:00:00Z',
    expireAt: '2026-03-30T14:59:59Z',
    id: 104,
    lastLearningAt: '2026-03-04T09:00:00Z',
    programId: 2005,
    programThumbnailUrl: null,
    programTitle: '취소된 강의',
    reviewWritable: false,
    reviewWritten: false,
    status: 'CANCELLED',
    totalLectures: 3,
  },
];

const testEnrollmentDetails: Record<number, EnrollmentDetail> = {
  101: {
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
    review: null,
    reviewWritable: true,
    reviewWritten: false,
    status: 'ACTIVE',
    totalLectures: 3,
  },
  102: {
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
    progress: [],
    review: {
      content: '실습과 함께 보기 좋았습니다.',
      createdAt: '2026-03-18T10:00:00Z',
      id: 910,
      rating: 5,
      updatedAt: '2026-03-18T10:00:00Z',
    },
    reviewWritable: false,
    reviewWritten: true,
    status: 'ACTIVE',
    totalLectures: 6,
  },
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

const testPaymentHistory: PaymentResult[] = [
  {
    amount: 149000,
    approvedAmount: 149000,
    cancelReason: null,
    cancelledAt: null,
    failedAt: null,
    orderNumber: 'ORD-501',
    id: 501,
    orderName: '심장초음파 실전 마스터 클래스',
    orderType: 'CART_CHECKOUT',
    paidAt: '2026-03-18T10:05:00Z',
    paymentMethod: 'CARD',
    receiptUrl: 'https://example.com/receipt/501',
    registeredAt: '2026-03-18T10:04:00Z',
    requestedAt: '2026-03-18T10:00:00Z',
    status: 'COMPLETED',
  },
  {
    amount: 99000,
    approvedAmount: null,
    cancelReason: '사용자 요청 취소',
    cancelledAt: '2026-03-18T10:20:00Z',
    failedAt: null,
    orderNumber: 'ORD-504',
    id: 504,
    orderName: '복부초음파 기초',
    orderType: 'CART_CHECKOUT',
    paidAt: null,
    paymentMethod: 'CARD',
    receiptUrl: null,
    registeredAt: '2026-03-18T10:01:00Z',
    requestedAt: '2026-03-18T10:00:00Z',
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
  createMyEnrollmentReviewMock.mockResolvedValue(undefined);
  updateMyEnrollmentReviewMock.mockResolvedValue(undefined);
  fetchMyEnrollmentsMock.mockResolvedValue(testEnrollments);
  fetchMyEnrollmentDetailMock.mockImplementation((enrollmentId: number) =>
    Promise.resolve(testEnrollmentDetails[enrollmentId]),
  );
  fetchMyCouponsMock.mockResolvedValue(testCoupons);
  fetchPaymentHistoryMock.mockResolvedValue(testPaymentHistory);
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
  it('renders grouped sidebar categories and active course cards by default', async () => {
    renderMyPage();

    expect(screen.getByRole('heading', { level: 1, name: '마이페이지' })).toBeInTheDocument();
    expect(screen.getByText('학습 관리')).toBeInTheDocument();
    expect(screen.getByText('주문/결제')).toBeInTheDocument();
    expect(screen.getByText('내 정보')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내 강의' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결제 내역' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '나의 쿠폰' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '장바구니' })).not.toBeInTheDocument();

    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();
    expect(screen.getByText('심장초음파 실전')).toBeInTheDocument();
    expect(screen.queryByText('POCUS 응급 핸즈온')).not.toBeInTheDocument();
    expect(screen.queryByText('취소된 강의')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /수료증/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '후기 작성' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '후기 수정' })).toBeInTheDocument();
    expect(await screen.findByText('67%')).toBeInTheDocument();
    expect(screen.getByText('2 / 3강')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '이어보기' })[0]).toHaveAttribute(
      'href',
      '/mypage/learning/101',
    );
    expect(screen.getByRole('link', { name: '실습 예약' })).toHaveAttribute(
      'href',
      '/mypage/enrollments/101/practicum',
    );
  });

  it('switches between 수강 종료 and 수료증 tabs', async () => {
    renderMyPage();

    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /수강 종료/ }));

    expect(await screen.findByText('POCUS 응급 핸즈온')).toBeInTheDocument();
    expect(screen.queryByText('취소된 강의')).not.toBeInTheDocument();
    expect(screen.queryByText('복부초음파 기초')).not.toBeInTheDocument();
    expect(screen.getByText('수강 종료된 강의입니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /수료증/ }));

    expect(await screen.findByText('심장초음파 실전')).toBeInTheDocument();
    expect(screen.queryByText('취소된 강의')).not.toBeInTheDocument();
    expect(screen.queryByText('복부초음파 기초')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수료증 다운로드' })).toBeInTheDocument();
  });

  it('shows payment history with receipt actions', async () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '결제 내역' }));

    expect(await screen.findByText('심장초음파 실전 마스터 클래스')).toBeInTheDocument();
    expect(screen.getByText('복부초음파 기초')).toBeInTheDocument();
    expect(screen.getAllByText('결제 완료').length).toBeGreaterThan(0);
    expect(screen.getAllByText('결제 취소').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '영수증 보기' })).toHaveAttribute(
      'href',
      'https://example.com/receipt/501',
    );
    expect(screen.getAllByRole('link', { name: '결제 상세 보기' })[0]).toHaveAttribute(
      'href',
      '/payments/result?paymentId=501&status=COMPLETED',
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
    expect(emailInput).toHaveAttribute('readonly');
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

  it('creates a review from my course card', async () => {
    renderMyPage();

    expect(await screen.findByText('복부초음파 기초')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '후기 작성' }));

    expect(await screen.findByRole('dialog', { name: '후기 작성' })).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('평점'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('후기 내용'), {
      target: { value: '실습 전에 예습하기 좋은 강의였습니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '후기 등록하기' }));

    await waitFor(() => {
      expect(createMyEnrollmentReviewMock).toHaveBeenCalledWith(2001, {
        content: '실습 전에 예습하기 좋은 강의였습니다.',
        rating: 4,
      });
    });
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
