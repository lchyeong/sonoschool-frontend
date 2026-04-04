import type {
  QuestionCreatePayload,
  QuestionItem,
  QuestionReplyCreatePayload,
  QuestionReplyItem,
} from '@/types/qna';

const initialQuestions: QuestionItem[] = [
  {
    id: 1,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    authorName: '김민지',
    title: '회원가입 후 본인인증 문자가 오지 않을 때는 어떻게 하나요?',
    content:
      '회원가입은 완료했는데 본인인증 문자가 바로 도착하지 않았습니다. 재요청 전 확인해야 할 항목이 있을까요?',
    mine: false,
    answered: true,
    createdAt: '2026-03-08T01:00:00Z',
    updatedAt: '2026-03-08T01:00:00Z',
    replies: [
      {
        id: 101,
        authorName: '소노스쿨 운영팀',
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
    title: '결제 영수증은 어디에서 확인하나요?',
    content: '결제 완료 뒤 회사 제출용 영수증이나 결제 내역은 어디에서 확인할 수 있나요?',
    mine: false,
    answered: true,
    createdAt: '2026-03-10T02:30:00Z',
    updatedAt: '2026-03-10T02:30:00Z',
    replies: [
      {
        id: 102,
        authorName: '소노스쿨 운영팀',
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
    title: '오프라인 핸즈온 과정 환불 기준이 궁금합니다.',
    content: '개강 직전 취소와 개강 후 취소 기준이 다른지 확인하고 싶습니다.',
    mine: true,
    answered: false,
    createdAt: '2026-03-13T05:10:00Z',
    updatedAt: '2026-03-13T05:10:00Z',
    replies: [],
  },
];

let questions = initialQuestions.map((question) => ({
  ...question,
  replies: question.replies.map((reply) => ({ ...reply })),
}));

const sortQuestions = (items: QuestionItem[]): QuestionItem[] => {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const getMockGlobalQuestions = (): QuestionItem[] => {
  return sortQuestions(questions);
};

export const getMockAdminQuestions = (): QuestionItem[] => {
  return sortQuestions(questions).sort((left, right) => {
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
    authorName: '현재 사용자',
    title: payload.title,
    content: payload.content,
    mine: true,
    answered: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };

  questions = sortQuestions([nextQuestion, ...questions]);
  return nextQuestion;
};

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
      replies: nextReplies,
      updatedAt: new Date().toISOString(),
    };
  });

  return deleted;
};
