import {
  getMockMyEnrollmentDetail,
  getMockMyEnrollments,
  getMockMyProfile,
  getMockMyRefunds,
  resetMockMyPageData,
  sendMockMyPhoneVerification,
  updateMockMyProfile,
  verifyMockMyPhoneChange,
} from '@/mocks/data/mypage';
import { getMockPaymentHistory } from '@/mocks/data/payments';
import { getMyPageMockScenario, type MyPageMockScenario } from '@/mocks/mypage/runtime';
import type { SmsSendPayload, SmsSendResponse, SmsVerifyPayload } from '@/types/auth';
import type {
  EnrollmentDetail,
  EnrollmentReview,
  EnrollmentReviewPayload,
  EnrollmentSummary,
  MyQuestionItem,
  MyQuestionPage,
  MyQuestionScope,
  RefundHistory,
  UserProfile,
  UserProfileUpdatePayload,
} from '@/types/mypage';
import type { PaymentResult } from '@/types/payment';

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

interface MockReviewState {
  review: EnrollmentReview | null;
  reviewWritable: boolean;
  reviewWritten: boolean;
}

const buildInitialReviewState = (): Record<number, MockReviewState> => {
  return {
    101: {
      review: null,
      reviewWritable: true,
      reviewWritten: false,
    },
    102: {
      review: {
        content: '실습 전에 먼저 보기 좋은 정리형 강의였습니다.',
        createdAt: '2026-03-18T10:00:00Z',
        id: 9101,
        rating: 5,
        updatedAt: '2026-03-18T10:00:00Z',
      },
      reviewWritable: false,
      reviewWritten: true,
    },
    103: {
      review: {
        content: '수강 종료 전에 몰아봤는데 핵심 정리가 잘 되어 있었습니다.',
        createdAt: '2026-02-25T09:30:00Z',
        id: 9102,
        rating: 4,
        updatedAt: '2026-02-25T09:30:00Z',
      },
      reviewWritable: false,
      reviewWritten: true,
    },
    105: {
      review: null,
      reviewWritable: true,
      reviewWritten: false,
    },
  };
};

const buildInitialMyQuestions = (): MyQuestionItem[] => {
  return [
    {
      answered: true,
      authorName: '하은님',
      authorType: 'ENROLLED',
      content:
        '기본 술기 경험은 있지만 응급실 근무 경험은 많지 않은데 이 과정으로 바로 들어가도 괜찮을지 궁금합니다.',
      createdAt: '2026-03-27T13:15:00Z',
      id: 7001,
      mine: true,
      programId: 2002,
      programTitle: '응급 POCUS FAST 집중 과정',
      replies: [
        {
          adminReply: true,
          authorName: '관리자',
          authorType: 'ADMIN',
          content:
            '입문 과정보다는 임상 적용을 전제로 구성되어 있지만, 기본 스캔 경험이 있다면 충분히 따라오실 수 있습니다. 선행 학습이 필요하다면 복부 기본 과정이나 기초 POCUS 과정을 먼저 권장드립니다.',
          createdAt: '2026-03-27T15:10:00Z',
          id: 8001,
          mine: false,
          updatedAt: '2026-03-27T15:10:00Z',
        },
        {
          adminReply: true,
          authorName: '관리자',
          authorType: 'ADMIN',
          content: '강의실의 선행 체크리스트를 먼저 확인하시면 수강 흐름을 잡는 데 도움이 됩니다.',
          createdAt: '2026-03-27T15:20:00Z',
          id: 8002,
          mine: false,
          updatedAt: '2026-03-27T15:20:00Z',
        },
      ],
      replyCount: 2,
      scope: 'PROGRAM',
      title: 'FAST 집중 과정은 응급실 경험이 없어도 따라갈 수 있나요?',
      updatedAt: '2026-03-27T13:15:00Z',
    },
    {
      answered: true,
      authorName: '하은님',
      authorType: 'MEMBER',
      content:
        '회원가입은 완료했는데 본인인증 문자가 바로 도착하지 않았습니다. 재요청 전 확인해야 할 항목이 있을까요?',
      createdAt: '2026-03-08T22:15:00Z',
      id: 7002,
      mine: true,
      programId: null,
      programTitle: null,
      replies: [
        {
          adminReply: true,
          authorName: '관리자',
          authorType: 'ADMIN',
          content:
            '통신사 스팸 차단과 번호 입력 형식을 먼저 확인해 주세요. 계속 도착하지 않으면 운영팀에 문의해 주시면 확인하겠습니다.',
          createdAt: '2026-03-09T09:30:00Z',
          id: 8003,
          mine: false,
          updatedAt: '2026-03-09T09:30:00Z',
        },
      ],
      replyCount: 1,
      scope: 'GLOBAL',
      title: '회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?',
      updatedAt: '2026-03-08T22:15:00Z',
    },
    {
      answered: false,
      authorName: '하은님',
      authorType: 'ENROLLED',
      content:
        '기본 술기 경험은 있지만 응급실 근무 경험은 많지 않은데 이 과정으로 바로 들어가도 괜찮을지 궁금합니다.',
      createdAt: '2026-03-27T13:15:00Z',
      id: 7003,
      mine: true,
      programId: 2002,
      programTitle: '응급 POCUS FAST 집중 과정',
      replies: [],
      replyCount: 0,
      scope: 'PROGRAM',
      title: 'FAST 집중 과정은 응급실 경험이 없어도 따라갈 수 있나요?',
      updatedAt: '2026-03-07T13:15:00Z',
    },
  ];
};

