export type PracticumSlotStatus = 'OPEN' | 'BLOCKED' | 'CLOSED';

export interface PracticumSlot {
  id: number;
  lectureId: number;
  practicumTitle: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  slotStatus: PracticumSlotStatus;
  maxCapacity: number;
  reservedCount: number;
  remainingCapacity: number;
  full: boolean;
  reservedByMe: boolean;
}

export interface PracticumReservation {
  id: number;
  slotId: number;
  lectureId: number;
  startAt: string;
  endAt: string;
  location: string | null;
  reservedAt: string;
}

export interface LecturePracticum {
  lectureId: number;
  lectureTitle: string;
  practicumTitle: string | null;
  enabled: boolean;
  eligible: boolean;
  lectureCompleted: boolean;
  blockedReason: string | null;
  currentReservation: PracticumReservation | null;
  currentReservations: PracticumReservation[];
  slots: PracticumSlot[];
}

export interface EnrollmentPracticumLecture extends LecturePracticum {
  sectionTitle: string;
}

export interface EnrollmentPracticumOverview {
  enrollmentId: number;
  programId: number;
  programTitle: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  active: boolean;
  enrolledAt: string;
  expireAt: string | null;
  lectures: EnrollmentPracticumLecture[];
}

export interface AdminPracticumSlotPayload {
  startAt: string;
  location: string | null;
}

export interface AdminPracticumDailyOperationPayload {
  date: string;
  openFromHour: number;
  openToHour: number;
  blockedHours: number[];
  location: string | null;
}

export interface AdminPracticumReservationItem {
  enrollmentId: number;
  lectureCompleted: boolean;
  loginId: string;
  phoneNumber: string;
  reservationId: number;
  reservedAt: string;
  status: string;
  userId: number;
  userName: string;
}

export interface AdminPracticumSlotManagementItem {
  endAt: string;
  full: boolean;
  lectureId: number;
  lectureTitle: string;
  practicumTitle: string | null;
  location: string | null;
  maxCapacity: number;
  programId: number;
  programTitle: string;
  remainingCapacity: number;
  reservations: AdminPracticumReservationItem[];
  reservedCount: number;
  sectionTitle: string;
  slotId: number;
  slotStatus: PracticumSlotStatus;
  startAt: string;
}
