import homeLecture1Src from '@/assets/sample/home_lecture_1.jpg';
import homeLecture2Src from '@/assets/sample/home_lecture_2.png';
import homeLecture3Src from '@/assets/sample/home_lecture_3.jpg';
import homeLecture4Src from '@/assets/sample/home_lecture_4.jpg';
import homeLecture5Src from '@/assets/sample/home_lecture_5.jpg';
import type { SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  AddToCartPayload,
  ApplicationSummary,
  CartSummary,
  EnrollmentDetail,
  EnrollmentSummary,
  LearningPlayerSnapshot,
  OfflineReservation,
  ProtectedLectureStream,
  RefundHistory,
  UserCoupon,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';
import type { ProgramCurriculumTrack } from '@/types/programCatalog';
import { isOnlineProgramType } from '@/utils/programType';

interface PendingPhoneVerification {
  code: string;
  expiresAt: string;
  phoneNumber: string;
}

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const demoStreamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const createInitialProfile = (): UserProfile => {
  return {
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
    role: 'ROLE_STUDENT',
  };
};

const mockEnrollments: EnrollmentSummary[] = [
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
  {
    active: true,
    enrolledAt: '2026-03-03T09:00:00Z',
    expireAt: '2026-09-30T14:59:59Z',
    id: 104,
    programId: 2005,
    programThumbnailUrl: null,
    programTitle: '갑상선 초음파 판독 입문',
    status: 'ACTIVE',
  },
  {
    active: false,
    enrolledAt: '2025-10-12T09:00:00Z',
    expireAt: '2026-01-31T14:59:59Z',
    id: 105,
    programId: 2006,
    programThumbnailUrl: null,
    programTitle: '산과 초음파 핵심 포인트',
    status: 'EXPIRED',
  },
  {
    active: false,
    enrolledAt: '2026-01-20T09:00:00Z',
    expireAt: '2026-07-31T14:59:59Z',
    id: 106,
    programId: 2007,
    programThumbnailUrl: null,
    programTitle: '혈관초음파 실전 케이스 리뷰',
    status: 'CANCELLED',
  },
];

const mockEnrollmentDetails = new Map<number, EnrollmentDetail>([
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
  [
    104,
    {
      active: true,
      certificateEligible: false,
      completed: false,
      completedAt: null,
      completedLectures: 1,
      completionRate: 13,
      enrolledAt: '2026-03-03T09:00:00Z',
      expireAt: '2026-09-30T14:59:59Z',
      id: 104,
      programId: 2005,
      programTitle: '갑상선 초음파 판독 입문',
      progress: [
        {
          completed: true,
          completedAt: '2026-03-05T09:20:00Z',
          lastWatchedAt: '2026-03-05T09:20:00Z',
          lectureId: 1,
          watchedSeconds: 1320,
        },
        {
          completed: false,
          completedAt: null,
          lastWatchedAt: '2026-03-14T07:35:00Z',
          lectureId: 2,
          watchedSeconds: 360,
        },
      ],
      status: 'ACTIVE',
      totalLectures: 8,
    },
  ],
  [
    105,
    {
      active: false,
      certificateEligible: false,
      completed: false,
      completedAt: null,
      completedLectures: 4,
      completionRate: 67,
      enrolledAt: '2025-10-12T09:00:00Z',
      expireAt: '2026-01-31T14:59:59Z',
      id: 105,
      programId: 2006,
      programTitle: '산과 초음파 핵심 포인트',
      progress: [
        {
          completed: true,
          completedAt: '2025-10-20T08:50:00Z',
          lastWatchedAt: '2025-10-20T08:50:00Z',
          lectureId: 1,
          watchedSeconds: 1180,
        },
        {
          completed: true,
          completedAt: '2025-11-01T07:40:00Z',
          lastWatchedAt: '2025-11-01T07:40:00Z',
          lectureId: 2,
          watchedSeconds: 1240,
        },
        {
          completed: true,
          completedAt: '2025-11-18T06:30:00Z',
          lastWatchedAt: '2025-11-18T06:30:00Z',
          lectureId: 3,
          watchedSeconds: 1090,
        },
        {
          completed: true,
          completedAt: '2025-12-04T11:10:00Z',
          lastWatchedAt: '2025-12-04T11:10:00Z',
          lectureId: 4,
          watchedSeconds: 950,
        },
        {
          completed: false,
          completedAt: null,
          lastWatchedAt: '2026-01-12T10:15:00Z',
          lectureId: 5,
          watchedSeconds: 420,
        },
      ],
      status: 'EXPIRED',
      totalLectures: 6,
    },
  ],
  [
    106,
    {
      active: false,
      certificateEligible: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-01-20T09:00:00Z',
      expireAt: '2026-07-31T14:59:59Z',
      id: 106,
      programId: 2007,
      programTitle: '혈관초음파 실전 케이스 리뷰',
      progress: [],
      status: 'CANCELLED',
      totalLectures: 5,
    },
  ],
]);

const mockCart: CartSummary = {
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
      thumbnailUrl: homeLecture1Src,
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
      thumbnailUrl: homeLecture2Src,
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
      thumbnailUrl: homeLecture3Src,
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
      thumbnailUrl: homeLecture4Src,
      title: '복부초음파 증례 해설 세션',
    },
  ],
  totalDiscountAmount: 108000,
  totalOriginalPrice: 670000,
  totalPayablePrice: 562000,
};

