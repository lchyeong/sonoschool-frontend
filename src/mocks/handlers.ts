import { http, HttpResponse } from 'msw';

import {
  createMockAdminNotice,
  createMockAdminProgram,
  createMockAdminProgramDraftItem,
  createMockAdminProgramMenuItem,
  createMockAdminResource,
  createMockAdminReview,
  deleteMockAdminProgram,
  deleteMockAdminProgramMenuItem,
  getMockAdminConsole,
  getMockAdminProgramDetailResponse,
  getMockAdminProgramsResponse,
  getMockAdminProgramMenuDetailResponse,
  getMockAdminProgramMenuTreeResponse,
  hideMockAdminProgramItem,
  moveMockAdminProgramItem,
  moveMockAdminProgramMenuItem,
  publishMockAdminProgramItem,
  reorderMockAdminProgramMenuItem,
  replyMockAdminQna,
  toggleMockAdminProgramVisibility,
  updateMockAdminProgramMenuItem,
  updateMockAdminProgram,
} from '@/mocks/data/adminConsole';
import {
  cancelMockAdminPayment,
  getMockAdminPaymentDetail,
  getMockAdminPayments,
} from '@/mocks/data/adminPayments';
import {
  createMockAdminProgramLive,
  deleteMockAdminProgramLive,
  getMockAdminProgramCategories,
  getMockAdminProgramDetailLive,
  getMockAdminProgramsLive,
  hideMockAdminProgramLive,
  publishMockAdminProgramLive,
  updateMockAdminProgramLive,
} from '@/mocks/data/adminProgramsLive';
import { getMockHomeHeroSlides } from '@/mocks/data/homeHeroSlides';
import { getMockHomeHistoryTimeline } from '@/mocks/data/homeHistoryTimeline';
import {
  getMockPaymentHistory,
  getMockPaymentResult,
  getMockPaymentResultByToken,
} from '@/mocks/data/payments';
import {
  addMockMyCartItem,
  getMockMyApplicationSummary,
  getMockMyCart,
  getMockMyCoupons,
  getMockLectureStream,
  getMockMyProfile,
  getMockMyRefunds,
  removeMockMyCartItem,
  sendMockMyPhoneVerification as sendMockMyPagePhoneVerification,
  updateMockMyProfile,
  verifyMockMyPhoneChange as verifyMockMyPagePhoneChange,
} from '@/mocks/data/mypage';
import { getMockProgramPage, getMockProgramSearchLectureItems, getMockProgramsOverview } from '@/mocks/data/programCatalog';
import { getMockProgramSearchIndex } from '@/mocks/data/programSearch';
import { getMockSiteNavigation } from '@/mocks/data/siteNavigation';
import {
  getMockRegistrationTerms,
  loginMockStudent,
  logoutMockStudent,
  refreshMockStudentSession,
  registerMockStudent,
  sendMockSmsVerification,
  verifyMockSmsCode,
} from '@/mocks/data/studentAuth';
import type {
  AdminConsoleResponse,
  AdminProgramAccessPolicy,
  AdminNoticeCategory,
  AdminProgramFormat,
  AdminProgramMenuDetailResponse,
  AdminProgramMenuTreeResponse,
  CreateAdminProgramDraftPayload,
  CreateAdminProgramMenuPayload,
  AdminProgramStatus,
  AdminResourceVisibility,
  CreateAdminNoticePayload,
  CreateAdminResourcePayload,
  CreateAdminReviewPayload,
  MoveAdminProgramMenuPayload,
  MoveAdminProgramPayload,
  ReorderAdminProgramMenuPayload,
  ReplyAdminQnaPayload,
  UpdateAdminProgramMenuPayload,
  UpsertAdminProgramPayload,
} from '@/types/adminConsole';
import type { ApiEnvelope, StudentSession } from '@/types/auth';
import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';
import type { HomeHistoryTimelineResponse } from '@/types/homeHistoryTimeline';
import type { AddToCartPayload } from '@/types/mypage';
import type { ProgramPageResponse, ProgramsOverviewResponse } from '@/types/programCatalog';
import type { ProgramSearchIndexResponse } from '@/types/programSearch';
import type { SiteNavigationResponse } from '@/types/siteNavigation';

const unusedAdminProgramMocks = [
  createMockAdminProgram,
  createMockAdminProgramDraftItem,
  deleteMockAdminProgram,
  getMockAdminProgramDetailResponse,
  getMockAdminProgramsResponse,
  hideMockAdminProgramItem,
  moveMockAdminProgramItem,
  publishMockAdminProgramItem,
  toggleMockAdminProgramVisibility,
  updateMockAdminProgram,
];
void unusedAdminProgramMocks;