let activeScenario: MyPageMockScenario | null = null;
let mockReviewStateByEnrollmentId: Partial<Record<number, MockReviewState>> =
  buildInitialReviewState();
let mockMyQuestions = buildInitialMyQuestions();
let nextReviewId = 9_500;
let nextQuestionId = 8_000;

const resetScenarioState = (scenario: MyPageMockScenario) => {
  resetMockMyPageData();
  activeScenario = scenario;
  mockReviewStateByEnrollmentId = buildInitialReviewState();
  mockMyQuestions = buildInitialMyQuestions();
  nextReviewId = 9_500;
  nextQuestionId = 8_000;
};

const ensureMockScenarioState = (): MyPageMockScenario => {
  const scenario = getMyPageMockScenario();

  if (activeScenario !== scenario) {
    resetScenarioState(scenario);
  }

  return scenario;
};

const applyReviewSummaryState = (enrollment: EnrollmentSummary): EnrollmentSummary => {
  const reviewState = mockReviewStateByEnrollmentId[enrollment.id];

  if (!reviewState) {
    return enrollment;
  }

  return {
    ...enrollment,
    reviewWritable: reviewState.reviewWritable,
    reviewWritten: reviewState.reviewWritten,
  };
};

const applyReviewDetailState = (detail: EnrollmentDetail): EnrollmentDetail => {
  const reviewState = mockReviewStateByEnrollmentId[detail.id];

  if (!reviewState) {
    return {
      ...detail,
      review: null,
      reviewWritable: false,
      reviewWritten: false,
    };
  }

  return {
    ...detail,
    review: cloneData(reviewState.review),
    reviewWritable: reviewState.reviewWritable,
    reviewWritten: reviewState.reviewWritten,
  };
};

const getScenarioEnrollments = (scenario: MyPageMockScenario): EnrollmentSummary[] => {
  const enrollments = getMockMyEnrollments().map(applyReviewSummaryState);

  switch (scenario) {
    case 'certificate':
      return enrollments.filter((enrollment) => enrollment.certificateEligible);
    case 'expired':
      return enrollments.filter(
        (enrollment) => !enrollment.active && enrollment.status === 'EXPIRED',
      );
    case 'empty':
      return [];
    case 'all':
    default:
      return enrollments;
  }
};

const getVisibleEnrollmentIdSet = (scenario: MyPageMockScenario): Set<number> => {
  return new Set(getScenarioEnrollments(scenario).map((enrollment) => enrollment.id));
};

