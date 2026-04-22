import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type { ApiEnvelope } from '@/types/auth';
import type {
  AdminPracticumOperatingHour,
  AdminPracticumOperatingHourApplyPayload,
  AdminPracticumOfflineScheduleDetail,
  AdminPracticumOfflineScheduleOccurrence,
  AdminPracticumOperationException,
  AdminPracticumOperationExceptionPayload,
  AdminPracticumSearchCategory,
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
  searchCategory?: AdminPracticumSearchCategory,
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
          ...(searchCategory ? { searchCategory } : {}),
          ...(status && status !== 'ALL' ? { status } : {}),
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약 운영 현황을 불러오지 못했습니다.');
  }
};

export const fetchAdminPracticumOfflineSchedules = async (
  from?: string,
  to?: string,
  keyword?: string,
  searchCategory?: AdminPracticumSearchCategory,
): Promise<AdminPracticumOfflineScheduleOccurrence[]> => {
  try {
    const response = await axiosInstance.get<
      ApiEnvelope<AdminPracticumOfflineScheduleOccurrence[]>
    >('/api/v1/admin/practicum/offline-schedules', {
      params: {
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
        ...(searchCategory ? { searchCategory } : {}),
      },
    });
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '오프라인 일정을 불러오지 못했습니다.');
  }
};

export const fetchAdminPracticumOfflineScheduleDetail = async (
  ruleId: number,
): Promise<AdminPracticumOfflineScheduleDetail> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminPracticumOfflineScheduleDetail>>(
      `/api/v1/admin/practicum/offline-schedules/${String(ruleId)}`,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '오프라인 일정 상세를 불러오지 못했습니다.');
  }
};

export const updateAdminPracticumOfflineScheduleAttendance = async (
  ruleId: number,
  enrollmentId: number,
  status: 'PRESENT' | 'ABSENT' | null,
): Promise<void> => {
  try {
    await axiosInstance.patch(
      `/api/v1/admin/practicum/offline-schedules/${String(ruleId)}/attendees/${String(enrollmentId)}/absence`,
      { status },
    );
  } catch (error: unknown) {
    throw toApiError(error, '오프라인 강의 참석 상태를 저장하지 못했습니다.');
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

export const fetchAdminPracticumOperatingHours = async (): Promise<
  AdminPracticumOperatingHour[]
> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminPracticumOperatingHour[]>>(
      '/api/v1/admin/practicum/operating-hours',
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '운영시간 설정을 불러오지 못했습니다.');
  }
};

export const applyAdminPracticumOperatingHourRule = async (
  payload: AdminPracticumOperatingHourApplyPayload,
): Promise<void> => {
  try {
    await axiosInstance.put('/api/v1/admin/practicum/operating-hours/apply', payload);
  } catch (error: unknown) {
    throw toApiError(error, '운영시간 변경을 반영하지 못했습니다.');
  }
};

export const fetchAdminPracticumOperationExceptions = async (
  from?: string,
  to?: string,
): Promise<AdminPracticumOperationException[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AdminPracticumOperationException[]>>(
      '/api/v1/admin/practicum/operation-exceptions',
      {
        params: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '개인 일정을 불러오지 못했습니다.');
  }
};

export const createAdminPracticumOperationException = async (
  payload: AdminPracticumOperationExceptionPayload,
): Promise<AdminPracticumOperationException> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<AdminPracticumOperationException>>(
      '/api/v1/admin/practicum/operation-exceptions',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '개인 일정을 추가하지 못했습니다.');
  }
};

export const deleteAdminPracticumOperationException = async (
  exceptionId: number,
): Promise<void> => {
  try {
    await axiosInstance.delete(
      `/api/v1/admin/practicum/operation-exceptions/${String(exceptionId)}`,
    );
  } catch (error: unknown) {
    throw toApiError(error, '개인 일정을 삭제하지 못했습니다.');
  }
};

export const updateAdminPracticumOperationException = async (
  exceptionId: number,
  payload: AdminPracticumOperationExceptionPayload,
): Promise<AdminPracticumOperationException> => {
  try {
    const response = await axiosInstance.put<ApiEnvelope<AdminPracticumOperationException>>(
      `/api/v1/admin/practicum/operation-exceptions/${String(exceptionId)}`,
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '개인 일정을 수정하지 못했습니다.');
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

export const updateAdminPracticumSlotStatuses = async (
  slotIds: number[],
  status: PracticumSlotStatus,
): Promise<void> => {
  try {
    await axiosInstance.patch('/api/v1/admin/practicum-slots/status', {
      slotIds,
      status,
    });
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

export const moveAdminPracticumReservation = async (
  reservationId: number,
  slotId: number,
): Promise<void> => {
  try {
    await axiosInstance.patch(
      `/api/v1/admin/practicum-reservations/${String(reservationId)}/move`,
      { slotId },
    );
  } catch (error: unknown) {
    throw toApiError(error, '실습 예약 일정을 변경하지 못했습니다.');
  }
};

export const markAdminPracticumReservationNoShow = async (reservationId: number): Promise<void> => {
  try {
    await axiosInstance.patch(
      `/api/v1/admin/practicum-reservations/${String(reservationId)}/no-show`,
    );
  } catch (error: unknown) {
    throw toApiError(error, '실습 불참 처리를 저장하지 못했습니다.');
  }
};
