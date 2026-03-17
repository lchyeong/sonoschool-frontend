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

interface PendingPhoneVerification {
  code: string;
  expiresAt: string;
  phoneNumber: string;
}

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const createInitialProfile = (): UserProfile => {
  return {
    displayName: '홍길동',
    email: 'student01@example.com',
    loginId: 'student01',
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
]);

const mockCart: CartSummary = {
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
};

const mockApplicationSummary: ApplicationSummary = {
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
};

const mockReservations: OfflineReservation[] = [
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
];

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

export const resetMockMyPageData = (): void => {
  profileState = createInitialProfile();
  pendingPhoneVerification = null;
};

export const getMockMyProfile = (): UserProfile => {
  return cloneData(profileState);
};

export const updateMockMyProfile = (payload: UserProfileUpdatePayload): UserProfile => {
  profileState = {
    ...profileState,
    displayName: payload.nickname.trim() || payload.name,
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

export const getMockMyCart = (): CartSummary => {
  return cloneData(mockCart);
};

export const getMockMyApplicationSummary = (): ApplicationSummary => {
  return cloneData(mockApplicationSummary);
};

export const getMockMyReservations = (): OfflineReservation[] => {
  return cloneData(mockReservations);
};
