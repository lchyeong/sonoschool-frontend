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
  ProgramType,
  ProtectedLectureStream,
  RefundHistory,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';
import type { ProgramCurriculumLesson, ProgramCurriculumTrack } from '@/types/programCatalog';
import { isOnlineProgramType } from '@/utils/programType';

interface PendingPhoneVerification {
  code: string;
  expiresAt: string;
  phoneNumber: string;
}

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const enrollmentThumbnailByProgramId: Record<number, string> = {
  2001: homeLecture1Src,
  2003: homeLecture2Src,
  2004: homeLecture3Src,
  2005: homeLecture4Src,
  2006: homeLecture5Src,
  2007: homeLecture1Src,
  2009: homeLecture2Src,
  2010: homeLecture3Src,
  2011: homeLecture4Src,
  2012: homeLecture5Src,
  2013: homeLecture1Src,
  2014: homeLecture2Src,
  2018: homeLecture3Src,
  2019: homeLecture4Src,
  2020: homeLecture5Src,
  2021: homeLecture1Src,
  2022: homeLecture2Src,
  2023: homeLecture3Src,
};

const learningProgramTypeByProgramId: Partial<Record<number, ProgramType>> = {
  2001: 'ONLINE',
  2003: 'ONLINE',
  2004: 'OFFLINE',
  2005: 'ONLINE',
  2006: 'ONLINE',
  2007: 'PROBLEM_SOLVING',
  2009: 'HYBRID',
  2010: 'ONLINE',
  2011: 'PROBLEM_SOLVING',
  2012: 'ONLINE',
  2013: 'PROBLEM_SOLVING',
  2014: 'PROBLEM_SOLVING',
  2018: 'ONLINE',
  2019: 'HYBRID',
  2020: 'PROBLEM_SOLVING',
  2021: 'ONLINE',
  2022: 'HYBRID',
  2023: 'ONLINE',
};

const learningDeliverySequenceByProgramType: Record<
  ProgramType,
  ProgramCurriculumLesson['deliveryType'][]
> = {
  HYBRID: ['online', 'problem', 'practicum', 'resource'],
  OFFLINE: ['online', 'problem', 'offline', 'resource'],
  ONLINE: ['online', 'problem', 'resource'],
  PROBLEM_SOLVING: ['problem', 'resource'],
};

const resolveLearningProgramType = (programId: number): ProgramType => {
  return learningProgramTypeByProgramId[programId] ?? 'ONLINE';
};

const getLearningLessonDeliveryType = (
  programType: ProgramType,
  lessonIndex: number,
): ProgramCurriculumLesson['deliveryType'] => {
  const sequence = learningDeliverySequenceByProgramType[programType];
  return sequence[lessonIndex % sequence.length] ?? 'online';
};

const formatMockOfflineDate = (value: Date) => {
  return value.toISOString().slice(0, 10);
};

const createLearningLesson = (
  detail: EnrollmentDetail,
  lessonNumber: number,
  lessonId: string,
  deliveryType: ProgramCurriculumLesson['deliveryType'],
): ProgramCurriculumLesson => {
  if (deliveryType === 'offline') {
    const startDate = new Date(`2026-04-${String(10 + lessonNumber).padStart(2, '0')}T00:00:00Z`);

    return {
      deliveryType,
      description: `${detail.programTitle} 현장 일정 안내와 준비사항입니다.`,
      durationLabel: '현장 일정',
      durationMinutes: null,
      endDate: formatMockOfflineDate(startDate),
      id: lessonId,
      offlineSchedules: [
        {
          absent: false,
          attendanceCompleted: false,
          date: formatMockOfflineDate(startDate),
          endTime: '17:00',
          location: '소노스쿨 실습실',
          notes: '현장 등록은 시작 10분 전부터 가능합니다.',
          ruleId: 90_000 + lessonNumber,
          startTime: '14:00',
        },
      ],
      startDate: formatMockOfflineDate(startDate),
      title: `${detail.programTitle} ${String(lessonNumber)}회차`,
    };
  }

  if (deliveryType === 'problem') {
    return {
      deliveryType,
      description: `${detail.programTitle} 핵심 포인트를 문제로 복습합니다.`,
      durationLabel: '문제 풀이',
      durationMinutes: null,
      endDate: null,
      id: lessonId,
      problemAttempted: false,
      problemTimeLimitSeconds: 30 * 60,
      questionCount: 10,
      startDate: null,
      title: `${detail.programTitle} ${String(lessonNumber)}강 문제풀이`,
    };
  }

  if (deliveryType === 'resource') {
    return {
      deliveryType,
      description: `${detail.programTitle} 첨부자료와 체크리스트를 제공합니다.`,
      durationLabel: '첨부자료',
      durationMinutes: null,
      endDate: null,
      id: lessonId,
      startDate: null,
      title: `${detail.programTitle} ${String(lessonNumber)}강 첨부자료`,
    };
  }

  if (deliveryType === 'practicum') {
    return {
      deliveryType,
      description: `${detail.programTitle} 실습 예약 안내와 실습 목표를 확인합니다.`,
      durationLabel: '실습 예약',
      durationMinutes: null,
      endDate: null,
      id: lessonId,
      startDate: null,
      title: `${detail.programTitle} ${String(lessonNumber)}강 실습`,
    };
  }

  return {
    deliveryType,
    description: `${detail.programTitle} ${String(lessonNumber)}강 학습 콘텐츠`,
    durationLabel: `${String(25 + lessonNumber * 5)}분`,
    durationMinutes: 25 + lessonNumber * 5,
    endDate: null,
    id: lessonId,
    startDate: null,
    title: `${detail.programTitle} ${String(lessonNumber)}강`,
  };
};

