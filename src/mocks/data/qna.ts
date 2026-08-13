import { getCurrentMockStudentDisplayName } from '@/mocks/data/studentAuth';
import type {
  QuestionCreatePayload,
  QuestionItem,
  QuestionReplyCreatePayload,
  QuestionReplyItem,
} from '@/types/qna';

const createReplyCount = (replies: QuestionReplyItem[]) => replies.length;

const initialQuestions: QuestionItem[] = [
  {
    id: 1,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    authorName: '김민지',
    authorType: 'MEMBER',
    title: '회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?',
    content:
      '회원가입은 완료했는데 본인인증 문자가 바로 도착하지 않았습니다. 재요청 전 확인해야 할 항목이 있을까요?',
    mine: false,
    notice: false,
    privateQuestion: false,
    answered: true,
    replyCount: 1,
    createdAt: '2026-03-08T01:00:00Z',
    updatedAt: '2026-03-08T01:00:00Z',
    replies: [
      {
        id: 101,
        authorName: '소노스쿨 운영팀',
        authorType: 'ADMIN',
        content:
          '통신사 스팸 차단과 번호 입력 형식을 먼저 확인해 주세요. 문제가 계속되면 운영 Q&A나 고객문의로 남겨 주시면 수동 확인해 드립니다.',
        mine: false,
        adminReply: true,
        createdAt: '2026-03-08T02:10:00Z',
        updatedAt: '2026-03-08T02:10:00Z',
      },
    ],
  },
  {
    id: 2,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    authorName: '박수현',
    authorType: 'MEMBER',
    title: '결제 영수증은 어디에서 확인하나요?',
    content: '결제 완료 뒤 회사 제출용 영수증이나 결제 내역은 어디에서 확인할 수 있나요?',
    mine: false,
    notice: false,
    privateQuestion: false,
    answered: true,
    replyCount: 1,
    createdAt: '2026-03-10T02:30:00Z',
    updatedAt: '2026-03-10T02:30:00Z',
    replies: [
      {
        id: 102,
        authorName: '소노스쿨 운영팀',
        authorType: 'ADMIN',
        content:
          '결제 완료 후 마이페이지 결제 내역에서 확인할 수 있습니다. 영수증 버튼과 상세 내역도 함께 제공됩니다.',
        mine: false,
        adminReply: true,
        createdAt: '2026-03-10T03:20:00Z',
        updatedAt: '2026-03-10T03:20:00Z',
      },
    ],
  },
  {
    id: 3,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    authorName: '이도윤',
    authorType: 'MEMBER',
    title: '오프라인 핸즈온 과정 환불 기준이 궁금합니다.',
    content: '개강 직전 취소와 개강 후 취소 기준이 다른지 확인하고 싶습니다.',
    mine: true,
    notice: false,
    privateQuestion: false,
    answered: false,
    replyCount: 0,
    createdAt: '2026-03-13T05:10:00Z',
    updatedAt: '2026-03-13T05:10:00Z',
    replies: [],
  },
  {
    id: 4,
    scope: 'PROGRAM',
    programId: 2001,
    programTitle: '복부초음파 기초',
    authorName: '장서연',
    authorType: 'ENROLLED',
    title: '복부초음파 기초는 수강 순서를 어떻게 잡는 게 좋나요?',
    content:
      '입문 섹션을 본 뒤 바로 문제풀이로 가도 되는지, 아니면 복습 자료를 먼저 보는 게 좋은지 궁금합니다.',
    mine: false,
    notice: false,
    privateQuestion: false,
    answered: true,
    replyCount: 1,
    createdAt: '2026-03-15T09:30:00Z',
    updatedAt: '2026-03-15T10:10:00Z',
    replies: [
      {
        id: 103,
        authorName: '소노스쿨 운영팀',
        authorType: 'ADMIN',
        content: '입문 섹션 완강 후 복습 자료를 보고 문제풀이로 넘어가시는 순서를 권장합니다.',
        mine: false,
        adminReply: true,
        createdAt: '2026-03-15T10:10:00Z',
        updatedAt: '2026-03-15T10:10:00Z',
      },
    ],
  },
];

const cloneInitialQuestions = (): QuestionItem[] =>
  initialQuestions.map((question) => ({
    ...question,
    replies: question.replies.map((reply) => ({ ...reply })),
  }));

let questions = cloneInitialQuestions();

export const resetMockQnaData = () => {
  questions = cloneInitialQuestions();
};

