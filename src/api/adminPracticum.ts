import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/auth';
import type {
  AdminPracticumSlotManagementItem,
  AdminPracticumDailyOperationPayload,
  AdminPracticumSlotPayload,
  PracticumSlot,
  PracticumSlotStatus,
} from '@/types/practicum';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

const normalizePayload = (payload: AdminPracticumSlotPayload): AdminPracticumSlotPayload => {
  return {
    location: payload.location?.trim() ? payload.location.trim() : null,
    startAt: payload.startAt,
  };
};

export const fetchAdminPracticumSlots = async (lectureId: number): Promise<PracticumSlot[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<PracticumSlot[]>>(
      `/api/v1/admin/lectures/${String(lectureId)}/practicum/slots`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 슬롯을 불러오지 못했습니다.');
  }
};

export const fetchAdminPracticumSlotManagement = async (
  from?: string,
  to?: string,
  keyword?: string,
  status?: PracticumSlotStatus | 'ALL',
): Promise<AdminPracticumSlotManagementItem[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminPracticumSlotManagementItem[]>>(
      '/api/v1/admin/practicum/slots',
      {
        params: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
          ...(status && status !== 'ALL' ? { status } : {}),
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약 운영 현황을 불러오지 못했습니다.');
  }
};

export const syncAdminPracticumDailyOperation = async (
  payload: AdminPracticumDailyOperationPayload,
): Promise<void> => {
  try {
    await axiosInstance.put('/api/v1/admin/practicum/daily-operations', payload);
  } catch (error: unknown) {
    throw toApiError(error, '실습 운영 시간을 반영하지 못했습니다.');
  }
};

export const createAdminPracticumSlot = async (
  lectureId: number,
  payload: AdminPracticumSlotPayload,
): Promise<PracticumSlot> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<PracticumSlot>>(
      `/api/v1/admin/lectures/${String(lectureId)}/practicum/slots`,
      normalizePayload(payload),
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 슬롯을 추가하지 못했습니다.');
  }
};

export const deleteAdminPracticumSlot = async (slotId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/practicum-slots/${String(slotId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '실습 슬롯을 삭제하지 못했습니다.');
  }
};

export const updateAdminPracticumSlotStatus = async (
  slotId: number,
  status: PracticumSlotStatus,
): Promise<PracticumSlot> => {
  try {
    const response = await axiosInstance.patch<ApiEnvelope<PracticumSlot>>(
      `/api/v1/admin/practicum-slots/${String(slotId)}/status`,
      { status },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 슬롯 상태를 변경하지 못했습니다.');
  }
};

export const cancelAdminPracticumReservation = async (reservationId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/v1/admin/practicum-reservations/${String(reservationId)}`);
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약을 취소하지 못했습니다.');
  }
};