const createLearningResourceAttachments = (detail: EnrollmentDetail, lessonNumber: number) => {
  return [
    {
      description: `${detail.programTitle} ${String(lessonNumber)}강 핵심 정리 자료입니다.`,
      fileName: `${detail.programTitle.replaceAll(' ', '-')}-${String(lessonNumber)}-summary.pdf`,
      fileSize: 2_400_000,
      fileUrl: `https://example.com/assets/programs/${String(detail.programId)}/lesson-${String(
        lessonNumber,
      )}-summary.pdf`,
      id: lessonNumber * 100 + 1,
      mimeType: 'application/pdf',
      sortOrder: 0,
      title: '강의 요약 자료',
    },
    {
      description: `${detail.programTitle} ${String(lessonNumber)}강 점검 체크리스트입니다.`,
      fileName: `${detail.programTitle.replaceAll(' ', '-')}-${String(lessonNumber)}-checklist.xlsx`,
      fileSize: 980_000,
      fileUrl: `https://example.com/assets/programs/${String(detail.programId)}/lesson-${String(
        lessonNumber,
      )}-checklist.xlsx`,
      id: lessonNumber * 100 + 2,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sortOrder: 1,
      title: '실습 체크리스트',
    },
  ];
};

const getLastLearningAtFromDetail = (detail: EnrollmentDetail): string | null => {
  return detail.progress.reduce<string | null>((latest, progressItem) => {
    if (!progressItem.lastWatchedAt) {
      return latest;
    }

    if (!latest) {
      return progressItem.lastWatchedAt;
    }

    return new Date(progressItem.lastWatchedAt) > new Date(latest)
      ? progressItem.lastWatchedAt
      : latest;
  }, null);
};

const enrichEnrollmentSummary = (enrollment: EnrollmentSummary): EnrollmentSummary => {
  const detail = mockEnrollmentDetails.get(enrollment.id);

  if (!detail) {
    return enrollment;
  }

  return {
    ...enrollment,
    certificateEligible: detail.certificateEligible,
    completed: detail.completed,
    completedAt: detail.completedAt,
    completedLectures: detail.completedLectures,
    completionRate: detail.completionRate,
    lastLearningAt: getLastLearningAtFromDetail(detail),
    programThumbnailUrl:
      enrollmentThumbnailByProgramId[enrollment.programId] ?? enrollment.programThumbnailUrl,
    totalLectures: detail.totalLectures,
  };
};

const demoStreamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

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
    certificateEligible: false,
    hasPracticum: false,
    completed: false,
    completedAt: null,
    completedLectures: 0,
    completionRate: 0,
    enrolledAt: '2026-02-01T09:00:00Z',
    expireAt: '2026-12-31T14:59:59Z',
    id: 101,
    lastLearningAt: null,
    programId: 2001,
    programThumbnailUrl: null,
    programTitle: '복부초음파 기초',
    status: 'ACTIVE',
    totalLectures: 0,
  },
  {
    active: true,
    certificateEligible: false,
    hasPracticum: false,
    completed: false,
    completedAt: null,
    completedLectures: 0,
    completionRate: 0,
    enrolledAt: '2026-02-20T09:00:00Z',
    expireAt: '2026-08-31T14:59:59Z',
    id: 102,
    lastLearningAt: null,
    programId: 2003,
    programThumbnailUrl: null,
    programTitle: '심장초음파 실전',
    status: 'ACTIVE',
    totalLectures: 0,
  },
  {
    active: false,
    certificateEligible: false,
    hasPracticum: false,
    completed: false,
    completedAt: null,
    completedLectures: 0,
    completionRate: 0,
    enrolledAt: '2025-11-05T09:00:00Z',
    expireAt: '2026-02-28T14:59:59Z',
    id: 103,
    lastLearningAt: null,
    programId: 2004,
    programThumbnailUrl: null,
    programTitle: 'POCUS 응급 핸즈온',
    status: 'EXPIRED',
    totalLectures: 0,
  },
  {
    active: true,
    certificateEligible: false,
    hasPracticum: false,
    completed: false,
    completedAt: null,
    completedLectures: 0,
    completionRate: 0,
    enrolledAt: '2026-03-03T09:00:00Z',
    expireAt: '2026-09-30T14:59:59Z',
    id: 104,
    lastLearningAt: null,
    programId: 2005,
    programThumbnailUrl: null,
    programTitle: '갑상선 초음파 판독 입문',
    status: 'ACTIVE',
    totalLectures: 0,
  },
  {
    active: false,
    certificateEligible: false,
    hasPracticum: false,
    completed: false,
    completedAt: null,
    completedLectures: 0,
    completionRate: 0,
    enrolledAt: '2025-10-12T09:00:00Z',
    expireAt: '2026-01-31T14:59:59Z',
    id: 105,
    lastLearningAt: null,
    programId: 2006,
    programThumbnailUrl: null,
    programTitle: '산과 초음파 핵심 포인트',
    status: 'EXPIRED',
    totalLectures: 0,
  },
  {
    active: false,
    certificateEligible: false,
    hasPracticum: false,
    completed: false,
    completedAt: null,
    completedLectures: 0,
    completionRate: 0,
    enrolledAt: '2026-01-20T09:00:00Z',
    expireAt: '2026-07-31T14:59:59Z',
    id: 106,
    lastLearningAt: null,
    programId: 2007,
    programThumbnailUrl: null,
    programTitle: '혈관초음파 실전 케이스 리뷰',
    status: 'CANCELLED',
    totalLectures: 0,
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
  totalOriginalPrice: 670000,
  totalPayablePrice: 562000,
};

const mockApplicationSummary: ApplicationSummary = {
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
    paymentMethod: '카드 결제',
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
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-03-05T09:00:00Z',
      expireAt: '2026-10-05T14:59:59Z',
      id: 107,
      lastLearningAt: null,
      programId: 2009,
      programThumbnailUrl: null,
      programTitle: '근골격 초음파 실습 베이직',
      status: 'ACTIVE',
      totalLectures: 0,
    },
    {
      active: true,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-03-09T09:00:00Z',
      expireAt: '2026-09-15T14:59:59Z',
      id: 108,
      lastLearningAt: null,
      programId: 2010,
      programThumbnailUrl: null,
      programTitle: '여성초음파 리포트 워크숍',
      status: 'ACTIVE',
      totalLectures: 0,
    },
    {
      active: false,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2025-09-10T09:00:00Z',
      expireAt: '2025-12-31T14:59:59Z',
      id: 109,
      lastLearningAt: null,
      programId: 2011,
      programThumbnailUrl: null,
      programTitle: '흉부초음파 판독 집중',
      status: 'EXPIRED',
      totalLectures: 0,
    },
    {
      active: true,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-03-11T09:00:00Z',
      expireAt: '2026-11-30T14:59:59Z',
      id: 110,
      lastLearningAt: null,
      programId: 2012,
      programThumbnailUrl: null,
      programTitle: '소아 초음파 스캔 루틴',
      status: 'ACTIVE',
      totalLectures: 0,
    },
    {
      active: false,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2025-08-22T09:00:00Z',
      expireAt: '2025-11-30T14:59:59Z',
      id: 111,
      lastLearningAt: null,
      programId: 2013,
      programThumbnailUrl: null,
      programTitle: '응급 POCUS 야간 케이스',
      status: 'EXPIRED',
      totalLectures: 0,
    },
    {
      active: false,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-02-03T09:00:00Z',
      expireAt: '2026-08-03T14:59:59Z',
      id: 112,
      lastLearningAt: null,
      programId: 2014,
      programThumbnailUrl: null,
      programTitle: '유방초음파 임상 케이스',
      status: 'CANCELLED',
      totalLectures: 0,
    },
    {
      active: true,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-03-12T09:00:00Z',
      expireAt: '2026-12-20T14:59:59Z',
      id: 113,
      lastLearningAt: null,
      programId: 2018,
      programThumbnailUrl: null,
      programTitle: '간초음파 패턴 분석 코스',
      status: 'ACTIVE',
      totalLectures: 0,
    },
    {
      active: true,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-03-14T09:00:00Z',
      expireAt: '2026-09-30T14:59:59Z',
      id: 114,
      lastLearningAt: null,
      programId: 2019,
      programThumbnailUrl: null,
      programTitle: '도플러 측정 워크플로 실전',
      status: 'ACTIVE',
      totalLectures: 0,
    },
    {
      active: false,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2025-07-18T09:00:00Z',
      expireAt: '2025-10-31T14:59:59Z',
      id: 115,
      lastLearningAt: null,
      programId: 2020,
      programThumbnailUrl: null,
      programTitle: '상복부 케이스 리뷰 아카이브',
      status: 'EXPIRED',
      totalLectures: 0,
    },
    {
      active: false,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2025-12-01T09:00:00Z',
      expireAt: '2026-02-14T14:59:59Z',
      id: 116,
      lastLearningAt: null,
      programId: 2021,
      programThumbnailUrl: null,
      programTitle: '산부인과 초음파 판독 심화',
      status: 'EXPIRED',
      totalLectures: 0,
    },
    {
      active: false,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-02-18T09:00:00Z',
      expireAt: '2026-08-18T14:59:59Z',
      id: 117,
      lastLearningAt: null,
      programId: 2022,
      programThumbnailUrl: null,
      programTitle: '혈류 도플러 핸즈온 특강',
      status: 'CANCELLED',
      totalLectures: 0,
    },
    {
      active: false,
      certificateEligible: false,
      hasPracticum: false,
      completed: false,
      completedAt: null,
      completedLectures: 0,
      completionRate: 0,
      enrolledAt: '2026-03-01T09:00:00Z',
      expireAt: '2026-09-01T14:59:59Z',
      id: 118,
      lastLearningAt: null,
      programId: 2023,
      programThumbnailUrl: null,
      programTitle: '외래초음파 실전 템플릿',
      status: 'CANCELLED',
      totalLectures: 0,
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
      paymentMethod: '카드 결제',
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
const initialApplicationSummarySnapshot = cloneData(mockApplicationSummary);
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
};

