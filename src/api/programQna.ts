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

const replyItemSchema = z.object({
  adminReply: z.boolean(),
  authorName: z.string().min(1),
  authorType: authorTypeSchema,
  content: z.string().min(1),
  createdAt: z.string().min(1),
  id: z.number().int().positive(),
  mine: z.boolean(),
  updatedAt: z.string().min(1),
});

const threadItemSchema = z.object({
  answered: z.boolean(),
  authorName: z.string().min(1),
  authorType: authorTypeSchema,
  content: z.string().min(1),
  createdAt: z.string().min(1),
  id: z.number().int().positive(),
  mine: z.boolean(),
  programId: z.number().int().positive().nullable(),
  programTitle: z.string().min(1).nullable(),
  replies: z.array(replyItemSchema),
  replyCount: z.number().int().nonnegative(),
  scope: z.enum(['GLOBAL', 'PROGRAM']),
  title: z.string().min(1),
  updatedAt: z.string().min(1),
});

const threadPageSchema = z.object({
  content: z.array(threadItemSchema),
  first: z.boolean(),
  last: z.boolean(),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
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
    return threadPageSchema.parse(response);
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