const mockCoupons: UserCoupon[] = [
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
  {
    appliesTo: 'OFFLINE',
    code: 'HANDSON30',
    description: '오프라인 실습 과정 전용 정액 할인 쿠폰입니다.',
    discountType: 'FIXED_AMOUNT',
    discountValue: 30000,
    expiresAt: '2026-04-12T14:59:59Z',
    id: 12,
    issuedAt: '2026-03-14T09:00:00Z',
    minimumOrderAmount: 180000,
    name: '핸즈온 3만원 할인',
    usable: true,
    validFromAt: '2026-03-14T09:00:00Z',
  },
  {
    appliesTo: 'ALL',
    code: 'WELCOME7',
    description: '첫 결제 고객 대상 7% 할인 쿠폰입니다.',
    discountType: 'PERCENTAGE',
    discountValue: 7,
    expiresAt: '2026-04-30T14:59:59Z',
    id: 13,
    issuedAt: '2026-03-01T09:00:00Z',
    minimumOrderAmount: 100000,
    name: '웰컴 7%',
    usable: true,
    validFromAt: '2026-03-01T09:00:00Z',
  },
  {
    appliesTo: 'ONLINE',
    code: 'VIP50000',
    description: '고액 온라인 결제 전용 VIP 쿠폰입니다.',
    discountType: 'FIXED_AMOUNT',
    discountValue: 50000,
    expiresAt: '2026-03-24T14:59:59Z',
    id: 14,
    issuedAt: '2026-03-18T09:00:00Z',
    minimumOrderAmount: 500000,
    name: 'VIP 5만원',
    usable: true,
    validFromAt: '2026-03-18T09:00:00Z',
  },
];

const mockApplicationSummary: ApplicationSummary = {
  appliedCoupon: mockCart.appliedCoupon,
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

const mockReservations: OfflineReservation[] = [
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
    thumbnailUrl: homeLecture3Src,
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
    thumbnailUrl: homeLecture5Src,
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
    thumbnailUrl: homeLecture1Src,
  },
  {
    createdAt: '2026-03-12T04:20:00Z',
    detailPath: '/programs/general-course/breast/reporting-workshop/detail',
    id: 703,
    location: '광주 실습센터',
    note: '사전 문진표 제출 완료',
    programId: 3004,
    programTitle: '유방초음파 판독 워크숍',
    scheduleEndAt: '2026-04-30T12:00:00Z',
    scheduleId: 904,
    scheduleStartAt: '2026-04-30T09:00:00Z',
    scheduleTitle: '4월 판독반',
    status: 'CONFIRMED',
    thumbnailUrl: homeLecture2Src,
  },
  {
    createdAt: '2026-03-14T08:45:00Z',
    detailPath: '/programs/doctor-course/pocus/fast/2026-sep-oct',
    id: 704,
    location: '온라인 사전 OT 후 서울 실습',
    note: '대기 등록 상태',
    programId: 3005,
    programTitle: 'FAST 집중 실습 코스',
    scheduleEndAt: '2026-05-08T16:00:00Z',
    scheduleId: 905,
    scheduleStartAt: '2026-05-08T13:00:00Z',
    scheduleTitle: '5월 주말반',
    status: 'REQUESTED',
    thumbnailUrl: homeLecture4Src,
  },
];

