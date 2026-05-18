import { z } from 'zod';

import { toApiResponseValidationError } from '@/api/errors';
import { http } from '@/api/http';

export type ProgramReservationInquiryStatus = 'NEW' | 'CONTACTED' | 'CLOSED';

export interface ProgramReservationInquiryPayload {
  applicantName: string;
  content?: string;
  phoneNumber: string;
  programId: number | null;
  programTitle: string;
  sourcePath: string;
  specialty?: string | undefined;
}

export interface ProgramReservationInquiryResponse {
  id: number;
  status: ProgramReservationInquiryStatus;
  submittedAt: string;
}

export interface AdminProgramReservationInquiry {
  applicantName: string;
  id: number;
  phoneNumber: string;
  programId: number | null;
  programTitle: string;
  sourcePath: string;
  specialty?: string | null | undefined;
  status: ProgramReservationInquiryStatus;
  submittedAt: string;
}

const programReservationInquiryStatusSchema = z.enum(['NEW', 'CONTACTED', 'CLOSED']);

const programReservationInquiryResponseSchema = z.object({
  id: z.number().int().positive(),
  status: programReservationInquiryStatusSchema,
  submittedAt: z.string().min(1),
});

const adminProgramReservationInquirySchema = z.object({
  applicantName: z.string().min(1),
  id: z.number().int().positive(),
  phoneNumber: z.string().min(1),
  programId: z.number().int().positive().nullable(),
  programTitle: z.string().min(1),
  sourcePath: z.string().min(1),
  specialty: z.string().nullable().optional(),
  status: programReservationInquiryStatusSchema,
  submittedAt: z.string().min(1),
});

const adminProgramReservationInquiriesSchema = z.array(adminProgramReservationInquirySchema);

export const submitProgramReservationInquiry = async (
  payload: ProgramReservationInquiryPayload,
): Promise<ProgramReservationInquiryResponse> => {
  const responseData = await http.post<unknown>('/api/v1/program-reservation-inquiries', payload);
  const parsed = programReservationInquiryResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programReservationInquiries.submit',
      userMessage: '예약 문의를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};

export const fetchAdminProgramReservationInquiries = async (): Promise<
  AdminProgramReservationInquiry[]
> => {
  const responseData = await http.get<unknown>('/api/v1/admin/program-reservation-inquiries');
  const parsed = adminProgramReservationInquiriesSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programReservationInquiries.adminList',
      userMessage: '예약 문의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};

export const updateAdminProgramReservationInquiryStatus = async (
  inquiryId: number,
  status: ProgramReservationInquiryStatus,
): Promise<AdminProgramReservationInquiry> => {
  const responseData = await http.patch<unknown>(
    `/api/v1/admin/program-reservation-inquiries/${String(inquiryId)}/status`,
    { status },
  );
  const parsed = adminProgramReservationInquirySchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programReservationInquiries.adminStatus',
      userMessage: '예약 문의 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};
