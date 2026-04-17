import { z } from 'zod';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ApiEnvelope } from '@/types/auth';
import type {
  ProgramQnaPageResponse,
  ProgramQnaReplyCreatePayload,
  ProgramQnaReplyItem,
  ProgramQnaThreadCreatePayload,
  ProgramQnaThreadItem,
} from '@/types/programQna';

const authorTypeSchema = z.enum(['ADMIN', 'ENROLLED', 'MEMBER']);
const nullableStringSchema = z.union([z.string(), z.null()]).optional();

const normalizeString = (value: string | null | undefined, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeNullableString = (value: string | null | undefined) => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const replyItemSchema = z.object({
  adminReply: z.boolean(),
  authorName: nullableStringSchema,
  authorType: authorTypeSchema,
  content: nullableStringSchema,
  createdAt: nullableStringSchema,
  id: z.number().int().positive(),
  mine: z.boolean(),
  updatedAt: nullableStringSchema,
});

const threadItemSchema = z.object({
  answered: z.boolean(),
  authorName: nullableStringSchema,
  authorType: authorTypeSchema,
  content: nullableStringSchema,
  createdAt: nullableStringSchema,
  id: z.number().int().positive(),
  mine: z.boolean(),
  programId: z.number().int().positive().nullable(),
  programTitle: nullableStringSchema,
  replies: z.array(replyItemSchema),
  replyCount: z.number().int().nonnegative(),
  scope: z.enum(['GLOBAL', 'PROGRAM']),
  title: nullableStringSchema,
  updatedAt: nullableStringSchema,
});

const pageMetaSchema = z.object({
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const threadPageDtoSchema = z.object({
  content: z.array(threadItemSchema),
  page: pageMetaSchema,
});

const threadPageLegacySchema = z.object({
  content: z.array(threadItemSchema),
  first: z.boolean(),
  last: z.boolean(),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const threadPageSchema = z.union([threadPageDtoSchema, threadPageLegacySchema]);

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

const normalizeReply = (reply: z.infer<typeof replyItemSchema>): ProgramQnaReplyItem => {
  return {
    adminReply: reply.adminReply,
    authorName: normalizeString(reply.authorName, '작성자'),
    authorType: reply.authorType,
    content: normalizeString(reply.content),
    createdAt: normalizeString(reply.createdAt),
    id: reply.id,
    mine: reply.mine,
    updatedAt: normalizeString(reply.updatedAt),
  };
};

const normalizeThread = (thread: z.infer<typeof threadItemSchema>): ProgramQnaThreadItem => {
  return {
    answered: thread.answered,
    authorName: normalizeString(thread.authorName, '작성자'),
    authorType: thread.authorType,
    content: normalizeString(thread.content),
    createdAt: normalizeString(thread.createdAt),
    id: thread.id,
    mine: thread.mine,
    programId: thread.programId,
    programTitle: normalizeNullableString(thread.programTitle),
    replies: thread.replies.map(normalizeReply),
    replyCount: thread.replyCount,
    scope: thread.scope,
    title: normalizeString(thread.title, '제목 없음'),
    updatedAt: normalizeString(thread.updatedAt),
  };
};

export const programQnaQueryKey = (programId: number | null) => ['programQna', programId] as const;

export const fetchProgramQna = async (
  programId: number,
  options?: { page?: number; size?: number },
): Promise<ProgramQnaPageResponse> => {
  try {
    const response = await http.get<unknown>(`/api/v1/programs/${String(programId)}/qna`, {
      params: {
        page: options?.page ?? 0,
        size: options?.size ?? 20,
      },
    });
    const parsed = threadPageSchema.parse(response);

    if ('page' in parsed) {
      return {
        content: parsed.content.map(normalizeThread),
        first: parsed.page.number === 0,
        last: parsed.page.totalPages === 0 || parsed.page.number >= parsed.page.totalPages - 1,
        number: parsed.page.number,
        size: parsed.page.size,
        totalElements: parsed.page.totalElements,
        totalPages: parsed.page.totalPages,
      };
    }

    return {
      ...parsed,
      content: parsed.content.map(normalizeThread),
    };
  } catch (error: unknown) {
    throw toApiError(error, 'Q&A를 불러오지 못했습니다.');
  }
};

export const createProgramQnaThread = async (
  programId: number,
  payload: ProgramQnaThreadCreatePayload,
): Promise<ProgramQnaThreadItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<ProgramQnaThreadItem>>(
      `/api/v1/programs/${String(programId)}/qna`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, 'Q&A 등록에 실패했습니다.');
  }
};

export const createProgramQnaReply = async (
  programId: number,
  questionId: number,
  payload: ProgramQnaReplyCreatePayload,
): Promise<ProgramQnaReplyItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<ProgramQnaReplyItem>>(
      `/api/v1/programs/${String(programId)}/qna/${String(questionId)}/replies`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, 'Q&A 답글 등록에 실패했습니다.');
  }
};