const sortQuestions = (items: QuestionItem[]): QuestionItem[] => {
  return [...items].sort((left, right) => {
    if (left.notice !== right.notice) {
      return left.notice ? -1 : 1;
    }

    if (left.notice && right.notice) {
      return (left.noticeSortOrder ?? 0) - (right.noticeSortOrder ?? 0);
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
};

export const getMockGlobalQuestions = (): QuestionItem[] => {
  return sortQuestions(questions.filter((question) => question.scope === 'GLOBAL'));
};

export const getMockAdminQuestions = (filters?: {
  answered?: boolean | null;
  keyword?: string | null;
  programId?: number | null;
  scope?: 'ALL' | QuestionItem['scope'];
}): QuestionItem[] => {
  const normalizedKeyword = filters?.keyword?.trim().toLowerCase() ?? '';

  return sortQuestions(
    questions.filter((question) => {
      if (filters?.scope && filters.scope !== 'ALL' && question.scope !== filters.scope) {
        return false;
      }

      if (typeof filters?.answered === 'boolean' && question.answered !== filters.answered) {
        return false;
      }

      if (
        filters?.programId !== null &&
        filters?.programId !== undefined &&
        question.programId !== filters.programId
      ) {
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
    }),
  ).sort((left, right) => {
    if (left.notice !== right.notice) {
      return left.notice ? -1 : 1;
    }

    if (left.notice && right.notice) {
      return (left.noticeSortOrder ?? 0) - (right.noticeSortOrder ?? 0);
    }

    if (left.answered !== right.answered) {
      return left.answered ? 1 : -1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
};

export const createMockGlobalQuestion = (payload: QuestionCreatePayload): QuestionItem => {
  const nextQuestion: QuestionItem = {
    id: Math.max(...questions.map((question) => question.id), 0) + 1,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    authorName: getCurrentMockStudentDisplayName(),
    authorType: 'MEMBER',
    title: payload.title,
    content: payload.content,
    mine: true,
    notice: false,
    noticeSortOrder: 0,
    privateQuestion: payload.privateQuestion ?? false,
    answered: false,
    replyCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };

  questions = sortQuestions([nextQuestion, ...questions]);
  return nextQuestion;
};

export const createMockAdminQuestionNotice = (payload: QuestionCreatePayload): QuestionItem => {
  const nextQuestion: QuestionItem = {
    id: Math.max(...questions.map((question) => question.id), 0) + 1,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    authorName: '소노스쿨 운영팀',
    authorType: 'ADMIN',
    title: payload.title,
    content: payload.content,
    mine: true,
    notice: true,
    noticeSortOrder:
      Math.max(
        ...questions
          .filter((question) => question.notice)
          .map((question) => question.noticeSortOrder ?? 0),
        -1,
      ) + 1,
    privateQuestion: false,
    answered: false,
    replyCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };

  questions = sortQuestions([nextQuestion, ...questions]);
  return nextQuestion;
};

export const reorderMockAdminQuestionNotices = (
  items: Array<{ id: number; sortOrder: number }>,
): boolean => {
  const noticeMap = new Map(
    questions.filter((question) => question.notice).map((question) => [question.id, question]),
  );

  if (items.some((item) => !noticeMap.has(item.id))) {
    return false;
  }

  questions = sortQuestions(
    questions.map((question) => {
      const item = items.find((candidate) => candidate.id === question.id);
      return item ? { ...question, noticeSortOrder: Math.max(0, item.sortOrder) } : question;
    }),
  );

  return true;
};

export const updateMockGlobalQuestion = (
  questionId: number,
  payload: QuestionCreatePayload,
): QuestionItem | null => {
  const targetQuestion = questions.find((question) => question.id === questionId);

  if (!targetQuestion) {
    return null;
  }

  const updatedAt = new Date().toISOString();
  let updatedQuestion: QuestionItem | null = null;

  questions = sortQuestions(
    questions.map((question) => {
      if (question.id !== questionId) {
        return question;
      }

      updatedQuestion = {
        ...question,
        title: payload.title,
        content: payload.content,
        privateQuestion: payload.privateQuestion ?? question.privateQuestion,
        updatedAt,
      };

      return updatedQuestion;
    }),
  );

  return updatedQuestion;
};

export const deleteMockGlobalQuestion = (questionId: number): boolean => {
  const nextQuestions = questions.filter((question) => question.id !== questionId);

  if (nextQuestions.length === questions.length) {
    return false;
  }

  questions = sortQuestions(nextQuestions);
  return true;
};

export const updateMockAdminQuestion = updateMockGlobalQuestion;

export const deleteMockAdminQuestion = deleteMockGlobalQuestion;

export const createMockAdminReply = (
  questionId: number,
  payload: QuestionReplyCreatePayload,
): QuestionReplyItem | null => {
  const targetQuestion = questions.find((question) => question.id === questionId);

  if (!targetQuestion) {
    return null;
  }

  const nextReply: QuestionReplyItem = {
    id:
      Math.max(...questions.flatMap((question) => question.replies.map((reply) => reply.id)), 100) +
      1,
    authorName: '소노스쿨 운영팀',
    authorType: 'ADMIN',
    content: payload.content,
    mine: true,
    adminReply: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  questions = questions.map((question) => {
    if (question.id !== questionId) {
      return question;
    }

    return {
      ...question,
      answered: true,
      replyCount: createReplyCount([...question.replies, nextReply]),
      replies: [...question.replies, nextReply],
      updatedAt: nextReply.updatedAt,
    };
  });

  return nextReply;
};

export const deleteMockAdminReply = (replyId: number): boolean => {
  let deleted = false;

  questions = questions.map((question) => {
    const nextReplies = question.replies.filter((reply) => {
      if (reply.id !== replyId) {
        return true;
      }

      deleted = true;
      return false;
    });

    if (nextReplies.length === question.replies.length) {
      return question;
    }

    return {
      ...question,
      answered: nextReplies.length > 0,
      replyCount: createReplyCount(nextReplies),
      replies: nextReplies,
      updatedAt: new Date().toISOString(),
    };
  });

  return deleted;
};

export const updateMockAdminReply = (
  replyId: number,
  payload: QuestionReplyCreatePayload,
): QuestionReplyItem | null => {
  const updatedAt = new Date().toISOString();
  let updatedReply: QuestionReplyItem | null = null;

  questions = questions.map((question) => {
    const targetReply = question.replies.find((reply) => reply.id === replyId);

    if (!targetReply) {
      return question;
    }

    const nextReply: QuestionReplyItem = {
      ...targetReply,
      content: payload.content,
      updatedAt,
    };
    updatedReply = nextReply;

    return {
      ...question,
      replies: question.replies.map((reply) => (reply.id === replyId ? nextReply : reply)),
      updatedAt,
    };
  });

  return updatedReply;
};