const filterQuestions = (
  questions: MyQuestionItem[],
  options?: {
    answered?: boolean | undefined;
    keyword?: string | undefined;
    page?: number;
    scope?: MyQuestionScope | 'ALL';
    size?: number;
  },
): MyQuestionPage => {
  const normalizedKeyword = options?.keyword?.trim().toLowerCase() ?? '';
  const scope = options?.scope ?? 'ALL';
  const page = Math.max(0, options?.page ?? 0);
  const size = Math.max(1, options?.size ?? 10);

  const filtered = questions
    .filter((question) => {
      if (scope !== 'ALL' && question.scope !== scope) {
        return false;
      }

      if (typeof options?.answered === 'boolean' && question.answered !== options.answered) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      return [
        question.title,
        question.content,
        question.authorName,
        question.programTitle ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedKeyword));
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const totalElements = filtered.length;
  const totalPages = totalElements === 0 ? 1 : Math.ceil(totalElements / size);
  const startIndex = page * size;
  const content = filtered.slice(startIndex, startIndex + size);

  return {
    content: cloneData(content),
    first: page <= 0,
    last: page >= totalPages - 1,
    number: page,
    size,
    totalElements,
    totalPages,
  };
};

const resolveEnrollmentIdByProgramId = (programId: number): number | null => {
  const enrollment = getMockMyEnrollments().find((item) => item.programId === programId);
  return enrollment?.id ?? null;
};

const getReviewStateByReviewId = (reviewId: number): [number, MockReviewState] | null => {
  const targetEntry = Object.entries(mockReviewStateByEnrollmentId).find(
    ([, reviewState]) => reviewState?.review?.id === reviewId,
  );

  if (!targetEntry || !targetEntry[1]) {
    return null;
  }

  return [Number(targetEntry[0]), targetEntry[1]];
};

export const getMockedMyPageProfile = (): UserProfile => {
  ensureMockScenarioState();
  return getMockMyProfile();
};

export const updateMockedMyPageProfile = (payload: UserProfileUpdatePayload): UserProfile => {
  ensureMockScenarioState();
  return updateMockMyProfile(payload);
};

export const verifyMockedMyPagePassword = (password: string): boolean => {
  ensureMockScenarioState();
  return password === 'password123';
};

export const sendMockedMyPagePhoneVerification = (
  payload: SmsSendPayload,
): SmsSendResponse | null => {
  ensureMockScenarioState();
  return sendMockMyPhoneVerification(payload);
};

export const verifyMockedMyPagePhoneChange = (payload: SmsVerifyPayload): UserProfile | null => {
  ensureMockScenarioState();
  return verifyMockMyPhoneChange(payload);
};

export const getMockedMyEnrollments = (): EnrollmentSummary[] => {
  const scenario = ensureMockScenarioState();
  return cloneData(getScenarioEnrollments(scenario));
};

export const getMockedMyEnrollmentDetail = (enrollmentId: number): EnrollmentDetail | null => {
  const scenario = ensureMockScenarioState();

  if (!getVisibleEnrollmentIdSet(scenario).has(enrollmentId)) {
    return null;
  }

  const detail = getMockMyEnrollmentDetail(enrollmentId);
  return detail ? applyReviewDetailState(detail) : null;
};

export const createMockedMyEnrollmentReview = (
  programId: number,
  payload: EnrollmentReviewPayload,
): void => {
  ensureMockScenarioState();

  const enrollmentId = resolveEnrollmentIdByProgramId(programId);

  if (enrollmentId === null) {
    throw new Error('후기 대상 강의를 찾지 못했습니다.');
  }

  const currentState = mockReviewStateByEnrollmentId[enrollmentId] ?? {
    review: null,
    reviewWritable: true,
    reviewWritten: false,
  };
  const now = new Date().toISOString();

  mockReviewStateByEnrollmentId[enrollmentId] = {
    review: {
      content: payload.content,
      createdAt: currentState.review?.createdAt ?? now,
      id: currentState.review?.id ?? nextReviewId++,
      rating: payload.rating,
      updatedAt: now,
    },
    reviewWritable: false,
    reviewWritten: true,
  };
};

export const updateMockedMyEnrollmentReview = (
  reviewId: number,
  payload: EnrollmentReviewPayload,
): void => {
  ensureMockScenarioState();

  const targetEntry = getReviewStateByReviewId(reviewId);

  if (!targetEntry) {
    throw new Error('수정할 후기를 찾지 못했습니다.');
  }

  const [enrollmentId, reviewState] = targetEntry;

  mockReviewStateByEnrollmentId[enrollmentId] = {
    review: {
      content: payload.content,
      createdAt: reviewState.review?.createdAt ?? new Date().toISOString(),
      id: reviewId,
      rating: payload.rating,
      updatedAt: new Date().toISOString(),
    },
    reviewWritable: false,
    reviewWritten: true,
  };
};

export const getMockedMyQuestions = (options?: {
  answered?: boolean | undefined;
  keyword?: string | undefined;
  page?: number;
  scope?: MyQuestionScope | 'ALL';
  size?: number;
}): MyQuestionPage => {
  ensureMockScenarioState();
  return filterQuestions(mockMyQuestions, options);
};

export const createMockedMyGlobalQuestion = (payload: {
  content: string;
  title: string;
}): MyQuestionItem => {
  ensureMockScenarioState();

  const now = new Date().toISOString();
  const nextQuestion: MyQuestionItem = {
    answered: false,
    authorName: getMockMyProfile().displayName,
    authorType: 'MEMBER',
    content: payload.content,
    createdAt: now,
    id: nextQuestionId++,
    mine: true,
    programId: null,
    programTitle: null,
    replies: [],
    replyCount: 0,
    scope: 'GLOBAL',
    title: payload.title,
    updatedAt: now,
  };

  mockMyQuestions = [nextQuestion, ...mockMyQuestions];
  return cloneData(nextQuestion);
};

export const updateMockedMyQuestion = (
  question: Pick<MyQuestionItem, 'id' | 'programId' | 'scope'>,
  payload: {
    content: string;
    title: string;
  },
): MyQuestionItem => {
  ensureMockScenarioState();

  const targetQuestion = mockMyQuestions.find((item) => item.id === question.id);

  if (!targetQuestion) {
    throw new Error('수정할 질문을 찾지 못했습니다.');
  }

  const updatedQuestion: MyQuestionItem = {
    ...targetQuestion,
    content: payload.content,
    title: payload.title,
    updatedAt: new Date().toISOString(),
  };

  mockMyQuestions = mockMyQuestions.map((item) =>
    item.id === question.id ? updatedQuestion : item,
  );

  return cloneData(updatedQuestion);
};

export const deleteMockedMyQuestion = (
  question: Pick<MyQuestionItem, 'id' | 'programId' | 'scope'>,
): void => {
  ensureMockScenarioState();
  mockMyQuestions = mockMyQuestions.filter((item) => item.id !== question.id);
};

export const getMockedMyPaymentHistory = (): PaymentResult[] => {
  ensureMockScenarioState();
  return getMockPaymentHistory();
};

export const getMockedMyRefunds = (): RefundHistory[] => {
  ensureMockScenarioState();
  return getMockMyRefunds();
};