const createLearningPlayerSnapshot = (detail: EnrollmentDetail): LearningPlayerSnapshot => {
  const lessonsPerSection = 3;
  const programType = resolveLearningProgramType(detail.programId);
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
            const lessonId = `enrollment-${String(detail.id)}-lesson-${String(lessonNumber)}`;
            const deliveryType = getLearningLessonDeliveryType(programType, lessonNumber - 1);

            return createLearningLesson(detail, lessonNumber, lessonId, deliveryType);
          }),
          title: `${String(sectionIndex + 1)}단계 학습`,
        };
      },
    ),
    summaryItems: [
      `${String(detail.totalLectures)}개 학습 항목`,
      `완료 ${String(detail.completedLectures)}개`,
      `진도율 ${String(detail.completionRate)}%`,
    ],
    summaryKind: 'decimal',
    title: `${detail.programTitle} 플레이어`,
  };
  const resourceAttachmentsByLessonId = Object.fromEntries(
    curriculumTrack.sections.flatMap((section) => {
      return section.lessons.flatMap((lesson, lessonIndexWithinSection) => {
        if (lesson.deliveryType !== 'resource') {
          return [];
        }

        const lessonNumber =
          curriculumTrack.sections
            .slice(
              0,
              curriculumTrack.sections.findIndex((item) => item.id === section.id),
            )
            .reduce((count, current) => count + current.lessons.length, 0) +
          lessonIndexWithinSection +
          1;

        return [[lesson.id, createLearningResourceAttachments(detail, lessonNumber)]];
      });
    }),
  );

  return {
    enrollment: {
      active: detail.active,
      completedLessons: detail.completedLectures,
      completionRate: detail.completionRate,
      enrolledAt: detail.enrolledAt,
      expireAt: detail.expireAt,
      id: detail.id,
      programId: detail.programId,
      programTitle: detail.programTitle,
      status: detail.status,
      totalLessons: detail.totalLectures,
    },
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
            mimeType:
              getLearningLessonDeliveryType(programType, lessonIndex) === 'online'
                ? 'application/x-mpegURL'
                : null,
            posterUrl: null,
          },
        ];
      }),
    ),
    lessonProgressByLessonId: Object.fromEntries(
      lessonIds.map((lessonId, lessonIndex) => {
        const progress = progressByLectureId.get(lessonIndex + 1);
        const watchedSeconds = progress?.watchedSeconds ?? 0;
        const durationSeconds = (25 + (lessonIndex + 1) * 5) * 60;

        return [
          lessonId,
          {
            completed: progress?.completed ?? false,
            completedAt: progress?.completedAt ?? null,
            lastWatchedAt: progress?.lastWatchedAt ?? null,
            lectureId: lessonIndex + 1,
            progressPercent: progress?.completed
              ? 100
              : Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100)),
            watchedSeconds,
          },
        ];
      }),
    ),
    resourceAttachmentsByLessonId,
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
  mockCart.totalPayablePrice = initialCartSnapshot.totalPayablePrice;
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
  return cloneData(mockEnrollments.map(enrichEnrollmentSummary));
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

export const getMockMyRefunds = (): RefundHistory[] => {
  return cloneData(mockRefunds);
};