const unusedAdminProgramStatus: AdminProgramStatus | null = null;
void unusedAdminProgramStatus;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object';
};

const deriveMockProgramId = (sourcePath: string): number => {
  const normalizedPath = sourcePath.trim() || '/programs/detail';

  return Array.from(normalizedPath).reduce((accumulator, character) => {
    return (accumulator * 31 + character.charCodeAt(0)) % 1_000_000_007;
  }, 7_000);
};

const parsePriceAmount = (label: string | undefined, fallback: number): number => {
  const amount = Number(label?.replace(/[^\d]/g, '') ?? '');

  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
};

const inferProgramTypeFromPage = (page: ProgramPageResponse): AddToCartPayload['programType'] => {
  if (page.pageKind !== 'detail') {
    return 'ONLINE';
  }

  const hasOnlineLesson = page.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'online');
  });
  const hasOfflineLesson = page.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'offline');
  });

  if (hasOnlineLesson && hasOfflineLesson) {
    return 'HYBRID';
  }

  return hasOfflineLesson ? 'OFFLINE' : 'ONLINE';
};

const resolveMockCartPayloadByProgramId = (programId: number): AddToCartPayload | null => {
  const lectureItems = getMockProgramSearchLectureItems();

  for (const lectureItem of lectureItems) {
    const candidatePaths = Array.from(
      new Set([
        lectureItem.to,
        lectureItem.to.endsWith('/detail') ? lectureItem.to : `${lectureItem.to}/detail`,
      ]),
    );

    for (const candidatePath of candidatePaths) {
      const candidateProgramId = deriveMockProgramId(`${candidatePath}:${lectureItem.title}`);

      if (candidateProgramId !== programId) {
        continue;
      }

      const programPage = getMockProgramPage(candidatePath);

      if (!programPage || programPage.pageKind !== 'detail') {
        continue;
      }

      const originalPrice = parsePriceAmount(
        programPage.originalPriceLabel,
        parsePriceAmount(programPage.discountedPriceLabel, 100_000),
      );
      const payablePrice = parsePriceAmount(programPage.discountedPriceLabel, originalPrice);

      return {
        instructorName: programPage.instructor.name,
        originalPrice,
        payablePrice,
        programId,
        programType: inferProgramTypeFromPage(programPage),
        salePrice: payablePrice < originalPrice ? payablePrice : null,
        sourcePath: candidatePath,
        thumbnailUrl: programPage.heroImageSrc,
        title: lectureItem.title,
      };
    }
  }

  return null;
};

const isAdminNoticeCategory = (value: unknown): value is AdminNoticeCategory => {
  return value === '운영' || value === '학사' || value === '이벤트';
};

const isAdminResourceVisibility = (value: unknown): value is AdminResourceVisibility => {
  return value === 'public' || value === 'students-only';
};

const isAdminProgramFormat = (value: unknown): value is AdminProgramFormat => {
  return value === 'online' || value === 'offline' || value === 'hybrid';
};

const isAdminProgramAccessPolicy = (value: unknown): value is AdminProgramAccessPolicy => {
  return value === 'cohort' || value === 'limited-window' || value === 'unlimited';
};

const isAdminProgramMenuStatus = (value: unknown): value is 'published' | 'hidden' => {
  return value === 'published' || value === 'hidden';
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());
};

const isProgramInfoItem = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['label'] === 'string' &&
    value['label'].trim().length > 0 &&
    typeof value['value'] === 'string' &&
    value['value'].trim().length > 0
  );
};

const isProgramFaqItem = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    typeof value['question'] === 'string' &&
    value['question'].trim().length > 0 &&
    typeof value['answer'] === 'string' &&
    value['answer'].trim().length > 0
  );
};

const isProgramCurriculumLesson = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    (value['description'] === undefined || typeof value['description'] === 'string') &&
    (value['deliveryType'] === 'online' || value['deliveryType'] === 'offline') &&
    typeof value['durationLabel'] === 'string' &&
    value['durationLabel'].trim().length > 0 &&
    (value['durationMinutes'] === null || typeof value['durationMinutes'] === 'number') &&
    (value['startDate'] === null || typeof value['startDate'] === 'string') &&
    (value['endDate'] === null || typeof value['endDate'] === 'string')
  );
};

