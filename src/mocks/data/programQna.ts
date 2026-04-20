import { getCurrentMockStudentDisplayName } from '@/mocks/data/studentAuth';
import type {
  ProgramQnaPageResponse,
  ProgramQnaReplyCreatePayload,
  ProgramQnaReplyItem,
  ProgramQnaThreadCreatePayload,
  ProgramQnaThreadItem,
} from '@/types/programQna';

const initialThreadsByProgramId = new Map<number, ProgramQnaThreadItem[]>([
  [
    101,
    [
      {
        id: 1,
        scope: 'PROGRAM',
        programId: 101,
        programTitle: '복부 실전 과정',
        authorName: '이수민',
        authorType: 'MEMBER',
        title: '비수강생도 예습 자료를 먼저 볼 수 있나요?',
        content: '수강 전인데 준비물과 예습 범위를 알고 싶습니다.',
        mine: false,
        answered: true,
        replyCount: 1,
        createdAt: '2026-04-02T01:20:00Z',
        updatedAt: '2026-04-02T03:20:00Z',
        replies: [
          {
            id: 101,
            authorName: '소노스쿨 운영팀',
            authorType: 'ADMIN',
            content: '상세 페이지 준비 체크리스트와 커리큘럼 범위까지는 미리 확인하실 수 있습니다.',
            mine: false,
            adminReply: true,
            createdAt: '2026-04-02T03:20:00Z',
            updatedAt: '2026-04-02T03:20:00Z',
          },
        ],
      },
      {
        id: 2,
        scope: 'PROGRAM',
        programId: 101,
        programTitle: '복부 실전 과정',
        authorName: '박지훈',
        authorType: 'ENROLLED',
        title: '2강에서 probe angle 설명이 빠르게 느껴집니다.',
        content: '해당 부분만 다시 보기 좋은 구간이 있으면 알려 주세요.',
        mine: false,
        answered: true,
        replyCount: 2,
        createdAt: '2026-04-03T02:00:00Z',
        updatedAt: '2026-04-03T04:30:00Z',
        replies: [
          {
            id: 102,
            authorName: '김하나',
            authorType: 'ENROLLED',
            content: '저는 12분대부터 다시 보면 이해가 쉬웠습니다.',
            mine: false,
            adminReply: false,
            createdAt: '2026-04-03T03:00:00Z',
            updatedAt: '2026-04-03T03:00:00Z',
          },
          {
            id: 103,
            authorName: '소노스쿨 운영팀',
            authorType: 'ADMIN',
            content:
              '12분 10초 부근에서 주요 각도를 다시 설명하고 있습니다. 복습 자료도 함께 확인해 주세요.',
            mine: false,
            adminReply: true,
            createdAt: '2026-04-03T04:30:00Z',
            updatedAt: '2026-04-03T04:30:00Z',
          },
        ],
      },
    ],
  ],
]);

const getThreadsForProgram = (programId: number) => {
  return initialThreadsByProgramId.get(programId) ?? [];
};

const setThreadsForProgram = (programId: number, nextThreads: ProgramQnaThreadItem[]) => {
  initialThreadsByProgramId.set(programId, nextThreads);
};

export const getMockProgramQna = (programId: number): ProgramQnaPageResponse => {
  const threads = getThreadsForProgram(programId).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return {
    content: threads.map((thread) => ({
      ...thread,
      replies: thread.replies.map((reply) => ({ ...reply })),
    })),
    first: true,
    last: true,
    number: 0,
    size: 20,
    totalElements: threads.length,
    totalPages: threads.length > 0 ? 1 : 0,
  };
};

export const createMockProgramQnaThread = (
  programId: number,
  payload: ProgramQnaThreadCreatePayload,
): ProgramQnaThreadItem => {
  const currentThreads = getThreadsForProgram(programId);
  const now = new Date().toISOString();
  const nextThread: ProgramQnaThreadItem = {
    id: Math.max(...currentThreads.map((thread) => thread.id), 0) + 1,
    scope: 'PROGRAM',
    programId,
    programTitle: currentThreads[0]?.programTitle ?? `프로그램 ${String(programId)}`,
    authorName: getCurrentMockStudentDisplayName(),
    authorType: 'MEMBER',
    title: payload.title,
    content: payload.content,
    mine: true,
    answered: false,
    replyCount: 0,
    createdAt: now,
    updatedAt: now,
    replies: [],
  };

  setThreadsForProgram(programId, [nextThread, ...currentThreads]);
  return nextThread;
};

export const updateMockProgramQnaThread = (
  programId: number,
  questionId: number,
  payload: ProgramQnaThreadCreatePayload,
): ProgramQnaThreadItem | null => {
  const currentThreads = getThreadsForProgram(programId);
  const targetThread = currentThreads.find((thread) => thread.id === questionId);

  if (!targetThread) {
    return null;
  }

  const updatedAt = new Date().toISOString();
  let updatedThread: ProgramQnaThreadItem | null = null;

  setThreadsForProgram(
    programId,
    currentThreads.map((thread) => {
      if (thread.id !== questionId) {
        return thread;
      }

      updatedThread = {
        ...thread,
        title: payload.title,
        content: payload.content,
        updatedAt,
      };

      return updatedThread;
    }),
  );

  return updatedThread;
};

export const deleteMockProgramQnaThread = (programId: number, questionId: number): boolean => {
  const currentThreads = getThreadsForProgram(programId);
  const nextThreads = currentThreads.filter((thread) => thread.id !== questionId);

  if (nextThreads.length === currentThreads.length) {
    return false;
  }

  setThreadsForProgram(programId, nextThreads);
  return true;
};

export const createMockProgramQnaReply = (
  programId: number,
  questionId: number,
  payload: ProgramQnaReplyCreatePayload,
): ProgramQnaReplyItem | null => {
  const currentThreads = getThreadsForProgram(programId);
  const targetThread = currentThreads.find((thread) => thread.id === questionId);

  if (!targetThread) {
    return null;
  }

  const nextReply: ProgramQnaReplyItem = {
    id:
      Math.max(
        ...currentThreads.flatMap((thread) => thread.replies.map((reply) => reply.id)),
        100,
      ) + 1,
    authorName: getCurrentMockStudentDisplayName(),
    authorType: 'MEMBER',
    content: payload.content,
    mine: true,
    adminReply: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setThreadsForProgram(
    programId,
    currentThreads.map((thread) => {
      if (thread.id !== questionId) {
        return thread;
      }

      return {
        ...thread,
        answered: true,
        replyCount: thread.replyCount + 1,
        replies: [...thread.replies, nextReply],
        updatedAt: nextReply.updatedAt,
      };
    }),
  );

  return nextReply;
};
