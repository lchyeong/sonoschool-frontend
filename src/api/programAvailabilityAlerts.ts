import { z } from 'zod';

import { toApiResponseValidationError } from '@/api/errors';
import { http } from '@/api/http';

export interface ProgramAvailabilityAlertStatusResponse {
  subscribedProgramIds: number[];
}

export interface ProgramAvailabilityAlertResponse {
  programId: number;
  subscribed: boolean;
  status: string;
  requestedAt?: string | null | undefined;
  notifiedAt?: string | null | undefined;
}

export interface ProgramAvailabilityAlertSubscribePayload {
  applicantName?: string | undefined;
  phoneNumber?: string | undefined;
  programId: number;
  specialty?: string | undefined;
}

const programAvailabilityAlertStatusResponseSchema = z.object({
  subscribedProgramIds: z.array(z.number().int().positive()),
});

const programAvailabilityAlertResponseSchema = z.object({
  notifiedAt: z.string().min(1).nullable().optional(),
  programId: z.number().int().positive(),
  requestedAt: z.string().min(1).nullable().optional(),
  status: z.string().min(1),
  subscribed: z.boolean(),
});

export const fetchMyProgramAvailabilityAlertStatus = async (
  programIds: readonly number[],
): Promise<ProgramAvailabilityAlertStatusResponse> => {
  if (!programIds.length) {
    return {
      subscribedProgramIds: [],
    };
  }

  const responseData = await http.get<unknown>('/api/v1/my/program-availability-alerts/status', {
    params: {
      programIds,
    },
  });

  const parsed = programAvailabilityAlertStatusResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programAvailabilityAlerts.status',
      userMessage: '알림 신청 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};

export const subscribeMyProgramAvailabilityAlert = async (
  payload: number | ProgramAvailabilityAlertSubscribePayload,
): Promise<ProgramAvailabilityAlertResponse> => {
  const programId = typeof payload === 'number' ? payload : payload.programId;
  const responseData = await http.post<unknown>('/api/v1/my/program-availability-alerts', {
    programId,
  });

  const parsed = programAvailabilityAlertResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programAvailabilityAlerts.subscribe',
      userMessage: '알림 신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};