const isProgramCurriculumSection = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    value['description'].trim().length > 0 &&
    typeof value['durationLabel'] === 'string' &&
    value['durationLabel'].trim().length > 0 &&
    Array.isArray(value['lessons']) &&
    value['lessons'].every(isProgramCurriculumLesson)
  );
};

const isProgramCurriculumTrack = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    (value['title'] === undefined ||
      (typeof value['title'] === 'string' && value['title'].trim().length > 0)) &&
    (value['summaryKind'] === 'decimal' || value['summaryKind'] === 'disc') &&
    isStringArray(value['summaryItems']) &&
    Array.isArray(value['sections']) &&
    value['sections'].every(isProgramCurriculumSection)
  );
};

const isUpsertAdminProgramPayload = (value: unknown): value is UpsertAdminProgramPayload => {
  return (
    isRecord(value) &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['parentCollectionPath'] === 'string' &&
    value['parentCollectionPath'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    typeof value['heroImageSrc'] === 'string' &&
    value['heroImageSrc'].trim().length > 0 &&
    typeof value['heroImageAlt'] === 'string' &&
    isAdminProgramFormat(value['format']) &&
    isAdminProgramAccessPolicy(value['accessPolicy']) &&
    (value['registrationStartDate'] === null ||
      typeof value['registrationStartDate'] === 'string') &&
    (value['registrationEndDate'] === null || typeof value['registrationEndDate'] === 'string') &&
    (value['learningStartDate'] === null || typeof value['learningStartDate'] === 'string') &&
    (value['learningEndDate'] === null || typeof value['learningEndDate'] === 'string') &&
    typeof value['difficultyLabel'] === 'string' &&
    value['difficultyLabel'].trim().length > 0 &&
    typeof value['originalPrice'] === 'number' &&
    typeof value['price'] === 'number' &&
    (value['capacity'] === null || typeof value['capacity'] === 'number') &&
    isStringArray(value['tags']) &&
    Array.isArray(value['stats']) &&
    value['stats'].every(isProgramInfoItem) &&
    isStringArray(value['learningPoints']) &&
    isStringArray(value['recommendedFor']) &&
    isStringArray(value['preparationChecklist']) &&
    Array.isArray(value['faqItems']) &&
    value['faqItems'].every(isProgramFaqItem) &&
    isProgramCurriculumTrack(value['curriculumTrack']) &&
    (value['hashtagLabels'] === undefined || isStringArray(value['hashtagLabels']))
  );
};

const isCreateAdminProgramDraftPayload = (
  value: unknown,
): value is CreateAdminProgramDraftPayload => {
  return (
    isRecord(value) &&
    typeof value['title'] === 'string' &&
    value['title'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['parentCollectionPath'] === 'string' &&
    value['parentCollectionPath'].trim().length > 0 &&
    isAdminProgramFormat(value['format']) &&
    isAdminProgramAccessPolicy(value['accessPolicy']) &&
    (value['sourceProgramId'] === null ||
      value['sourceProgramId'] === undefined ||
      (typeof value['sourceProgramId'] === 'string' &&
        value['sourceProgramId'].trim().length > 0)) &&
    typeof value['originalPrice'] === 'number' &&
    typeof value['price'] === 'number' &&
    (value['capacity'] === null || typeof value['capacity'] === 'number') &&
    (value['registrationStartDate'] === null ||
      typeof value['registrationStartDate'] === 'string') &&
    (value['registrationEndDate'] === null || typeof value['registrationEndDate'] === 'string') &&
    (value['learningStartDate'] === null || typeof value['learningStartDate'] === 'string') &&
    (value['learningEndDate'] === null || typeof value['learningEndDate'] === 'string')
  );
};

const isCreateAdminProgramMenuPayload = (
  value: unknown,
): value is CreateAdminProgramMenuPayload => {
  return (
    isRecord(value) &&
    (value['parentId'] === null ||
      value['parentId'] === undefined ||
      (typeof value['parentId'] === 'string' && value['parentId'].trim().length > 0)) &&
    typeof value['label'] === 'string' &&
    value['label'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    value['description'].trim().length > 0 &&
    isAdminProgramMenuStatus(value['status'])
  );
};

const isUpdateAdminProgramMenuPayload = (
  value: unknown,
): value is UpdateAdminProgramMenuPayload => {
  return (
    isRecord(value) &&
    typeof value['label'] === 'string' &&
    value['label'].trim().length > 0 &&
    typeof value['slug'] === 'string' &&
    value['slug'].trim().length > 0 &&
    typeof value['description'] === 'string' &&
    value['description'].trim().length > 0 &&
    isAdminProgramMenuStatus(value['status'])
  );
};

const isMoveAdminProgramMenuPayload = (value: unknown): value is MoveAdminProgramMenuPayload => {
  return (
    isRecord(value) &&
    (value['parentId'] === null ||
      value['parentId'] === undefined ||
      (typeof value['parentId'] === 'string' && value['parentId'].trim().length > 0))
  );
};

const isReorderAdminProgramMenuPayload = (
  value: unknown,
): value is ReorderAdminProgramMenuPayload => {
  return isRecord(value) && (value['direction'] === 'up' || value['direction'] === 'down');
};

const isMoveAdminProgramPayload = (value: unknown): value is MoveAdminProgramPayload => {
  return (
    isRecord(value) &&
    typeof value['targetCollectionPath'] === 'string' &&
    value['targetCollectionPath'].trim().length > 0
  );
};

void isUpsertAdminProgramPayload;
void isCreateAdminProgramDraftPayload;
void isMoveAdminProgramPayload;

const createApiEnvelope = <T>(data: T): ApiEnvelope<T> => {
  return {
    data,
    timestamp: new Date().toISOString(),
  };
};

const getStringField = (record: Record<string, unknown>, fieldName: string): string | null => {
  const value = record[fieldName];
  return typeof value === 'string' ? value : null;
};

const adminRoutePatterns = (path: string) => {
  return [`*/api/v1/admin${path}`] as const;
};

const createAdminGetHandlers = (path: string, resolver: Parameters<typeof http.get>[1]) => {
  return adminRoutePatterns(path).map((pattern) => http.get(pattern, resolver));
};

const createAdminPostHandlers = (path: string, resolver: Parameters<typeof http.post>[1]) => {
  return adminRoutePatterns(path).map((pattern) => http.post(pattern, resolver));
};

const createAdminPatchHandlers = (path: string, resolver: Parameters<typeof http.patch>[1]) => {
  return adminRoutePatterns(path).map((pattern) => http.patch(pattern, resolver));
};

const createAdminPutHandlers = (path: string, resolver: Parameters<typeof http.put>[1]) => {
  return adminRoutePatterns(path).map((pattern) => http.put(pattern, resolver));
};

const createAdminDeleteHandlers = (path: string, resolver: Parameters<typeof http.delete>[1]) => {
  return adminRoutePatterns(path).map((pattern) => http.delete(pattern, resolver));
};

export const handlers = [
  http.get('*/api/terms/registration', () => {
    return HttpResponse.json(createApiEnvelope(getMockRegistrationTerms()));
  }),
  http.post('*/api/auth/login', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (
      !isRecord(body) ||
      typeof body['loginId'] !== 'string' ||
      typeof body['password'] !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const result = loginMockStudent({
      loginId: body['loginId'],
      password: body['password'],
    });

    if (!result) {
      return HttpResponse.json(
        { code: 'AUTH_401', message: 'Invalid username or password.' },
        { status: 401 },
      );
    }

    return HttpResponse.json(
      createApiEnvelope({
        ...result.session,
        challengeExpiresAt: null,
        challengeToken: null,
        maskedPhoneNumber: null,
        status: 'COMPLETED' as const,
      }),
      {
        headers: {
          'Set-Cookie': `refresh_token=${result.refreshToken}; Path=/; HttpOnly; SameSite=Lax`,
        },
      },
    );
  }),
  http.post('*/api/auth/login/verify-sms', () => {
    return HttpResponse.json(
      { code: 'AUTH_400_LOGIN_CHALLENGE', message: 'Login verification challenge is invalid.' },
      { status: 400 },
    );
  }),
  http.post('*/api/auth/sms/send', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || typeof body['phoneNumber'] !== 'string') {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    try {
      const response = sendMockSmsVerification(body['phoneNumber']);
      if (!response) {
        return HttpResponse.json({ code: 'GLOBAL_400', message: 'Bad request.' }, { status: 400 });
      }

      return HttpResponse.json(createApiEnvelope(response));
    } catch (error: unknown) {
      return HttpResponse.json(
        {
          code: 'USER_400_PHONE',
          message: error instanceof Error ? error.message : 'Phone number is already registered.',
        },
        { status: 400 },
      );
    }
  }),
  http.post('*/api/auth/sms/verify', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (
      !isRecord(body) ||
      typeof body['phoneNumber'] !== 'string' ||
      typeof body['code'] !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const response = verifyMockSmsCode({
      phoneNumber: body['phoneNumber'],
      code: body['code'],
    });

    if (!response) {
      return HttpResponse.json(
        { code: 'AUTH_400_SMS_CODE', message: 'SMS verification code is invalid.' },
        { status: 400 },
      );
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.post('*/api/auth/register', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const loginId = getStringField(body, 'loginId');
    const email = getStringField(body, 'email');
    const name = getStringField(body, 'name');
    const nickname = getStringField(body, 'nickname');
    const password = getStringField(body, 'password');
    const phoneNumber = getStringField(body, 'phoneNumber');

    if (
      loginId === null ||
      email === null ||
      name === null ||
      nickname === null ||
      password === null ||
      phoneNumber === null
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    try {
      const result = registerMockStudent({
        loginId,
        email,
        name,
        nickname,
        password,
        phoneNumber,
        acceptedTermCodes: Array.isArray(body['acceptedTermCodes'])
          ? body['acceptedTermCodes'].filter((value): value is string => typeof value === 'string')
          : [],
      });

      if (!result) {
        return HttpResponse.json(
          { code: 'AUTH_400_SMS_REQUIRED', message: 'SMS verification is required.' },
          { status: 400 },
        );
      }

      return HttpResponse.json(createApiEnvelope(result.session), {
        headers: {
          'Set-Cookie': `refresh_token=${result.refreshToken}; Path=/; HttpOnly; SameSite=Lax`,
        },
      });
    } catch (error: unknown) {
      return HttpResponse.json(
        {
          code: 'TERM_400_REQUIRED',
          message: error instanceof Error ? error.message : 'Account already exists.',
        },
        { status: 400 },
      );
    }
  }),
  http.post('*/api/auth/refresh', () => {
    const response: StudentSession | null = refreshMockStudentSession();

    if (!response) {
      return HttpResponse.json(
        { code: 'AUTH_401_REFRESH', message: 'Refresh token is invalid.' },
        { status: 401 },
      );
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.post('*/api/auth/logout', () => {
    logoutMockStudent();
    return HttpResponse.json(createApiEnvelope(null));
  }),
  http.get('*/api/users/me', () => {
    return HttpResponse.json(createApiEnvelope(getMockMyProfile()));
  }),
  http.patch('*/api/users/me', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (
      !isRecord(body) ||
      typeof body['name'] !== 'string' ||
      typeof body['nickname'] !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(
      createApiEnvelope(
        updateMockMyProfile({
          name: body['name'],
          nickname: body['nickname'],
        }),
      ),
    );
  }),
  http.post('*/api/users/me/phone/send', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || typeof body['phoneNumber'] !== 'string') {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const response = sendMockMyPagePhoneVerification({ phoneNumber: body['phoneNumber'] });

    if (!response) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.post('*/api/users/me/phone/verify', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (
      !isRecord(body) ||
      typeof body['phoneNumber'] !== 'string' ||
      typeof body['code'] !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const response = verifyMockMyPagePhoneChange({
      code: body['code'],
      phoneNumber: body['phoneNumber'],
    });

    if (!response) {
      return HttpResponse.json({ message: '인증번호가 올바르지 않습니다.' }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.get('*/api/v1/my/enrollments', () => {
    return HttpResponse.json(
      createApiEnvelope([
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
          lastLearningAt: '2026-03-10T08:00:00Z',
          programId: 2001,
          programThumbnailUrl: null,
          programTitle: '복부초음파 기초',
          status: 'ACTIVE',
          totalLectures: 3,
        },
      ]),
    );
  }),
  http.get('*/api/v1/my/enrollments/:enrollmentId', () => {
    return HttpResponse.json(
      createApiEnvelope({
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
      }),
    );
  }),
  http.get('*/api/v1/lectures/:lectureId/stream', ({ params, request }) => {
    const lectureId = Number(params['lectureId']);
    const deviceId = request.headers.get('X-Playback-Device-Id');
    const response = getMockLectureStream(lectureId, deviceId);

    if (!response) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.get('*/api/v1/cart', () => {
    return HttpResponse.json(createApiEnvelope(getMockMyCart()));
  }),
  http.get('*/api/v1/my/coupons', () => {
    return HttpResponse.json(createApiEnvelope(getMockMyCoupons()));
  }),
  http.get('*/api/v1/cart/application-summary', () => {
    return HttpResponse.json(createApiEnvelope(getMockMyApplicationSummary()));
  }),
  http.post('*/api/v1/cart/items', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const {
      instructorName,
      originalPrice,
      payablePrice,
      programId,
      programType,
      salePrice,
      sourcePath,
      thumbnailUrl,
      title,
    } = body;

    let payload: AddToCartPayload;

    if (
      typeof programId === 'number' &&
      !(instructorName !== null && typeof instructorName !== 'string') &&
      typeof originalPrice === 'number' &&
      typeof payablePrice === 'number' &&
      (programType === 'ONLINE' || programType === 'OFFLINE' || programType === 'HYBRID') &&
      (salePrice === null || typeof salePrice === 'number') &&
      typeof sourcePath === 'string' &&
      (thumbnailUrl === null || typeof thumbnailUrl === 'string') &&
      typeof title === 'string'
    ) {
      payload = {
        instructorName: typeof instructorName === 'string' ? instructorName : null,
        originalPrice,
        payablePrice,
        programId,
        programType,
        salePrice: typeof salePrice === 'number' ? salePrice : null,
        sourcePath,
        thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : null,
        title,
      };
    } else if (typeof programId === 'number') {
      const resolvedPayload = resolveMockCartPayloadByProgramId(programId);

      if (!resolvedPayload) {
        return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
      }

      payload = resolvedPayload;
    } else {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    try {
      return HttpResponse.json(createApiEnvelope(addMockMyCartItem(payload)));
    } catch (error) {
      return HttpResponse.json(
        { message: error instanceof Error ? error.message : 'Cart item already exists' },
        { status: 409 },
      );
    }
  }),
  http.delete('*/api/v1/cart/items/:cartItemId', ({ params }) => {
    const cartItemId = Number(params['cartItemId']);

    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return HttpResponse.json({ message: 'Invalid cart item id' }, { status: 400 });
    }

    try {
      return HttpResponse.json(createApiEnvelope(removeMockMyCartItem(cartItemId)));
    } catch (error) {
      return HttpResponse.json(
        { message: error instanceof Error ? error.message : 'Cart item not found' },
        { status: 404 },
      );
    }
  }),
  http.get('*/api/v1/refunds', () => {
    return HttpResponse.json(createApiEnvelope(getMockMyRefunds()));
  }),
  http.get('*/api/v1/payments', () => {
    return HttpResponse.json(createApiEnvelope(getMockPaymentHistory()));
  }),
  http.get('*/api/v1/payments/result', ({ request }) => {
    const token = new URL(request.url).searchParams.get('token');

    if (!token) {
      return HttpResponse.json({ message: 'Token is required' }, { status: 400 });
    }

    const payment = getMockPaymentResultByToken(token);

    if (!payment) {
      return HttpResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(payment));
  }),
  http.get('*/api/v1/payments/:paymentId', ({ params }) => {
    const paymentId = Number(params['paymentId']);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return HttpResponse.json({ message: 'Invalid payment id' }, { status: 400 });
    }

    const payment = getMockPaymentResult(paymentId);

    if (!payment) {
      return HttpResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(payment));
  }),
  ...createAdminGetHandlers('/console', () => {
    const response: AdminConsoleResponse = getMockAdminConsole();

    return HttpResponse.json(response);
  }),
  ...createAdminGetHandlers('/payments', () => {
    return HttpResponse.json(createApiEnvelope(getMockAdminPayments()));
  }),
  ...createAdminGetHandlers('/payments/:paymentId', ({ params }) => {
    const paymentId = Number(params['paymentId']);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return HttpResponse.json({ message: 'Invalid payment id' }, { status: 400 });
    }

    const payment = getMockAdminPaymentDetail(paymentId);

    if (!payment) {
      return HttpResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(payment));
  }),
  ...createAdminGetHandlers('/categories/tree', () => {
    return HttpResponse.json(createApiEnvelope(getMockAdminProgramCategories()));
  }),
  ...createAdminPostHandlers('/payments/:paymentId/cancel', async ({ params, request }) => {
    const paymentId = Number(params['paymentId']);
    const body = await request.json().catch(() => null);

    if (!Number.isInteger(paymentId) || paymentId <= 0 || !isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const reason = body['reason'];

    if (typeof reason !== 'string' || !reason.trim()) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payment = cancelMockAdminPayment(paymentId, reason.trim());

    if (!payment) {
      return HttpResponse.json({ message: 'Payment cannot be cancelled' }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(payment));
  }),
  ...createAdminPostHandlers('/notices', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    const category = body['category'];
    const isPinned = body['isPinned'];

    if (
      typeof title !== 'string' ||
      !isAdminNoticeCategory(category) ||
      typeof isPinned !== 'boolean'
    ) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminNoticePayload = { category, isPinned, title };

    createMockAdminNotice(payload);
    return HttpResponse.json({ ok: true });
  }),
  ...createAdminPostHandlers('/qna/:threadId/replies', async ({ params, request }) => {
    const threadId = typeof params['threadId'] === 'string' ? params['threadId'] : '';
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || !threadId) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const content = body['content'];
    if (typeof content !== 'string') {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: ReplyAdminQnaPayload = { content };
    const updatedThread = replyMockAdminQna(threadId, payload);

    if (!updatedThread) {
      return HttpResponse.json({ message: 'Q&A thread not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminPostHandlers('/resources', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    const description = body['description'];
    const attachmentName = body['attachmentName'];
    const attachmentSizeLabel = body['attachmentSizeLabel'];
    const visibility = body['visibility'];

    if (
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      typeof attachmentName !== 'string' ||
      typeof attachmentSizeLabel !== 'string' ||
      !isAdminResourceVisibility(visibility)
    ) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminResourcePayload = {
      attachmentName,
      attachmentSizeLabel,
      description,
      title,
      visibility: visibility,
    };

    createMockAdminResource(payload);
    return HttpResponse.json({ ok: true });
  }),
  ...createAdminPostHandlers('/reviews', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    const summary = body['summary'];

    if (typeof title !== 'string' || typeof summary !== 'string') {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminReviewPayload = { summary, title };

    createMockAdminReview(payload);
    return HttpResponse.json({ ok: true });
  }),
  ...createAdminGetHandlers('/programs', () => {
    return HttpResponse.json(
      createApiEnvelope({
        content: getMockAdminProgramsLive(),
      }),
    );
  }),
  ...createAdminGetHandlers('/programs/:programId', ({ params }) => {
    const programId = Number(params['programId']);

    if (!Number.isInteger(programId) || programId <= 0) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const response = getMockAdminProgramDetailLive(programId);

    if (!response) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  ...createAdminPostHandlers('/programs', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const createdProgram = createMockAdminProgramLive(body as never);

    return HttpResponse.json(createApiEnvelope(createdProgram), { status: 201 });
  }),
  ...createAdminPutHandlers('/programs/:programId', async ({ params, request }) => {
    const programId = Number(params['programId']);
    const body = await request.json().catch(() => null);

    if (!Number.isInteger(programId) || programId <= 0 || !isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const updatedProgram = updateMockAdminProgramLive(programId, body as never);

    if (!updatedProgram) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(updatedProgram));
  }),
  ...createAdminPostHandlers('/programs/:programId/publish', ({ params }) => {
    const programId = Number(params['programId']);

    if (!Number.isInteger(programId) || programId <= 0) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const updatedProgram = publishMockAdminProgramLive(programId);

    if (!updatedProgram) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminPostHandlers('/programs/:programId/hide', ({ params }) => {
    const programId = Number(params['programId']);

    if (!Number.isInteger(programId) || programId <= 0) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const updatedProgram = hideMockAdminProgramLive(programId);

    if (!updatedProgram) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminDeleteHandlers('/programs/:programId', ({ params }) => {
    const programId = Number(params['programId']);

    if (!Number.isInteger(programId) || programId <= 0) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const isDeleted = deleteMockAdminProgramLive(programId);

    if (!isDeleted) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminPostHandlers('/program-menus', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isCreateAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: CreateAdminProgramMenuPayload = {
      description: body.description,
      label: body.label,
      parentId: body.parentId ?? null,
      slug: body.slug,
      status: body.status,
    };
    const result = createMockAdminProgramMenuItem(payload);

    if (!result.ok) {
      const message =
        result.reason === 'parent-not-found'
          ? 'Program menu parent not found'
          : result.reason === 'parent-has-linked-programs'
            ? 'Program menu parent has linked programs'
            : result.reason === 'top-level-limit-exceeded'
              ? 'Program menu top level limit exceeded'
              : result.reason === 'unsupported-depth'
                ? 'Program menu depth exceeded'
                : result.reason === 'duplicate-slug'
                  ? 'Program menu slug duplicated'
                  : 'Program menu not found';

      return HttpResponse.json({ message }, { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminGetHandlers('/program-menu-tree', () => {
    const response: AdminProgramMenuTreeResponse = getMockAdminProgramMenuTreeResponse();

    return HttpResponse.json(response);
  }),
  ...createAdminGetHandlers('/program-menus/:menuId', ({ params }) => {
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';

    if (!menuId) {
      return HttpResponse.json({ message: 'Program menu not found' }, { status: 404 });
    }

    const response: AdminProgramMenuDetailResponse | null =
      getMockAdminProgramMenuDetailResponse(menuId);

    if (!response) {
      return HttpResponse.json({ message: 'Program menu not found' }, { status: 404 });
    }

    return HttpResponse.json(response);
  }),
  ...createAdminPatchHandlers('/program-menus/:menuId', async ({ params, request }) => {
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';
    const body = await request.json().catch(() => null);

    if (!menuId || !isUpdateAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: UpdateAdminProgramMenuPayload = {
      description: body.description,
      label: body.label,
      slug: body.slug,
      status: body.status,
    };
    const result = updateMockAdminProgramMenuItem(menuId, payload);

    if (!result.ok) {
      const message =
        result.reason === 'duplicate-slug'
          ? 'Program menu slug duplicated'
          : 'Program menu not found';

      return HttpResponse.json({ message }, { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminDeleteHandlers('/program-menus/:menuId', ({ params }) => {
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';

    if (!menuId) {
      return HttpResponse.json({ message: 'Program menu not found' }, { status: 404 });
    }

    const result = deleteMockAdminProgramMenuItem(menuId);

    if (!result.ok) {
      const message =
        result.reason === 'has-child-menus'
          ? 'Program menu has child menus'
          : result.reason === 'has-linked-programs'
            ? 'Program menu has linked programs'
            : 'Program menu not found';

      return HttpResponse.json(
        { message },
        { status: result.reason === 'menu-not-found' ? 404 : 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminPostHandlers('/program-menus/:menuId/move', async ({ params, request }) => {
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';
    const body = await request.json().catch(() => null);

    if (!menuId || !isMoveAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: MoveAdminProgramMenuPayload = {
      parentId: body.parentId ?? null,
    };
    const result = moveMockAdminProgramMenuItem(menuId, payload);

    if (!result.ok) {
      const message =
        result.reason === 'parent-not-found'
          ? 'Program menu parent not found'
          : result.reason === 'parent-has-linked-programs'
            ? 'Program menu parent has linked programs'
            : result.reason === 'top-level-limit-exceeded'
              ? 'Program menu top level limit exceeded'
              : result.reason === 'unsupported-depth'
                ? 'Program menu depth exceeded'
                : result.reason === 'duplicate-slug'
                  ? 'Program menu slug duplicated'
                  : result.reason === 'cannot-move-to-descendant'
                    ? 'Program menu cannot move to descendant'
                    : 'Program menu not found';

      return HttpResponse.json(
        { message },
        { status: result.reason === 'menu-not-found' ? 404 : 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  ...createAdminPostHandlers('/program-menus/:menuId/reorder', async ({ params, request }) => {
    const menuId = typeof params['menuId'] === 'string' ? params['menuId'] : '';
    const body = await request.json().catch(() => null);

    if (!menuId || !isReorderAdminProgramMenuPayload(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payload: ReorderAdminProgramMenuPayload = {
      direction: body.direction,
    };
    const result = reorderMockAdminProgramMenuItem(menuId, payload);

    if (!result.ok) {
      const message =
        result.reason === 'reorder-limit'
          ? 'Program menu reorder limit reached'
          : 'Program menu not found';

      return HttpResponse.json(
        { message },
        { status: result.reason === 'menu-not-found' ? 404 : 400 },
      );
    }

    return HttpResponse.json({ ok: true });
  }),
  http.get('*/api/v1/navigation/site', () => {
    const response: SiteNavigationResponse = getMockSiteNavigation();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/navigation/programs', () => {
    const response: SiteNavigationResponse = getMockSiteNavigation();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/home/hero-slides', () => {
    const response: HomeHeroSlidesResponse = getMockHomeHeroSlides();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/home/history-timeline', () => {
    const response: HomeHistoryTimelineResponse = getMockHomeHistoryTimeline();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/catalog/search-index', () => {
    const response: ProgramSearchIndexResponse = getMockProgramSearchIndex();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/program-pages/overview', () => {
    const response: ProgramsOverviewResponse = getMockProgramsOverview();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/program-pages/page', ({ request }) => {
    const requestUrl = new URL(request.url);
    const path = requestUrl.searchParams.get('path') ?? '/programs';
    const response: ProgramPageResponse | null = getMockProgramPage(path);

    if (!response) {
      return HttpResponse.json({ message: 'Program page not found' }, { status: 404 });
    }

    return HttpResponse.json(response);
  }),
  http.post('*/api/v1/contact', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const title = body['title'];
    if (typeof title === 'string' && title.toLowerCase().includes('error')) {
      return HttpResponse.json({ message: '제목을 입력해주세요.' }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope({ ok: true }));
  }),
];
