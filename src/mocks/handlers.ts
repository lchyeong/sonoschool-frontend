import { http, HttpResponse } from 'msw';

import { QNA_REPLY_MAX_LENGTH } from '@/constants/qna';
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
  unpublishMockAdminProgramLive,
  publishMockAdminProgramLive,
  updateMockAdminProgramLive,
} from '@/mocks/data/adminProgramsLive';
import { getMockHomeHeroSlides } from '@/mocks/data/homeHeroSlides';
import { getMockHomeHistoryTimeline } from '@/mocks/data/homeHistoryTimeline';
import {
  addMockMyCartItem,
  getMockMyApplicationSummary,
  getMockMyCart,
  getMockLectureStream,
  getMockMyProfile,
  getMockMyRefunds,
  removeMockMyCartItem,
  sendMockMyPhoneVerification as sendMockMyPagePhoneVerification,
  updateMockMyProfile,
  verifyMockMyPhoneChange as verifyMockMyPagePhoneChange,
} from '@/mocks/data/mypage';
import {
  createMockNotice,
  deleteMockNotice,
  getMockAdminNotices,
  getMockNoticeById,
  getMockPublishedGlobalNotices,
  updateMockNotice,
} from '@/mocks/data/notices';
import {
  cancelMockPayment,
  getMockPaymentHistory,
  getMockPaymentResult,
  getMockPaymentResultByToken,
} from '@/mocks/data/payments';
import {
  createMockPopup,
  deleteMockPopup,
  getMockAdminPopups,
  getMockPublishedGlobalPopups,
  updateMockPopup,
} from '@/mocks/data/popups';
import {
  getMockProgramLectureCatalog,
  getMockProgramPage,
  getMockProgramSearchLectureItems,
  getMockProgramsOverview,
} from '@/mocks/data/programCatalog';
import {
  createMockProgramQnaReply,
  createMockProgramQnaThread,
  deleteMockProgramQnaThread,
  getMockProgramQna,
  updateMockProgramQnaThread,
} from '@/mocks/data/programQna';
import { getMockProgramSearchIndex } from '@/mocks/data/programSearch';
import {
  createMockAdminReply,
  createMockAdminQuestionNotice,
  createMockGlobalQuestion,
  deleteMockAdminReply,
  deleteMockGlobalQuestion,
  getMockAdminQuestions,
  getMockGlobalQuestions,
  updateMockGlobalQuestion,
} from '@/mocks/data/qna';
import { getMockGlobalResourceById, getMockGlobalResources } from '@/mocks/data/resources';
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
import type { ApiEnvelope, StudentSession } from '@/types/auth';
import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';
import type { HomeHistoryTimelineResponse } from '@/types/homeHistoryTimeline';
import type { AddToCartPayload } from '@/types/mypage';
import type { NoticeItem } from '@/types/notice';
import type { KcpPcPrepareResponse } from '@/types/payment';
import type { PopupItem } from '@/types/popup';
import type {
  ProgramLectureCatalogResponse,
  ProgramPageResponse,
  ProgramsOverviewResponse,
} from '@/types/programCatalog';
import type {
  ProgramQnaReplyCreatePayload,
  ProgramQnaThreadCreatePayload,
} from '@/types/programQna';
import type { ProgramSearchIndexResponse } from '@/types/programSearch';
import type { QuestionCreatePayload, QuestionReplyCreatePayload } from '@/types/qna';
import type { ResourceItem } from '@/types/resource';
import type { SiteNavigationResponse } from '@/types/siteNavigation';
import { validateQnaQuestionDraft } from '@/utils/qna';

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

  const hasProblemOnly = page.curriculumTrack.sections.every((section) =>
    section.lessons.every(
      (lesson) => lesson.deliveryType === 'problem' || lesson.deliveryType === 'resource',
    ),
  );
  const hasOfflineLesson = page.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'offline');
  });
  const hasPracticumLesson = page.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'practicum');
  });

  if (hasProblemOnly) {
    return 'PROBLEM_SOLVING';
  }

  if (hasPracticumLesson) {
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

const createApiEnvelope = <T>(data: T): ApiEnvelope<T> => {
  return {
    data,
    timestamp: new Date().toISOString(),
  };
};

const createMockAdminProgramDraftDetail = () => {
  return {
    createdAt: '2026-03-27T09:00:00Z',
    finalProgramId: null,
    id: 91001,
    payload: {
      basicInfo: {
        accessDays: null,
        accessPolicy: 'UNLIMITED',
        categoryId: null,
        checklists: [],
        description: null,
        faqs: [],
        learningEndAt: null,
        learningOutcomes: [],
        learningPoints: [],
        learningStartAt: null,
        level: null,
        maxStudents: null,
        price: null,
        programType: 'ONLINE',
        recommendedFor: [],
        saleEndAt: null,
        salePrice: null,
        saleStartAt: null,
        slug: null,
        summaryItems: [],
        thumbnailUrl: null,
        title: null,
      },
      problems: [],
      resources: [],
      sections: [
        {
          description: null,
          key: 'section-1',
          lectures: [
            {
              description: null,
              durationSeconds: null,
              key: 'lecture-1',
              lectureType: 'VIDEO',
              offlineSchedules: [],
              preview: false,
              published: false,
              sortOrder: 0,
              title: null,
              videoId: null,
              videoUploadErrorMessage: null,
              videoUploadFileName: null,
              videoUploadStatus: null,
            },
          ],
          sortOrder: 0,
          title: null,
        },
      ],
    },
    status: 'ACTIVE',
    titlePreview: null,
    updatedAt: '2026-03-27T09:00:00Z',
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

const createAdminPutHandlers = (path: string, resolver: Parameters<typeof http.put>[1]) => {
  return adminRoutePatterns(path).map((pattern) => http.put(pattern, resolver));
};

const createAdminDeleteHandlers = (path: string, resolver: Parameters<typeof http.delete>[1]) => {
  return adminRoutePatterns(path).map((pattern) => http.delete(pattern, resolver));
};

export const handlers = [
  http.get('*/api/v1/terms/registration', () => {
    return HttpResponse.json(createApiEnvelope(getMockRegistrationTerms()));
  }),
  http.post('*/api/v1/auth/login', async ({ request }) => {
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
  http.post('*/api/v1/auth/login/verify-sms', () => {
    return HttpResponse.json(
      { code: 'AUTH_400_LOGIN_CHALLENGE', message: 'Login verification challenge is invalid.' },
      { status: 400 },
    );
  }),
  http.post('*/api/v1/auth/sms/send', async ({ request }) => {
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
  http.post('*/api/v1/auth/sms/verify', async ({ request }) => {
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
  http.post('*/api/v1/auth/register', async ({ request }) => {
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
  http.post('*/api/v1/auth/refresh', () => {
    const response: StudentSession | null = refreshMockStudentSession();

    if (!response) {
      return HttpResponse.json(
        { code: 'AUTH_401_REFRESH', message: 'Refresh token is invalid.' },
        { status: 401 },
      );
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.post('*/api/v1/auth/logout', () => {
    logoutMockStudent();
    return HttpResponse.json(createApiEnvelope(null));
  }),
  http.get('*/api/v1/users/me', () => {
    return HttpResponse.json(createApiEnvelope(getMockMyProfile()));
  }),
  http.patch('*/api/v1/users/me', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || typeof body['nickname'] !== 'string') {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(
      createApiEnvelope(
        updateMockMyProfile({
          nickname: body['nickname'],
        }),
      ),
    );
  }),
  http.post('*/api/v1/users/me/password/verify', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || typeof body['password'] !== 'string') {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    if (body['password'] !== 'password123') {
      return HttpResponse.json({ message: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    return HttpResponse.json(createApiEnvelope(null));
  }),
  http.post('*/api/v1/users/me/phone/send', async ({ request }) => {
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
  http.post('*/api/v1/users/me/phone/verify', async ({ request }) => {
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
  http.get('*/api/v1/cart/application-summary', () => {
    return HttpResponse.json(createApiEnvelope(getMockMyApplicationSummary()));
  }),
  http.get('*/api/v1/my/program-availability-alerts/status', () => {
    return HttpResponse.json(
      createApiEnvelope({
        subscribedProgramIds: [],
      }),
    );
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
  http.post('*/api/v1/payments/:paymentId/cancel', async ({ params, request }) => {
    const paymentId = Number(params['paymentId']);
    const body = await request.json().catch(() => null);

    if (!Number.isInteger(paymentId) || paymentId <= 0 || !isRecord(body)) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const reason = body['reason'];

    if (typeof reason !== 'string' || !reason.trim()) {
      return HttpResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const payment = cancelMockPayment(paymentId, reason.trim());

    if (!payment) {
      return HttpResponse.json({ message: 'Payment cannot be cancelled' }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(payment));
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
  ...createAdminGetHandlers('/problem-areas', () => {
    return HttpResponse.json(
      createApiEnvelope([
        {
          id: 1,
          name: '단순 계산',
          description: '기본 계산 문항',
          sortOrder: 0,
          active: true,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        },
        {
          id: 2,
          name: '도플러',
          description: '도플러 판독 문항',
          sortOrder: 1,
          active: true,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        },
      ]),
    );
  }),
  ...createAdminPostHandlers('/problem-areas', async ({ request }) => {
    const body = await request.json().catch(() => null);

    return HttpResponse.json(
      createApiEnvelope({
        id: 99,
        name: isRecord(body) && typeof body['name'] === 'string' ? body['name'] : '새 영역',
        description:
          isRecord(body) && typeof body['description'] === 'string' ? body['description'] : null,
        sortOrder: isRecord(body) && typeof body['sortOrder'] === 'number' ? body['sortOrder'] : 0,
        active: true,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      }),
    );
  }),
  ...createAdminPutHandlers('/problem-areas/:areaId', async ({ params, request }) => {
    const areaId = Number(params['areaId']);
    const body = await request.json().catch(() => null);

    return HttpResponse.json(
      createApiEnvelope({
        id: areaId,
        name: isRecord(body) && typeof body['name'] === 'string' ? body['name'] : '수정 영역',
        description:
          isRecord(body) && typeof body['description'] === 'string' ? body['description'] : null,
        sortOrder: isRecord(body) && typeof body['sortOrder'] === 'number' ? body['sortOrder'] : 0,
        active: isRecord(body) && typeof body['active'] === 'boolean' ? body['active'] : true,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      }),
    );
  }),
  ...createAdminDeleteHandlers('/problem-areas/:areaId', () => {
    return HttpResponse.json(createApiEnvelope(null));
  }),
  ...createAdminGetHandlers('/problem-attempts/:attemptId/report', ({ params }) => {
    const attemptId = Number(params['attemptId']);

    return HttpResponse.json(
      createApiEnvelope({
        attemptId,
        problemId: 4001,
        lectureId: 9103,
        applicantName: '김민지',
        examName: '혈액가스 문제',
        submittedAt: '2026-03-04T09:00:00Z',
        totalQuestionCount: 1,
        correctCount: 1,
        wrongCount: 0,
        correctRate: 100,
        passed: true,
        passCorrectCount: 1,
        score: 100,
        areaStats: [
          {
            problemAreaId: 1,
            problemAreaName: '단순 계산',
            totalCount: 1,
            correctCount: 1,
            wrongCount: 0,
          },
        ],
        questionResults: [
          {
            questionId: 5001,
            problemAreaId: 1,
            problemAreaName: '단순 계산',
            questionText: '이 결과에 해당하는 상태는?',
            correct: true,
            submittedOptionIds: [1],
            correctOptionIds: [1],
            explanation: 'HCO3 상승과 pH 상승 조합입니다.',
          },
        ],
      }),
    );
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
  ...createAdminGetHandlers('/programs', () => {
    return HttpResponse.json(
      createApiEnvelope({
        content: getMockAdminProgramsLive(),
      }),
    );
  }),
  ...createAdminGetHandlers('/program-drafts', () => {
    const draftDetail = createMockAdminProgramDraftDetail();
    return HttpResponse.json(
      createApiEnvelope([
        {
          createdAt: draftDetail.createdAt,
          finalProgramId: draftDetail.finalProgramId,
          id: draftDetail.id,
          status: draftDetail.status,
          titlePreview: draftDetail.titlePreview,
          updatedAt: draftDetail.updatedAt,
        },
      ]),
    );
  }),
  ...createAdminPostHandlers('/program-drafts', () => {
    return HttpResponse.json(createApiEnvelope(createMockAdminProgramDraftDetail()), {
      status: 201,
    });
  }),
  ...createAdminGetHandlers('/program-drafts/:draftId', ({ params }) => {
    const draftId = Number(params['draftId']);

    if (!Number.isInteger(draftId) || draftId <= 0) {
      return HttpResponse.json({ message: 'Draft not found' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(createMockAdminProgramDraftDetail()));
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
  ...createAdminPostHandlers('/programs/:programId/unpublish', ({ params }) => {
    const programId = Number(params['programId']);

    if (!Number.isInteger(programId) || programId <= 0) {
      return HttpResponse.json({ message: 'Program not found' }, { status: 404 });
    }

    const updatedProgram = unpublishMockAdminProgramLive(programId);

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
  http.get('*/api/v1/navigation/site', () => {
    const response: SiteNavigationResponse = getMockSiteNavigation();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/navigation/programs', () => {
    const response: SiteNavigationResponse = getMockSiteNavigation();

    return HttpResponse.json(response);
  }),
  http.get('*/api/v1/notices', () => {
    return HttpResponse.json(createApiEnvelope(getMockPublishedGlobalNotices()));
  }),
  http.get('*/api/v1/popups', () => {
    return HttpResponse.json(createApiEnvelope(getMockPublishedGlobalPopups()));
  }),
  http.get('*/api/v1/qna', () => {
    return HttpResponse.json(createApiEnvelope(getMockGlobalQuestions()));
  }),
  http.get('*/api/v1/resources', () => {
    const response: ResourceItem[] = getMockGlobalResources();

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.get('*/api/v1/resources/:resourceId', ({ params }) => {
    const resourceId = Number(params['resourceId']);
    const response: ResourceItem | null = getMockGlobalResourceById(resourceId);

    if (!response) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(response));
  }),
  http.get('*/api/v1/resources/:resourceId/download', ({ params }) => {
    const resourceId = Number(params['resourceId']);
    const resource = getMockGlobalResources().find((item) =>
      item.attachments.some((attachment) => attachment.documentId === resourceId),
    );
    const attachment = resource?.attachments.find((item) => item.documentId === resourceId);

    if (!attachment) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return new HttpResponse(`mock content for ${attachment.fileName}`, {
      headers: {
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
        'Content-Type': attachment.mimeType,
      },
      status: 200,
    });
  }),
  http.post('*/api/v1/qna', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as QuestionCreatePayload | null;

    if (!body || typeof body.title !== 'string' || typeof body.content !== 'string') {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const validationError = validateQnaQuestionDraft(body.title.trim(), body.content.trim());
    if (validationError) {
      return HttpResponse.json({ message: validationError }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(createMockGlobalQuestion(body)), { status: 201 });
  }),
  http.put('*/api/v1/questions/:questionId', async ({ params, request }) => {
    const questionId = Number(params['questionId']);
    const body = (await request.json().catch(() => null)) as QuestionCreatePayload | null;

    if (
      !Number.isInteger(questionId) ||
      questionId <= 0 ||
      !body ||
      typeof body.title !== 'string' ||
      typeof body.content !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const validationError = validateQnaQuestionDraft(body.title.trim(), body.content.trim());
    if (validationError) {
      return HttpResponse.json({ message: validationError }, { status: 400 });
    }

    const question = updateMockGlobalQuestion(questionId, body);

    if (!question) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(question), { status: 200 });
  }),
  http.delete('*/api/v1/questions/:questionId', ({ params }) => {
    const questionId = Number(params['questionId']);

    if (!deleteMockGlobalQuestion(questionId)) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/v1/payments/checkout/kcp/pc/prepare', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      cartItemIds?: number[];
      paymentMethod?: string;
    } | null;

    const response: KcpPcPrepareResponse = {
      buyrMail: 'mock-user@sonoschool.test',
      buyrName: '목 사용자',
      buyrTel2: '01012341234',
      currency: '410',
      goodExpr: '0',
      goodMny: 590000,
      goodName: '복부 실전 과정',
      jsUrl: 'https://mock-kcp.example/script.js',
      orderReference: `mock-checkout-${String(body?.cartItemIds?.[0] ?? '0')}`,
      ordrIdxx: 'mock-order-20260404',
      payMethod: body?.paymentMethod ?? 'CARD',
      paymentId: 501,
      shopUserId: 'mock-user',
      siteCd: 'T0000',
      siteName: 'SONO SCHOOL',
    };

    return HttpResponse.json(createApiEnvelope(response), { status: 200 });
  }),
  http.get('*/api/v1/programs/:programId/qna', ({ params }) => {
    const programId = Number(params['programId']);

    if (!Number.isInteger(programId) || programId <= 0) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(getMockProgramQna(programId)));
  }),
  http.post('*/api/v1/programs/:programId/qna', async ({ params, request }) => {
    const programId = Number(params['programId']);
    const body = (await request.json().catch(() => null)) as ProgramQnaThreadCreatePayload | null;

    if (
      !Number.isInteger(programId) ||
      programId <= 0 ||
      !body ||
      typeof body.title !== 'string' ||
      typeof body.content !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const validationError = validateQnaQuestionDraft(body.title.trim(), body.content.trim());
    if (validationError) {
      return HttpResponse.json({ message: validationError }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(createMockProgramQnaThread(programId, body)), {
      status: 201,
    });
  }),
  http.put('*/api/v1/programs/:programId/qna/:questionId', async ({ params, request }) => {
    const programId = Number(params['programId']);
    const questionId = Number(params['questionId']);
    const body = (await request.json().catch(() => null)) as ProgramQnaThreadCreatePayload | null;

    if (
      !Number.isInteger(programId) ||
      programId <= 0 ||
      !Number.isInteger(questionId) ||
      questionId <= 0 ||
      !body ||
      typeof body.title !== 'string' ||
      typeof body.content !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const validationError = validateQnaQuestionDraft(body.title.trim(), body.content.trim());
    if (validationError) {
      return HttpResponse.json({ message: validationError }, { status: 400 });
    }

    const thread = updateMockProgramQnaThread(programId, questionId, body);

    if (!thread) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(thread), { status: 200 });
  }),
  http.delete('*/api/v1/programs/:programId/qna/:questionId', ({ params }) => {
    const programId = Number(params['programId']);
    const questionId = Number(params['questionId']);

    if (
      !Number.isInteger(programId) ||
      programId <= 0 ||
      !Number.isInteger(questionId) ||
      questionId <= 0
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    if (!deleteMockProgramQnaThread(programId, questionId)) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/v1/programs/:programId/qna/:questionId/replies', async ({ params, request }) => {
    const programId = Number(params['programId']);
    const questionId = Number(params['questionId']);
    const body = (await request.json().catch(() => null)) as ProgramQnaReplyCreatePayload | null;

    if (
      !Number.isInteger(programId) ||
      !Number.isInteger(questionId) ||
      !body ||
      typeof body.content !== 'string' ||
      body.content.trim().length === 0 ||
      body.content.trim().length > QNA_REPLY_MAX_LENGTH
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const reply = createMockProgramQnaReply(programId, questionId, body);

    if (!reply) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(reply), { status: 201 });
  }),
  http.get('*/api/v1/notices/:noticeId', ({ params }) => {
    const noticeId = Number(params['noticeId']);
    const notice = getMockNoticeById(noticeId);

    if (!notice || !notice.published) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(notice));
  }),
  http.get('*/api/v1/admin/notices', () => {
    return HttpResponse.json(createApiEnvelope(getMockAdminNotices()));
  }),
  http.post('*/api/v1/admin/notices', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Partial<NoticeItem> | null;

    if (
      !body ||
      body['scope'] !== 'GLOBAL' ||
      typeof body['title'] !== 'string' ||
      typeof body['content'] !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const notice = createMockNotice({
      content: body['content'],
      pinned: Boolean(body['pinned']),
      programId: null,
      programTitle: null,
      published: Boolean(body['published']),
      scope: 'GLOBAL',
      title: body['title'],
    });

    return HttpResponse.json(createApiEnvelope(notice), { status: 201 });
  }),
  http.put('*/api/v1/admin/notices/:noticeId', async ({ params, request }) => {
    const noticeId = Number(params['noticeId']);
    const body = (await request.json().catch(() => null)) as Partial<NoticeItem> | null;

    if (
      !body ||
      body['scope'] !== 'GLOBAL' ||
      typeof body['title'] !== 'string' ||
      typeof body['content'] !== 'string'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const notice = updateMockNotice(noticeId, {
      content: body['content'],
      pinned: Boolean(body['pinned']),
      scope: 'GLOBAL',
      title: body['title'],
    });

    if (!notice) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(notice));
  }),
  http.post('*/api/v1/admin/notices/:noticeId/publish', ({ params }) => {
    const noticeId = Number(params['noticeId']);
    const notice = updateMockNotice(noticeId, { published: true });

    if (!notice) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(notice));
  }),
  http.post('*/api/v1/admin/notices/:noticeId/unpublish', ({ params }) => {
    const noticeId = Number(params['noticeId']);
    const notice = updateMockNotice(noticeId, { published: false });

    if (!notice) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(notice));
  }),
  http.delete('*/api/v1/admin/notices/:noticeId', ({ params }) => {
    const noticeId = Number(params['noticeId']);
    const deleted = deleteMockNotice(noticeId);

    if (!deleted) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/v1/admin/notice-media/upload-targets', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (
      !body ||
      typeof body['filename'] !== 'string' ||
      typeof body['contentType'] !== 'string' ||
      typeof body['fileSize'] !== 'number'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const assetId = Date.now();
    const safeName = encodeURIComponent(body['filename']);

    return HttpResponse.json(
      createApiEnvelope({
        assetId,
        expiresInSeconds: 900,
        mediaType: 'IMAGE',
        previewUrl: `https://cdn.mock/notices/${String(assetId)}.png`,
        storageUrl: `s3://mock-bucket/assets/notices/images/${String(assetId)}/${safeName}`,
        uploadUrl: `https://upload.mock/notices/${String(assetId)}`,
      }),
      { status: 201 },
    );
  }),
  http.put('https://upload.mock/notices/:assetId', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  http.get('*/api/v1/admin/popups', () => {
    return HttpResponse.json(createApiEnvelope(getMockAdminPopups()));
  }),
  http.post('*/api/v1/admin/popups/upload-targets', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (
      !body ||
      typeof body['filename'] !== 'string' ||
      typeof body['contentType'] !== 'string' ||
      typeof body['fileSize'] !== 'number'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const assetId = Date.now();

    return HttpResponse.json(
      createApiEnvelope({
        assetId,
        expiresInSeconds: 900,
        mediaType: 'IMAGE',
        previewUrl: `https://cdn.mock/popups/${String(assetId)}.png`,
        uploadUrl: `https://upload.mock/popups/${String(assetId)}`,
      }),
    );
  }),
  http.put('https://upload.mock/popups/:assetId', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  http.post('*/api/v1/admin/programs/thumbnail-upload-targets', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (
      !body ||
      typeof body['filename'] !== 'string' ||
      typeof body['contentType'] !== 'string' ||
      typeof body['fileSize'] !== 'number'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const assetId = Date.now();
    const safeName = encodeURIComponent(body['filename']);

    return HttpResponse.json(
      createApiEnvelope({
        assetId,
        expiresInSeconds: 900,
        mediaType: 'IMAGE',
        previewUrl: `https://cdn.mock/programs/${String(assetId)}.png`,
        storageUrl: `s3://mock-bucket/assets/programs/thumbnails/${String(assetId)}/${safeName}`,
        uploadUrl: `https://upload.mock/programs/${String(assetId)}`,
      }),
      { status: 201 },
    );
  }),
  http.post('*/api/v1/admin/resources/upload-targets', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (
      !body ||
      typeof body['filename'] !== 'string' ||
      typeof body['contentType'] !== 'string' ||
      typeof body['fileSize'] !== 'number'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const assetId = Date.now();
    const safeName = encodeURIComponent(body['filename']);

    return HttpResponse.json(
      createApiEnvelope({
        assetId,
        expiresInSeconds: 900,
        fileUrl: `s3://mock-bucket/assets/resources/${String(assetId)}/${safeName}`,
        uploadUrl: `https://upload.mock/resources/${String(assetId)}`,
      }),
      { status: 201 },
    );
  }),
  http.post('*/api/v1/admin/popups', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Partial<PopupItem> | null;

    if (
      !body ||
      typeof body['imageAssetId'] !== 'number' ||
      typeof body['altText'] !== 'string' ||
      typeof body['sortOrder'] !== 'number'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const popup = createMockPopup({
      altText: body['altText'],
      imageAssetId: body['imageAssetId'],
      imageUrl: `https://cdn.mock/popups/${String(body['imageAssetId'])}.png`,
      published: Boolean(body['published']),
      visibleEndAt: typeof body['visibleEndAt'] === 'string' ? body['visibleEndAt'] : null,
      visibleStartAt: typeof body['visibleStartAt'] === 'string' ? body['visibleStartAt'] : null,
      sortOrder: body['sortOrder'],
    });

    return HttpResponse.json(createApiEnvelope(popup), { status: 201 });
  }),
  http.put('*/api/v1/admin/popups/:popupId', async ({ params, request }) => {
    const popupId = Number(params['popupId']);
    const body = (await request.json().catch(() => null)) as Partial<PopupItem> | null;

    if (
      !body ||
      typeof body['imageAssetId'] !== 'number' ||
      typeof body['altText'] !== 'string' ||
      typeof body['sortOrder'] !== 'number'
    ) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const popup = updateMockPopup(popupId, {
      altText: body['altText'],
      imageAssetId: body['imageAssetId'],
      imageUrl: `https://cdn.mock/popups/${String(body['imageAssetId'])}.png`,
      sortOrder: body['sortOrder'],
      visibleEndAt: typeof body['visibleEndAt'] === 'string' ? body['visibleEndAt'] : null,
      visibleStartAt: typeof body['visibleStartAt'] === 'string' ? body['visibleStartAt'] : null,
    });

    if (!popup) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(popup));
  }),
  http.post('*/api/v1/admin/popups/:popupId/publish', ({ params }) => {
    const popupId = Number(params['popupId']);
    const popup = updateMockPopup(popupId, { published: true });

    if (!popup) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(popup));
  }),
  http.post('*/api/v1/admin/popups/:popupId/unpublish', ({ params }) => {
    const popupId = Number(params['popupId']);
    const popup = updateMockPopup(popupId, { published: false });

    if (!popup) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(popup));
  }),
  http.delete('*/api/v1/admin/popups/:popupId', ({ params }) => {
    const popupId = Number(params['popupId']);
    const deleted = deleteMockPopup(popupId);

    if (!deleted) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/v1/admin/qna', ({ request }) => {
    const searchParams = new URL(request.url).searchParams;
    const scope = searchParams.get('scope');
    const programIdParam = searchParams.get('programId');
    const answeredParam = searchParams.get('answered');
    const keyword = searchParams.get('keyword');
    const programId = programIdParam ? Number(programIdParam) : null;

    return HttpResponse.json(
      createApiEnvelope(
        getMockAdminQuestions({
          answered: answeredParam === 'true' ? true : answeredParam === 'false' ? false : null,
          keyword,
          programId: Number.isFinite(programId) ? programId : null,
          scope: scope === 'GLOBAL' || scope === 'PROGRAM' ? scope : 'ALL',
        }),
      ),
    );
  }),
  http.post('*/api/v1/admin/qna/notices', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as QuestionCreatePayload | null;

    if (!body || typeof body.title !== 'string' || typeof body.content !== 'string') {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(createApiEnvelope(createMockAdminQuestionNotice(body)), {
      status: 201,
    });
  }),
  http.post('*/api/v1/admin/qna/:questionId/replies', async ({ params, request }) => {
    const questionId = Number(params['questionId']);
    const body = (await request.json().catch(() => null)) as QuestionReplyCreatePayload | null;

    if (!body || typeof body.content !== 'string') {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    const reply = createMockAdminReply(questionId, body);

    if (!reply) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    return HttpResponse.json(createApiEnvelope(reply), { status: 201 });
  }),
  http.delete('*/api/v1/admin/qna/replies/:replyId', ({ params }) => {
    const replyId = Number(params['replyId']);

    if (!deleteMockAdminReply(replyId)) {
      return HttpResponse.json({ message: 'Reply not found.' }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/v1/admin/users/search', ({ request }) => {
    const keyword = (new URL(request.url).searchParams.get('keyword') ?? '').trim().toLowerCase();

    const users = [
      {
        active: true,
        displayName: '김민지',
        email: 'minji@example.com',
        id: 101,
        loginId: 'minji01',
        name: '김민지',
        nickname: null,
      },
      {
        active: true,
        displayName: '박수현',
        email: 'soohyun@example.com',
        id: 102,
        loginId: 'shpark',
        name: '박수현',
        nickname: '수현',
      },
      {
        active: true,
        displayName: '이도윤',
        email: 'doyoon@example.com',
        id: 103,
        loginId: 'doyoonlee',
        name: '이도윤',
        nickname: null,
      },
    ];

    const filteredUsers =
      keyword.length < 2
        ? []
        : users.filter((user) =>
            [user.displayName, user.email, user.loginId, user.name].some((value) =>
              value.toLowerCase().includes(keyword),
            ),
          );

    return HttpResponse.json(createApiEnvelope(filteredUsers));
  }),
  http.get('*/api/v1/admin/users', ({ request }) => {
    const keyword = (new URL(request.url).searchParams.get('keyword') ?? '').trim().toLowerCase();

    const users = [
      {
        active: true,
        activeEnrollmentCount: 2,
        displayName: '김민지',
        email: 'minji@example.com',
        id: 101,
        joinedAt: '2026-01-10T09:00:00Z',
        loginId: 'minji01',
        name: '김민지',
        nickname: null,
        phoneNumber: '010-1111-2222',
        upcomingPracticumCount: 1,
      },
      {
        active: true,
        activeEnrollmentCount: 1,
        displayName: '박수현',
        email: 'soohyun@example.com',
        id: 102,
        joinedAt: '2026-01-22T09:00:00Z',
        loginId: 'shpark',
        name: '박수현',
        nickname: '수현',
        phoneNumber: '010-2222-3333',
        upcomingPracticumCount: 0,
      },
      {
        active: false,
        activeEnrollmentCount: 0,
        displayName: '이도윤',
        email: 'doyoon@example.com',
        id: 103,
        joinedAt: '2025-12-11T09:00:00Z',
        loginId: 'doyoonlee',
        name: '이도윤',
        nickname: null,
        phoneNumber: '010-3333-4444',
        upcomingPracticumCount: 0,
      },
    ];

    const filteredUsers = keyword
      ? users.filter((user) =>
          [user.displayName, user.email, user.loginId, user.name, user.phoneNumber].some((value) =>
            value.toLowerCase().includes(keyword),
          ),
        )
      : users;

    return HttpResponse.json(createApiEnvelope(filteredUsers));
  }),
  http.get('*/api/v1/admin/users/:userId', ({ params }) => {
    const userId = Number(params['userId']);

    const userDetails = {
      101: {
        active: true,
        activeEnrollmentCount: 2,
        displayName: '김민지',
        email: 'minji@example.com',
        marketingConsent: {
          agreed: true,
          agreedAt: '2026-01-10T09:05:00Z',
          revokedAt: null,
          termVersion: '2026.01',
        },
        enrollments: [
          {
            attemptedProblemLectureCount: 1,
            completedLectureCount: 2,
            completionRate: 66,
            current: true,
            enrolledAt: '2026-03-01T09:00:00Z',
            enrollmentId: 7001,
            enrollmentStatus: 'ACTIVE',
            expireAt: '2026-06-01T09:00:00Z',
            firstLearningAt: '2026-03-02T09:00:00Z',
            lastLearningAt: '2026-03-04T09:00:00Z',
            lectures: [
              {
                completed: true,
                completedAt: '2026-03-02T09:00:00Z',
                durationSeconds: 300,
                lastWatchedAt: '2026-03-02T09:00:00Z',
                lectureId: 9101,
                lectureSortOrder: 1,
                lectureTitle: '오리엔테이션',
                lectureType: 'VIDEO',
                progressRate: 100,
                problem: null,
                sectionId: 501,
                sectionSortOrder: 1,
                sectionTitle: '입문',
                watchedSeconds: 300,
              },
              {
                completed: false,
                completedAt: null,
                durationSeconds: 900,
                lastWatchedAt: '2026-03-03T09:00:00Z',
                lectureId: 9102,
                lectureSortOrder: 2,
                lectureTitle: '복부 스캔 기본기',
                lectureType: 'VIDEO',
                progressRate: 40,
                problem: null,
                sectionId: 501,
                sectionSortOrder: 1,
                sectionTitle: '입문',
                watchedSeconds: 360,
              },
              {
                completed: true,
                completedAt: '2026-03-04T09:00:00Z',
                durationSeconds: null,
                lastWatchedAt: '2026-03-04T09:00:00Z',
                lectureId: 9103,
                lectureSortOrder: 3,
                lectureTitle: '혈액가스 문제 풀이',
                lectureType: 'PROBLEM',
                progressRate: 100,
                problem: {
                  attemptCount: 2,
                  attempted: true,
                  attempts: [
                    {
                      attemptId: 8101,
                      correctAnswerCount: 1,
                      passCorrectCount: 1,
                      passed: true,
                      questionCount: 1,
                      questionResults: [
                        {
                          correct: true,
                          correctOptions: [
                            {
                              optionId: 1,
                              optionText: '대사성 알칼리증',
                            },
                          ],
                          explanation: 'HCO3 상승과 pH 상승 조합입니다.',
                          questionId: 5001,
                          questionText: '이 결과에 해당하는 상태는?',
                          questionType: 'SINGLE',
                          submittedOptions: [
                            {
                              optionId: 1,
                              optionText: '대사성 알칼리증',
                            },
                          ],
                        },
                      ],
                      score: 100,
                      submittedAt: '2026-03-04T09:00:00Z',
                    },
                    {
                      attemptId: 8100,
                      correctAnswerCount: 0,
                      passCorrectCount: 1,
                      passed: false,
                      questionCount: 1,
                      questionResults: [
                        {
                          correct: false,
                          correctOptions: [
                            {
                              optionId: 1,
                              optionText: '대사성 알칼리증',
                            },
                          ],
                          explanation: 'HCO3 상승과 pH 상승 조합입니다.',
                          questionId: 5001,
                          questionText: '이 결과에 해당하는 상태는?',
                          questionType: 'SINGLE',
                          submittedOptions: [
                            {
                              optionId: 2,
                              optionText: '호흡성 산증',
                            },
                          ],
                        },
                      ],
                      score: 0,
                      submittedAt: '2026-03-03T09:00:00Z',
                    },
                  ],
                  bestScore: 100,
                  lastSubmittedAt: '2026-03-04T09:00:00Z',
                  latestCorrectAnswerCount: 1,
                  latestScore: 100,
                  passCorrectCount: 1,
                  questionCount: 1,
                  problemId: 4001,
                  title: '혈액가스 문제',
                },
                sectionId: 502,
                sectionSortOrder: 2,
                sectionTitle: '문제풀이',
                watchedSeconds: 0,
              },
            ],
            payment: {
              amount: 1200000,
              approvedAmount: 1200000,
              cancelledAt: null,
              paidAt: '2026-03-01T09:00:00Z',
              paymentId: 6001,
              paymentMethod: 'CARD',
              paymentStatus: 'COMPLETED',
              programId: 2001,
              programTitle: '복부초음파 기초',
              requestedAt: '2026-03-01T08:55:00Z',
            },
            programId: 2001,
            programTitle: '복부초음파 기초',
            programType: 'HYBRID',
            totalLectureCount: 3,
            totalProblemLectureCount: 1,
          },
        ],
        id: 101,
        joinedAt: '2026-01-10T09:00:00Z',
        loginId: 'minji01',
        name: '김민지',
        nickname: null,
        paymentSummary: {
          cancelledPaymentCount: 1,
          completedPaymentCount: 1,
          lastPaidAt: '2026-03-01T09:00:00Z',
          totalCancelledAmount: 300000,
          totalPaidAmount: 1500000,
        },
        payments: [
          {
            amount: 1200000,
            approvedAmount: 1200000,
            cancelledAt: null,
            paidAt: '2026-03-01T09:00:00Z',
            paymentId: 6001,
            paymentMethod: 'CARD',
            paymentStatus: 'COMPLETED',
            programId: 2001,
            programTitle: '복부초음파 기초',
            requestedAt: '2026-03-01T08:55:00Z',
          },
          {
            amount: 300000,
            approvedAmount: 300000,
            cancelledAt: '2026-02-01T10:00:00Z',
            paidAt: '2026-01-22T10:00:00Z',
            paymentId: 6000,
            paymentMethod: 'CARD',
            paymentStatus: 'CANCELLED',
            programId: 1999,
            programTitle: '경부초음파 입문',
            requestedAt: '2026-01-22T09:55:00Z',
          },
        ],
        phoneNumber: '010-1111-2222',
        phoneVerifiedAt: '2026-01-10T09:00:00Z',
        questions: [
          {
            answered: true,
            content: '복부 스캔 기본기 강의에서 간문맥 구분 기준이 궁금합니다.',
            createdAt: '2026-03-03T10:00:00Z',
            latestReplyAt: '2026-03-03T13:00:00Z',
            programId: 2001,
            programTitle: '복부초음파 기초',
            questionId: 3001,
            replyCount: 1,
            scope: 'PROGRAM',
            title: '간문맥과 담관 구분 기준',
          },
          {
            answered: false,
            content: '현금영수증 발급 여부를 확인하고 싶습니다.',
            createdAt: '2026-03-05T11:00:00Z',
            latestReplyAt: null,
            programId: null,
            programTitle: null,
            questionId: 3002,
            replyCount: 0,
            scope: 'GLOBAL',
            title: '결제 영수증 문의',
          },
        ],
        upcomingPracticumCount: 1,
      },
    } as const;

    if (!(userId in userDetails)) {
      return HttpResponse.json({ message: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const detail = userDetails[userId as keyof typeof userDetails];

    return HttpResponse.json(createApiEnvelope(detail));
  }),
  http.get('*/api/v1/admin/enrollments', ({ request }) => {
    const keyword = (new URL(request.url).searchParams.get('keyword') ?? '').trim().toLowerCase();

    const enrollments = [
      {
        attemptedQuizCount: 1,
        completedLectureCount: 3,
        completionRate: 60,
        enrollmentId: 7001,
        enrolledAt: '2026-03-01T09:00:00Z',
        expireAt: '2026-06-01T09:00:00Z',
        hasPracticumReservation: true,
        loginId: 'minji01',
        phoneNumber: '010-1111-2222',
        programId: 2001,
        programTitle: '복부초음파 기초',
        programType: 'HYBRID',
        status: 'ACTIVE',
        totalLectureCount: 5,
        totalQuizCount: 2,
        userId: 101,
        userName: '김민지',
      },
      {
        attemptedQuizCount: 0,
        completedLectureCount: 1,
        completionRate: 25,
        enrollmentId: 7002,
        enrolledAt: '2026-03-12T09:00:00Z',
        expireAt: '2026-07-12T09:00:00Z',
        hasPracticumReservation: false,
        loginId: 'shpark',
        phoneNumber: '010-2222-3333',
        programId: 2002,
        programTitle: '경부초음파 집중 과정',
        programType: 'ONLINE',
        status: 'ACTIVE',
        totalLectureCount: 4,
        totalQuizCount: 1,
        userId: 102,
        userName: '박수현',
      },
    ];

    const filteredEnrollments = keyword
      ? enrollments.filter((item) =>
          [item.userName, item.loginId, item.programTitle, item.phoneNumber].some((value) =>
            value.toLowerCase().includes(keyword),
          ),
        )
      : enrollments;

    return HttpResponse.json(createApiEnvelope(filteredEnrollments));
  }),
  http.post('*/api/v1/admin/enrollments', ({ request }) => {
    const requestUrl = new URL(request.url);
    const programId = Number(requestUrl.searchParams.get('programId'));
    const userId = Number(requestUrl.searchParams.get('userId'));
    const program = getMockAdminProgramsLive().find((item) => item.id === programId);

    if (!Number.isFinite(programId) || !Number.isFinite(userId) || !program) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(
      createApiEnvelope({
        active: true,
        enrolledAt: '2026-03-27T10:30:00Z',
        expireAt: '2026-06-25T10:30:00Z',
        id: 9000 + userId,
        programId,
        programTitle: program.title,
        status: 'ACTIVE',
      }),
      { status: 201 },
    );
  }),
  http.post('*/api/v1/admin/enrollments/expire', () => {
    return HttpResponse.json(
      createApiEnvelope({
        processedAt: '2026-03-27T11:00:00Z',
        processedCount: 3,
      }),
    );
  }),
  http.get('*/api/v1/admin/practicum/slots', () => {
    return HttpResponse.json(
      createApiEnvelope([
        {
          endAt: '2026-03-29T02:00:00Z',
          full: false,
          lectureId: 9101,
          lectureTitle: '복부 기본 실습',
          location: '서울 강의실 A',
          maxCapacity: 2,
          programId: 2001,
          programTitle: '복부초음파 기초',
          remainingCapacity: 1,
          reservations: [
            {
              enrollmentId: 7001,
              lectureCompleted: true,
              loginId: 'minji01',
              phoneNumber: '010-1111-2222',
              reservationId: 8101,
              reservedAt: '2026-03-28T10:00:00Z',
              status: 'ACTIVE',
              userId: 101,
              userName: '김민지',
            },
          ],
          reservedCount: 1,
          sectionTitle: '1주차',
          slotId: 5001,
          slotStatus: 'OPEN',
          startAt: '2026-03-29T01:00:00Z',
        },
        {
          endAt: '2026-03-31T07:00:00Z',
          full: false,
          lectureId: 9102,
          lectureTitle: '복부 심화 실습',
          location: '서울 강의실 A',
          maxCapacity: 2,
          programId: 2001,
          programTitle: '복부초음파 기초',
          remainingCapacity: 2,
          reservations: [],
          reservedCount: 0,
          sectionTitle: '2주차',
          slotId: 5002,
          slotStatus: 'OPEN',
          startAt: '2026-03-31T06:00:00Z',
        },
      ]),
    );
  }),
  http.get('*/api/v1/admin/practicum/offline-schedules', () => {
    return HttpResponse.json(
      createApiEnvelope([
        {
          activeEnrollmentCount: 12,
          endAt: '2026-03-30T07:00:00Z',
          lectureId: 9301,
          lectureTitle: '오프라인 집중 실습',
          location: '서울 강남 공용 실습실',
          programId: 2101,
          programTitle: 'GI tract 마스터 과정',
          ruleId: 9901,
          sectionTitle: '2주차',
          startAt: '2026-03-30T05:00:00Z',
        },
      ]),
    );
  }),
  http.get('*/api/v1/admin/practicum/offline-schedules/:ruleId', ({ params }) => {
    const ruleId = Number(params['ruleId']);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      return HttpResponse.json({ message: 'Invalid offline schedule id' }, { status: 400 });
    }

    if (ruleId !== 9901) {
      return HttpResponse.json({ message: 'Offline schedule not found' }, { status: 404 });
    }

    return HttpResponse.json(
      createApiEnvelope({
        activeEnrollmentCount: 12,
        attendees: [
          {
            absent: false,
            attendanceStatus: 'UNCHECKED',
            enrollmentId: 7201,
            lectureCompleted: true,
            loginId: 'minji01',
            phoneNumber: '010-1111-2222',
            prerequisiteCompleted: true,
            prerequisiteCompletedCount: 2,
            prerequisiteLastLearningAt: '2026-03-29T04:00:00Z',
            prerequisiteTotalCount: 2,
            userId: 101,
            userName: '김민지',
          },
          {
            absent: false,
            attendanceStatus: 'UNCHECKED',
            enrollmentId: 7202,
            lectureCompleted: false,
            loginId: 'junseo02',
            phoneNumber: '010-3333-4444',
            prerequisiteCompleted: false,
            prerequisiteCompletedCount: 1,
            prerequisiteLastLearningAt: '2026-03-29T02:00:00Z',
            prerequisiteTotalCount: 2,
            userId: 102,
            userName: '박준서',
          },
        ],
        endAt: '2026-03-30T07:00:00Z',
        lectureId: 9301,
        lectureTitle: '오프라인 집중 실습',
        location: '서울 강남 공용 실습실',
        maxStudents: 16,
        notes: '실습복 지참',
        programId: 2101,
        programTitle: 'GI tract 마스터 과정',
        ruleId,
        sectionTitle: '2주차',
        startAt: '2026-03-30T05:00:00Z',
        videoAttached: false,
      }),
    );
  }),
  http.patch(
    '*/api/v1/admin/practicum/offline-schedules/:ruleId/attendees/:enrollmentId/absence',
    () => {
      return new HttpResponse(null, { status: 204 });
    },
  ),
  http.get('*/api/v1/admin/practicum/operating-hours', () => {
    return HttpResponse.json(
      createApiEnvelope([
        {
          id: 1,
          location: '서울 강의실 A',
          openFromHour: 9,
          openToHour: 18,
          weekday: 'MONDAY',
        },
        {
          id: 2,
          location: '서울 강의실 A',
          openFromHour: 9,
          openToHour: 18,
          weekday: 'TUESDAY',
        },
        {
          id: 3,
          location: '서울 강의실 A',
          openFromHour: 9,
          openToHour: 18,
          weekday: 'WEDNESDAY',
        },
        {
          id: 4,
          location: '서울 강의실 A',
          openFromHour: 9,
          openToHour: 18,
          weekday: 'THURSDAY',
        },
        {
          id: 5,
          location: '서울 강의실 A',
          openFromHour: 9,
          openToHour: 18,
          weekday: 'FRIDAY',
        },
      ]),
    );
  }),
  http.put('*/api/v1/admin/practicum/operating-hours/apply', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.put('*/api/v1/admin/practicum/daily-operations', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/v1/admin/practicum/operation-exceptions', () => {
    return HttpResponse.json(
      createApiEnvelope([
        {
          content: '센터 미팅 준비와 운영 점검을 진행합니다.',
          endAt: '2026-03-29T04:00:00Z',
          id: 9101,
          location: null,
          startAt: '2026-03-29T03:00:00Z',
          title: '관리자 개인 일정',
          type: 'ADMIN_SCHEDULE',
        },
      ]),
    );
  }),
  http.post('*/api/v1/admin/practicum/operation-exceptions', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      content?: string | null;
      endAt?: string;
      location?: string | null;
      startAt?: string;
      title?: string;
      type?: string;
    } | null;

    if (!body || !body.startAt || !body.endAt || !body.title || !body.type) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(
      createApiEnvelope({
        content: body.content ?? null,
        endAt: body.endAt,
        id: 9200,
        location: body.location ?? null,
        startAt: body.startAt,
        title: body.title,
        type: body.type,
      }),
      { status: 201 },
    );
  }),
  http.put(
    '*/api/v1/admin/practicum/operation-exceptions/:exceptionId',
    async ({ params, request }) => {
      const exceptionId = Number(params['exceptionId']);
      const body = (await request.json().catch(() => null)) as {
        content?: string | null;
        endAt?: string;
        location?: string | null;
        startAt?: string;
        title?: string;
        type?: string;
      } | null;

      if (
        !Number.isFinite(exceptionId) ||
        !body ||
        !body.startAt ||
        !body.endAt ||
        !body.title ||
        !body.type
      ) {
        return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
      }

      return HttpResponse.json(
        createApiEnvelope({
          content: body.content ?? null,
          endAt: body.endAt,
          id: exceptionId,
          location: body.location ?? null,
          startAt: body.startAt,
          title: body.title,
          type: body.type,
        }),
      );
    },
  ),
  http.delete('*/api/v1/admin/practicum/operation-exceptions/:exceptionId', ({ params }) => {
    const exceptionId = Number(params['exceptionId']);

    if (!Number.isFinite(exceptionId)) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.patch('*/api/v1/admin/practicum-slots/status', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      slotIds?: number[];
      status?: string;
    } | null;

    if (!body || !Array.isArray(body.slotIds) || body.slotIds.length === 0 || !body.status) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.patch('*/api/v1/admin/practicum-slots/:slotId/status', async ({ params, request }) => {
    const slotId = Number(params['slotId']);
    const body = (await request.json().catch(() => null)) as { status?: string } | null;

    if (!Number.isFinite(slotId) || !body?.status) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return HttpResponse.json(
      createApiEnvelope({
        endAt: '2026-03-29T02:00:00Z',
        full: false,
        id: slotId,
        lectureId: 9101,
        location: '서울 강의실 A',
        maxCapacity: 2,
        remainingCapacity: 1,
        reservedByMe: false,
        reservedCount: 1,
        slotStatus: body.status,
        startAt: '2026-03-29T01:00:00Z',
      }),
    );
  }),
  http.delete('*/api/v1/admin/practicum-reservations/:reservationId', ({ params }) => {
    const reservationId = Number(params['reservationId']);

    if (!Number.isFinite(reservationId)) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.patch('*/api/v1/admin/practicum-reservations/:reservationId/no-show', ({ params }) => {
    const reservationId = Number(params['reservationId']);

    if (!Number.isFinite(reservationId)) {
      return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
  http.patch(
    '*/api/v1/admin/practicum-reservations/:reservationId/move',
    async ({ params, request }) => {
      const reservationId = Number(params['reservationId']);
      const body = (await request.json().catch(() => null)) as { slotId?: number } | null;

      if (!Number.isFinite(reservationId) || !body?.slotId) {
        return HttpResponse.json({ message: 'Bad request.' }, { status: 400 });
      }

      return HttpResponse.json(
        createApiEnvelope({
          endAt: '2026-03-31T07:00:00Z',
          id: reservationId,
          lectureId: 9102,
          location: '서울 강의실 A',
          reservedAt: '2026-03-29T01:30:00Z',
          slotId: body.slotId,
          startAt: '2026-03-31T06:00:00Z',
        }),
      );
    },
  ),
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
  http.get('*/api/v1/program-pages/lectures', () => {
    const response: ProgramLectureCatalogResponse = getMockProgramLectureCatalog();

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