const mockRefunds: RefundHistory[] = [
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

const createGeneratedEnrollmentDetail = (
  id: number,
  programId: number,
  programTitle: string,
  status: EnrollmentDetail['status'],
  enrolledAt: string,
  expireAt: string,
  totalLectures: number,
  completedLectures: number,
  lastWatchedAt: string | null,
): EnrollmentDetail => {
  const normalizedCompletedLectures = Math.min(completedLectures, totalLectures);
  const completionRate =
    totalLectures > 0 ? Math.round((normalizedCompletedLectures / totalLectures) * 100) : 0;

  return {
    active: status === 'ACTIVE',
    certificateEligible: completionRate >= 80,
    completed: completionRate === 100,
    completedAt: completionRate === 100 ? lastWatchedAt : null,
    completedLectures: normalizedCompletedLectures,
    completionRate,
    enrolledAt,
    expireAt,
    id,
    programId,
    programTitle,
    progress: Array.from(
      { length: Math.max(normalizedCompletedLectures, lastWatchedAt ? 1 : 0) },
      (_, index) => ({
        completed: index < normalizedCompletedLectures,
        completedAt: index < normalizedCompletedLectures ? lastWatchedAt : null,
        lastWatchedAt: index === 0 ? lastWatchedAt : null,
        lectureId: index + 1,
        watchedSeconds: index < normalizedCompletedLectures ? 900 + index * 60 : 0,
      }),
    ),
    status,
    totalLectures,
  };
};

const extendMockMyPageData = (): void => {
  const extraEnrollments: EnrollmentSummary[] = [
    {
      active: true,
      enrolledAt: '2026-03-05T09:00:00Z',
      expireAt: '2026-10-05T14:59:59Z',
      id: 107,
      programId: 2009,
      programThumbnailUrl: null,
      programTitle: '근골격 초음파 실습 베이직',
      status: 'ACTIVE',
    },
    {
      active: true,
      enrolledAt: '2026-03-09T09:00:00Z',
      expireAt: '2026-09-15T14:59:59Z',
      id: 108,
      programId: 2010,
      programThumbnailUrl: null,
      programTitle: '여성초음파 리포트 워크숍',
      status: 'ACTIVE',
    },
    {
      active: false,
      enrolledAt: '2025-09-10T09:00:00Z',
      expireAt: '2025-12-31T14:59:59Z',
      id: 109,
      programId: 2011,
      programThumbnailUrl: null,
      programTitle: '흉부초음파 판독 집중',
      status: 'EXPIRED',
    },
    {
      active: true,
      enrolledAt: '2026-03-11T09:00:00Z',
      expireAt: '2026-11-30T14:59:59Z',
      id: 110,
      programId: 2012,
      programThumbnailUrl: null,
      programTitle: '소아 초음파 스캔 루틴',
      status: 'ACTIVE',
    },
    {
      active: false,
      enrolledAt: '2025-08-22T09:00:00Z',
      expireAt: '2025-11-30T14:59:59Z',
      id: 111,
      programId: 2013,
      programThumbnailUrl: null,
      programTitle: '응급 POCUS 야간 케이스',
      status: 'EXPIRED',
    },
    {
      active: false,
      enrolledAt: '2026-02-03T09:00:00Z',
      expireAt: '2026-08-03T14:59:59Z',
      id: 112,
      programId: 2014,
      programThumbnailUrl: null,
      programTitle: '유방초음파 임상 케이스',
      status: 'CANCELLED',
    },
    {
      active: true,
      enrolledAt: '2026-03-12T09:00:00Z',
      expireAt: '2026-12-20T14:59:59Z',
      id: 113,
      programId: 2018,
      programThumbnailUrl: null,
      programTitle: '간초음파 패턴 분석 코스',
      status: 'ACTIVE',
    },
    {
      active: true,
      enrolledAt: '2026-03-14T09:00:00Z',
      expireAt: '2026-09-30T14:59:59Z',
      id: 114,
      programId: 2019,
      programThumbnailUrl: null,
      programTitle: '도플러 측정 워크플로 실전',
      status: 'ACTIVE',
    },
    {
      active: false,
      enrolledAt: '2025-07-18T09:00:00Z',
      expireAt: '2025-10-31T14:59:59Z',
      id: 115,
      programId: 2020,
      programThumbnailUrl: null,
      programTitle: '상복부 케이스 리뷰 아카이브',
      status: 'EXPIRED',
    },
    {
      active: false,
      enrolledAt: '2025-12-01T09:00:00Z',
      expireAt: '2026-02-14T14:59:59Z',
      id: 116,
      programId: 2021,
      programThumbnailUrl: null,
      programTitle: '산부인과 초음파 판독 심화',
      status: 'EXPIRED',
    },
    {
      active: false,
      enrolledAt: '2026-02-18T09:00:00Z',
      expireAt: '2026-08-18T14:59:59Z',
      id: 117,
      programId: 2022,
      programThumbnailUrl: null,
      programTitle: '혈류 도플러 핸즈온 특강',
      status: 'CANCELLED',
    },
    {
      active: false,
      enrolledAt: '2026-03-01T09:00:00Z',
      expireAt: '2026-09-01T14:59:59Z',
      id: 118,
      programId: 2023,
      programThumbnailUrl: null,
      programTitle: '외래초음파 실전 템플릿',
      status: 'CANCELLED',
    },
  ];

  mockEnrollments.push(...extraEnrollments);

  [
    createGeneratedEnrollmentDetail(
      107,
      2009,
      '근골격 초음파 실습 베이직',
      'ACTIVE',
      '2026-03-05T09:00:00Z',
      '2026-10-05T14:59:59Z',
      9,
      4,
      '2026-03-17T09:10:00Z',
    ),
    createGeneratedEnrollmentDetail(
      108,
      2010,
      '여성초음파 리포트 워크숍',
      'ACTIVE',
      '2026-03-09T09:00:00Z',
      '2026-09-15T14:59:59Z',
      7,
      2,
      '2026-03-16T12:20:00Z',
    ),
    createGeneratedEnrollmentDetail(
      109,
      2011,
      '흉부초음파 판독 집중',
      'EXPIRED',
      '2025-09-10T09:00:00Z',
      '2025-12-31T14:59:59Z',
      5,
      5,
      '2025-12-20T07:40:00Z',
    ),
    createGeneratedEnrollmentDetail(
      110,
      2012,
      '소아 초음파 스캔 루틴',
      'ACTIVE',
      '2026-03-11T09:00:00Z',
      '2026-11-30T14:59:59Z',
      12,
      1,
      '2026-03-18T03:20:00Z',
    ),
    createGeneratedEnrollmentDetail(
      111,
      2013,
      '응급 POCUS 야간 케이스',
      'EXPIRED',
      '2025-08-22T09:00:00Z',
      '2025-11-30T14:59:59Z',
      6,
      3,
      '2025-11-21T11:35:00Z',
    ),
    createGeneratedEnrollmentDetail(
      112,
      2014,
      '유방초음파 임상 케이스',
      'CANCELLED',
      '2026-02-03T09:00:00Z',
      '2026-08-03T14:59:59Z',
      8,
      0,
      null,
    ),
    createGeneratedEnrollmentDetail(
      113,
      2018,
      '간초음파 패턴 분석 코스',
      'ACTIVE',
      '2026-03-12T09:00:00Z',
      '2026-12-20T14:59:59Z',
      10,
      6,
      '2026-03-18T08:10:00Z',
    ),
    createGeneratedEnrollmentDetail(
      114,
      2019,
      '도플러 측정 워크플로 실전',
      'ACTIVE',
      '2026-03-14T09:00:00Z',
      '2026-09-30T14:59:59Z',
      8,
      3,
      '2026-03-18T12:40:00Z',
    ),
    createGeneratedEnrollmentDetail(
      115,
      2020,
      '상복부 케이스 리뷰 아카이브',
      'EXPIRED',
      '2025-07-18T09:00:00Z',
      '2025-10-31T14:59:59Z',
      6,
      6,
      '2025-10-28T11:15:00Z',
    ),
    createGeneratedEnrollmentDetail(
      116,
      2021,
      '산부인과 초음파 판독 심화',
      'EXPIRED',
      '2025-12-01T09:00:00Z',
      '2026-02-14T14:59:59Z',
      7,
      4,
      '2026-02-10T06:55:00Z',
    ),
    createGeneratedEnrollmentDetail(
      117,
      2022,
      '혈류 도플러 핸즈온 특강',
      'CANCELLED',
      '2026-02-18T09:00:00Z',
      '2026-08-18T14:59:59Z',
      5,
      1,
      '2026-02-20T07:45:00Z',
    ),
    createGeneratedEnrollmentDetail(
      118,
      2023,
      '외래초음파 실전 템플릿',
      'CANCELLED',
      '2026-03-01T09:00:00Z',
      '2026-09-01T14:59:59Z',
      9,
      0,
      null,
    ),
  ].forEach((detail) => {
    mockEnrollmentDetails.set(detail.id, detail);
  });

  mockCart.items.push(
    {
      addedAt: '2026-03-17T05:10:00Z',
      detailPath: '/programs/general-course/abdomen/reporting-course/detail',
      id: 59,
      instructorName: '조리포트',
      originalPrice: 165000,
      payablePrice: 139000,
      programId: 2015,
      programType: 'ONLINE',
      saleEndAt: '2026-03-28T14:59:59Z',
      salePrice: 139000,
      saleStartAt: '2026-03-12T00:00:00Z',
      thumbnailUrl: homeLecture5Src,
      title: '복부초음파 판독 리포트 코스',
    },
    {
      addedAt: '2026-03-17T06:00:00Z',
      detailPath: '/programs/doctor-course/cardiology/practice-intensive/detail',
      id: 60,
      instructorName: '정실습',
      originalPrice: 240000,
      payablePrice: 219000,
      programId: 3010,
      programType: 'OFFLINE',
      saleEndAt: null,
      salePrice: 219000,
      saleStartAt: null,
      thumbnailUrl: homeLecture2Src,
      title: '심장초음파 현장 실습 집중반',
    },
    {
      addedAt: '2026-03-17T07:25:00Z',
      detailPath: '/programs/doctor-course/pocus/fast/2026-sep-oct',
      id: 61,
      instructorName: '윤패스트',
      originalPrice: 99000,
      payablePrice: 79000,
      programId: 2016,
      programType: 'ONLINE',
      saleEndAt: '2026-03-21T14:59:59Z',
      salePrice: 79000,
      saleStartAt: '2026-03-15T00:00:00Z',
      thumbnailUrl: homeLecture1Src,
      title: 'FAST 케이스 퀵리뷰',
    },
    {
      addedAt: '2026-03-17T08:40:00Z',
      detailPath: '/programs/general-course/pediatrics/case-archive/detail',
      id: 62,
      instructorName: '한소아',
      originalPrice: 210000,
      payablePrice: 169000,
      programId: 2017,
      programType: 'ONLINE',
      saleEndAt: '2026-03-31T14:59:59Z',
      salePrice: 169000,
      saleStartAt: '2026-03-08T00:00:00Z',
      thumbnailUrl: homeLecture3Src,
      title: '소아초음파 증례 아카이브',
    },
    {
      addedAt: '2026-03-17T09:15:00Z',
      detailPath: '/programs/general-course/neck-course/thyroid-advanced/detail',
      id: 63,
      instructorName: '송핸즈온',
      originalPrice: 190000,
      payablePrice: 158000,
      programId: 3011,
      programType: 'OFFLINE',
      saleEndAt: null,
      salePrice: 158000,
      saleStartAt: null,
      thumbnailUrl: homeLecture4Src,
      title: '갑상선초음파 실습 어드밴스드',
    },
  );

  mockApplicationSummary.onlineItems.push(
    {
      cartItemId: 59,
      payablePrice: 139000,
      programId: 2015,
      programType: 'ONLINE',
      title: '복부초음파 판독 리포트 코스',
    },
    {
      cartItemId: 61,
      payablePrice: 79000,
      programId: 2016,
      programType: 'ONLINE',
      title: 'FAST 케이스 퀵리뷰',
    },
    {
      cartItemId: 62,
      payablePrice: 169000,
      programId: 2017,
      programType: 'ONLINE',
      title: '소아초음파 증례 아카이브',
    },
  );
  mockApplicationSummary.offlineItems.push(
    {
      cartItemId: 60,
      payablePrice: 219000,
      programId: 3010,
      programType: 'OFFLINE',
      title: '심장초음파 현장 실습 집중반',
    },
    {
      cartItemId: 63,
      payablePrice: 158000,
      programId: 3011,
      programType: 'OFFLINE',
      title: '갑상선초음파 실습 어드밴스드',
    },
  );

  mockReservations.push(
    {
      createdAt: '2026-03-15T05:35:00Z',
      detailPath: '/programs/general-course/pediatrics/live-practice/detail',
      id: 705,
      location: '서울 강남 실습실',
      note: null,
      programId: 3012,
      programTitle: '소아초음파 라이브 실습',
      scheduleEndAt: '2026-05-15T17:00:00Z',
      scheduleId: 906,
      scheduleStartAt: '2026-05-15T13:00:00Z',
      scheduleTitle: '5월 평일반',
      status: 'CONFIRMED',
      thumbnailUrl: homeLecture2Src,
    },
    {
      createdAt: '2026-03-16T01:20:00Z',
      detailPath: '/programs/general-course/chest/case-practice/detail',
      id: 706,
      location: '대전 교육센터',
      note: '인원 확인 후 확정 예정',
      programId: 3013,
      programTitle: '흉부초음파 케이스 실습',
      scheduleEndAt: '2026-05-22T18:00:00Z',
      scheduleId: 907,
      scheduleStartAt: '2026-05-22T14:00:00Z',
      scheduleTitle: '5월 금요반',
      status: 'REQUESTED',
      thumbnailUrl: homeLecture1Src,
    },
    {
      createdAt: '2026-03-16T03:10:00Z',
      detailPath: '/programs/general-course/msk/oneday-practice/detail',
      id: 707,
      location: '서울 본관',
      note: '강사 일정 변경으로 취소',
      programId: 3014,
      programTitle: '근골격 초음파 원데이 실습',
      scheduleEndAt: '2026-04-18T17:30:00Z',
      scheduleId: 908,
      scheduleStartAt: '2026-04-18T10:00:00Z',
      scheduleTitle: '4월 원데이',
      status: 'CANCELLED',
      thumbnailUrl: homeLecture5Src,
    },
    {
      createdAt: '2026-03-17T02:40:00Z',
      detailPath: '/programs/doctor-course/pocus/field-training/detail',
      id: 708,
      location: '부산 해운대 교육장',
      note: null,
      programId: 3015,
      programTitle: '응급초음파 현장 트레이닝',
      scheduleEndAt: '2026-05-29T16:30:00Z',
      scheduleId: 909,
      scheduleStartAt: '2026-05-29T13:30:00Z',
      scheduleTitle: '5월 실습 세션',
      status: 'CONFIRMED',
      thumbnailUrl: homeLecture4Src,
    },
  );

  mockRefunds.push(
    {
      id: 883,
      orderName: '복부초음파 판독 리포트 코스',
      paymentMethod: '카드 결제',
      processedAt: null,
      programId: 2015,
      programTitle: '복부초음파 판독 리포트 코스',
      reason: '구매 옵션 재선택',
      refundAmount: 139000,
      requestedAt: '2026-03-17T07:00:00Z',
      status: 'REFUND_REQUESTED',
    },
    {
      id: 884,
      orderName: '근골격 초음파 실습 베이직',
      paymentMethod: '가상계좌',
      processedAt: '2026-03-03T04:20:00Z',
      programId: 2009,
      programTitle: '근골격 초음파 실습 베이직',
      reason: '중복 결제 정정',
      refundAmount: 119000,
      requestedAt: '2026-03-02T09:00:00Z',
      status: 'REFUNDED',
    },
    {
      id: 885,
      orderName: '심장초음파 현장 실습 집중반',
      paymentMethod: '카드 결제',
      processedAt: '2026-02-12T10:40:00Z',
      programId: 3010,
      programTitle: '심장초음파 현장 실습 집중반',
      reason: '신청 취소',
      refundAmount: 219000,
      requestedAt: '2026-02-11T08:30:00Z',
      status: 'CANCELLED',
    },
  );

  mockCart.itemCount = mockCart.items.length;
  mockCart.totalOriginalPrice = mockCart.items.reduce(
    (total, item) => total + item.originalPrice,
    0,
  );
  mockCart.totalPayablePrice = mockCart.items.reduce((total, item) => total + item.payablePrice, 0);
  mockCart.totalDiscountAmount = mockCart.totalOriginalPrice - mockCart.totalPayablePrice;

  mockApplicationSummary.offlineItemCount = mockApplicationSummary.offlineItems.length;
  mockApplicationSummary.onlinePayablePrice = mockApplicationSummary.onlineItems.reduce(
    (total, item) => total + item.payablePrice,
    0,
  );
};

extendMockMyPageData();

const initialEnrollmentsSnapshot = cloneData(mockEnrollments);
const initialEnrollmentDetailsSnapshot = Array.from(mockEnrollmentDetails.entries()).map(
  ([id, detail]) => {
    return [id, cloneData(detail)] as const;
  },
);
const initialCartSnapshot = cloneData(mockCart);
const initialCouponsSnapshot = cloneData(mockCoupons);
const initialApplicationSummarySnapshot = cloneData(mockApplicationSummary);
const initialReservationsSnapshot = cloneData(mockReservations);
const initialRefundsSnapshot = cloneData(mockRefunds);

let profileState = createInitialProfile();
let pendingPhoneVerification: PendingPhoneVerification | null = null;

const normalizePhoneNumber = (value: string): string => {
  const digits = value.replaceAll(/\D/g, '');

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return value.trim();
};

const getNextCartItemId = (): number => {
  return mockCart.items.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
};

const recalculateCartDerivedState = (): void => {
  mockCart.itemCount = mockCart.items.length;
  mockCart.totalOriginalPrice = mockCart.items.reduce(
    (total, item) => total + item.originalPrice,
    0,
  );
  mockCart.totalPayablePrice = mockCart.items.reduce((total, item) => total + item.payablePrice, 0);
  mockCart.totalDiscountAmount = mockCart.totalOriginalPrice - mockCart.totalPayablePrice;

  mockApplicationSummary.onlineItems = mockCart.items
    .filter((item) => isOnlineProgramType(item.programType))
    .map((item) => ({
      cartItemId: item.id,
      payablePrice: item.payablePrice,
      programId: item.programId,
      programType: item.programType,
      title: item.title,
    }));
  mockApplicationSummary.offlineItems = mockCart.items
    .filter((item) => item.programType === 'OFFLINE')
    .map((item) => ({
      cartItemId: item.id,
      payablePrice: item.payablePrice,
      programId: item.programId,
      programType: item.programType,
      title: item.title,
    }));
  mockApplicationSummary.offlineItemCount = mockApplicationSummary.offlineItems.length;
  mockApplicationSummary.onlinePayablePrice = mockApplicationSummary.onlineItems.reduce(
    (total, item) => total + item.payablePrice,
    0,
  );
  mockApplicationSummary.hasOnlineCheckout = mockApplicationSummary.onlineItems.length > 0;
  mockApplicationSummary.hasOfflineReservation = mockApplicationSummary.offlineItems.length > 0;
};

const createLearningPlayerSnapshot = (detail: EnrollmentDetail): LearningPlayerSnapshot => {
  const lessonsPerSection = 3;
  const lessonIds = Array.from({ length: detail.totalLectures }, (_, index) => {
    return `enrollment-${String(detail.id)}-lesson-${String(index + 1)}`;
  });
  const progressByLectureId = new Map(detail.progress.map((item) => [item.lectureId, item]));
  const currentLessonIndex = lessonIds.findIndex((_, index) => {
    return !progressByLectureId.get(index + 1)?.completed;
  });
  const resolvedCurrentLessonIndex =
    currentLessonIndex >= 0 ? currentLessonIndex : Math.max(lessonIds.length - 1, 0);
  const currentProgress = progressByLectureId.get(resolvedCurrentLessonIndex + 1);
  const curriculumTrack: ProgramCurriculumTrack = {
    id: `enrollment-${String(detail.id)}-track`,
    sections: Array.from(
      { length: Math.max(1, Math.ceil(detail.totalLectures / lessonsPerSection)) },
      (_, sectionIndex) => {
        const startLessonNumber = sectionIndex * lessonsPerSection + 1;
        const lessonCount = Math.min(
          lessonsPerSection,
          Math.max(detail.totalLectures - sectionIndex * lessonsPerSection, 0),
        );

        return {
          description: `${detail.programTitle}의 ${String(sectionIndex + 1)}번째 학습 묶음입니다.`,
          durationLabel: `${String(lessonCount)}강`,
          id: `enrollment-${String(detail.id)}-section-${String(sectionIndex + 1)}`,
          lessons: Array.from({ length: lessonCount }, (_, lessonOffset) => {
            const lessonNumber = startLessonNumber + lessonOffset;

            return {
              deliveryType: 'online',
              description: `${detail.programTitle} ${String(lessonNumber)}강 학습 콘텐츠`,
              durationLabel: `${String(25 + lessonNumber * 5)}분`,
              durationMinutes: 25 + lessonNumber * 5,
              endDate: null,
              id: `enrollment-${String(detail.id)}-lesson-${String(lessonNumber)}`,
              startDate: null,
              title: `${detail.programTitle} ${String(lessonNumber)}강`,
            };
          }),
          title: `${String(sectionIndex + 1)}단계 학습`,
        };
      },
    ),
    summaryItems: [
      `${String(detail.totalLectures)}개 강의`,
      `완료 ${String(detail.completedLectures)}개`,
      `진도율 ${String(detail.completionRate)}%`,
    ],
    summaryKind: 'decimal',
    title: `${detail.programTitle} 플레이어`,
  };

  return {
    completedLessonIds: detail.progress
      .filter((item) => item.completed)
      .map((item) => lessonIds[item.lectureId - 1])
      .filter((item): item is string => Boolean(item)),
    currentLessonId: lessonIds[resolvedCurrentLessonIndex] ?? null,
    curriculumTrack,
    lessonPlaybackById: Object.fromEntries(
      lessonIds.map((lessonId, lessonIndex) => {
        return [
          lessonId,
          {
            lectureId: lessonIndex + 1,
            mimeType: 'application/x-mpegURL',
            posterUrl: null,
          },
        ];
      }),
    ),
    lastPlaybackAt: detail.progress.reduce<string | null>((latest, item) => {
      if (!item.lastWatchedAt) {
        return latest;
      }

      if (!latest) {
        return item.lastWatchedAt;
      }

      return new Date(item.lastWatchedAt) > new Date(latest) ? item.lastWatchedAt : latest;
    }, null),
    nextLessonId: lessonIds[resolvedCurrentLessonIndex + 1] ?? null,
    resumeAtSeconds: currentProgress?.watchedSeconds ?? 0,
  };
};

export const getMockLectureStream = (
  lectureId: number,
  deviceId?: string | null,
): ProtectedLectureStream | null => {
  if (!Number.isInteger(lectureId) || lectureId <= 0) {
    return null;
  }

  const resolvedDeviceId = deviceId?.trim() ? deviceId.trim() : 'mock-device';
  const playbackSessionToken = `mock-playback-${String(lectureId)}-${resolvedDeviceId}`;

  return {
    expiresAt: Math.floor(Date.now() / 1000) + 300,
    hlsKeyUrl: `/api/v1/lectures/${String(lectureId)}/hls-key`,
    hlsUrl: `${demoStreamUrl}?lectureId=${String(lectureId)}`,
    playbackSessionToken,
  };
};

export const resetMockMyPageData = (): void => {
  mockEnrollments.splice(0, mockEnrollments.length, ...cloneData(initialEnrollmentsSnapshot));
  mockEnrollmentDetails.clear();
  initialEnrollmentDetailsSnapshot.forEach(([id, detail]) => {
    mockEnrollmentDetails.set(id, cloneData(detail));
  });
  mockCart.items.splice(0, mockCart.items.length, ...cloneData(initialCartSnapshot.items));
  mockCart.itemCount = initialCartSnapshot.itemCount;
  mockCart.totalOriginalPrice = initialCartSnapshot.totalOriginalPrice;
  mockCart.totalDiscountAmount = initialCartSnapshot.totalDiscountAmount;
  mockCart.totalPayablePrice = initialCartSnapshot.totalPayablePrice;
  mockCart.appliedCoupon = cloneData(initialCartSnapshot.appliedCoupon);
  mockCoupons.splice(0, mockCoupons.length, ...cloneData(initialCouponsSnapshot));
  mockApplicationSummary.onlineItems.splice(
    0,
    mockApplicationSummary.onlineItems.length,
    ...cloneData(initialApplicationSummarySnapshot.onlineItems),
  );
  mockApplicationSummary.offlineItems.splice(
    0,
    mockApplicationSummary.offlineItems.length,
    ...cloneData(initialApplicationSummarySnapshot.offlineItems),
  );
  mockApplicationSummary.onlinePayablePrice = initialApplicationSummarySnapshot.onlinePayablePrice;
  mockApplicationSummary.offlineItemCount = initialApplicationSummarySnapshot.offlineItemCount;
  mockApplicationSummary.hasOnlineCheckout = initialApplicationSummarySnapshot.hasOnlineCheckout;
  mockApplicationSummary.hasOfflineReservation =
    initialApplicationSummarySnapshot.hasOfflineReservation;
  mockApplicationSummary.appliedCoupon = cloneData(initialApplicationSummarySnapshot.appliedCoupon);
  mockReservations.splice(0, mockReservations.length, ...cloneData(initialReservationsSnapshot));
  mockRefunds.splice(0, mockRefunds.length, ...cloneData(initialRefundsSnapshot));
  profileState = createInitialProfile();
  pendingPhoneVerification = null;
};

export const getMockMyProfile = (): UserProfile => {
  return cloneData(profileState);
};

export const updateMockMyProfile = (payload: UserProfileUpdatePayload): UserProfile => {
  profileState = {
    ...profileState,
    email: payload.email.trim(),
    displayName: payload.nickname.trim() || payload.name,
    marketingEmailOptIn: payload.marketingEmailOptIn,
    marketingOptInUpdatedAt: new Date('2026-03-18T09:00:00Z').toISOString(),
    marketingSmsOptIn: payload.marketingSmsOptIn,
    name: payload.name,
    nickname: payload.nickname,
  };

  return cloneData(profileState);
};

export const sendMockMyPhoneVerification = (payload: SmsSendPayload): SmsSendResponse | null => {
  const phoneNumber = normalizePhoneNumber(payload.phoneNumber);

  if (!phoneNumber) {
    return null;
  }

  const expiresAt = '2026-03-17T10:30:00Z';

  pendingPhoneVerification = {
    code: '123456',
    expiresAt,
    phoneNumber,
  };

  return {
    expiresAt,
    phoneNumber,
  };
};

export const verifyMockMyPhoneChange = (payload: SmsVerifyPayload): UserProfile | null => {
  const phoneNumber = normalizePhoneNumber(payload.phoneNumber);

  if (
    !pendingPhoneVerification ||
    pendingPhoneVerification.phoneNumber !== phoneNumber ||
    pendingPhoneVerification.code !== payload.code
  ) {
    return null;
  }

  profileState = {
    ...profileState,
    phoneNumber,
    phoneVerifiedAt: '2026-03-17T10:10:00Z',
  };
  pendingPhoneVerification = null;

  return cloneData(profileState);
};

export const getMockMyEnrollments = (): EnrollmentSummary[] => {
  return cloneData(mockEnrollments);
};

export const getMockMyEnrollmentDetail = (enrollmentId: number): EnrollmentDetail | null => {
  const detail = mockEnrollmentDetails.get(enrollmentId);

  return detail ? cloneData(detail) : null;
};

export const getMockLearningPlayerSnapshot = (
  enrollmentId: number,
): LearningPlayerSnapshot | null => {
  const detail = mockEnrollmentDetails.get(enrollmentId);

  if (!detail || detail.status === 'CANCELLED') {
    return null;
  }

  return cloneData(createLearningPlayerSnapshot(detail));
};

export const getMockMyCart = (): CartSummary => {
  return cloneData(mockCart);
};

export const getMockMyCoupons = (): UserCoupon[] => {
  return cloneData(mockCoupons);
};

export const getMockMyApplicationSummary = (): ApplicationSummary => {
  return cloneData(mockApplicationSummary);
};

export const addMockMyCartItem = (payload: AddToCartPayload): CartSummary => {
  const hasDuplicate = mockCart.items.some((item) => item.programId === payload.programId);

  if (hasDuplicate) {
    throw new Error('이미 장바구니에 담긴 강의입니다.');
  }

  mockCart.items.push({
    addedAt: new Date('2026-03-19T09:00:00Z').toISOString(),
    detailPath: payload.sourcePath,
    id: getNextCartItemId(),
    instructorName: payload.instructorName,
    originalPrice: payload.originalPrice,
    payablePrice: payload.payablePrice,
    programId: payload.programId,
    programType: payload.programType,
    saleEndAt: null,
    salePrice: payload.salePrice,
    saleStartAt: null,
    thumbnailUrl: payload.thumbnailUrl,
    title: payload.title,
  });

  recalculateCartDerivedState();

  return cloneData(mockCart);
};

export const removeMockMyCartItem = (cartItemId: number): CartSummary => {
  const targetIndex = mockCart.items.findIndex((item) => item.id === cartItemId);

  if (targetIndex < 0) {
    throw new Error('장바구니 항목을 찾지 못했습니다.');
  }

  mockCart.items.splice(targetIndex, 1);
  recalculateCartDerivedState();

  return cloneData(mockCart);
};

export const getMockMyReservations = (): OfflineReservation[] => {
  return cloneData(mockReservations);
};

export const getMockMyRefunds = (): RefundHistory[] => {
  return cloneData(mockRefunds);
};
