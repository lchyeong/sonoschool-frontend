import { z } from 'zod';

import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { http } from '@/api/http';
import type { ApiEnvelope } from '@/types/auth';
import type {
  ProgramCommunityPageResponse,
  ProgramCommunityReplyCreatePayload,
  ProgramCommunityReplyItem,
  ProgramCommunityThreadCreatePayload,
  ProgramCommunityThreadItem,
} from '@/types/programCommunity';

const authorTypeSchema = z.enum(['ADMIN', 'ENROLLED', 'MEMBER']);
const lectureTypeSchema = z.enum(['VIDEO', 'OFFLINE', 'PRACTICUM', 'PROBLEM', 'RESOURCE']);

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
  lectureId: z.number().int().positive().nullable(),
  lectureTitle: z.string().min(1).nullable(),
  lectureType: lectureTypeSchema.nullable(),
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

export const programCommunityQueryKey = (
  programId: number | null,
  lectureId: number | null,
  filterScope: 'program' | 'lecture',
) => ['programCommunity', programId, lectureId, filterScope] as const;

export const fetchProgramCommunity = async (
  programId: number,
  options?: {
    lectureId?: number | null;
    page?: number;
    size?: number;
  },
): Promise<ProgramCommunityPageResponse> => {
  try {
    const response = await http.get<unknown>(`/api/v1/programs/${String(programId)}/community`, {
      params: {
        lectureId: options?.lectureId ?? undefined,
        page: options?.page ?? 0,
        size: options?.size ?? 20,
      },
    });
    return threadPageSchema.parse(response);
  } catch (error: unknown) {
    throw toApiError(error, '커뮤니티 글을 불러오지 못했습니다.');
  }
};

export const createProgramCommunityThread = async (
  programId: number,
  payload: ProgramCommunityThreadCreatePayload,
): Promise<ProgramCommunityThreadItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<ProgramCommunityThreadItem>>(
      `/api/v1/programs/${String(programId)}/community`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '커뮤니티 글 등록에 실패했습니다.');
  }
};

export const createProgramCommunityReply = async (
  programId: number,
  questionId: number,
  payload: ProgramCommunityReplyCreatePayload,
): Promise<ProgramCommunityReplyItem> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<ProgramCommunityReplyItem>>(
      `/api/v1/programs/${String(programId)}/community/${String(questionId)}/replies`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '커뮤니티 답글 등록에 실패했습니다.');
  }
};
