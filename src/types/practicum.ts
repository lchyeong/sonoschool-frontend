export type PracticumSlotStatus = 'OPEN' | 'BLOCKED' | 'CLOSED';
export type AdminPracticumSearchCategory = 'PROGRAM' | 'LECTURE' | 'STUDENT';
export type AdminPracticumOperationExceptionType = 'ADMIN_SCHEDULE';
export type PracticumReservationStatus = 'ACTIVE' | 'NO_SHOW' | 'CANCELLED';
export type AdminPracticumReservationStatus = PracticumReservationStatus;

export interface PracticumSlot {
  id: number;
  lectureId: number;
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
  status?: PracticumReservationStatus | undefined;
}

export interface LecturePracticum {
  lectureId: number;
  lectureTitle: string;
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

export interface AdminPracticumOperatingHourApplyPayload {
  date: string;
  openFromHour: number;
  openToHour: number;
  blockedHours: number[];
  location: string | null;
}

export interface AdminPracticumOperatingHour {
  id: number;
  weekday: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  openFromHour: number;
  openToHour: number;
  location: string | null;
}

export interface AdminPracticumOperationException {
  content: string | null;
  id: number;
  type: AdminPracticumOperationExceptionType;
  title: string;
  startAt: string;
  endAt: string;
  location: string | null;
}

export interface AdminPracticumOperationExceptionPayload {
  content: string | null;
  type: AdminPracticumOperationExceptionType;
  title: string;
  startAt: string;
  endAt: string;
  location: string | null;
}

export interface AdminPracticumOfflineScheduleOccurrence {
  ruleId: number;
  lectureId: number;
  lectureTitle: string;
  sectionTitle: string;
  programId: number;
  programTitle: string;
  startAt: string;
  endAt: string;
  location: string | null;
  activeEnrollmentCount: number;
}

export interface AdminPracticumOfflineScheduleAttendeeItem {
  enrollmentId: number;
  userId: number;
  userName: string;
  loginId: string;
  phoneNumber: string | null;
  lectureCompleted: boolean;
  absent: boolean;
}

export interface AdminPracticumOfflineScheduleDetail {
  ruleId: number;
  lectureId: number;
  lectureTitle: string;
  sectionTitle: string;
  programId: number;
  programTitle: string;
  startAt: string;
  endAt: string;
  location: string | null;
  notes: string | null;
  activeEnrollmentCount: number;
  maxStudents: number | null;
  videoAttached: boolean;
  attendees: AdminPracticumOfflineScheduleAttendeeItem[];
}

export interface AdminPracticumReservationItem {
  enrollmentId: number;
  lectureCompleted: boolean;
  loginId: string;
  phoneNumber: string;
  reservationId: number;
  reservedAt: string;
  status: AdminPracticumReservationStatus;
  userId: number;
  userName: string;
}

export interface AdminPracticumSlotManagementItem {
  endAt: string;
  full: boolean;
  lectureId: number;
  lectureTitle: string;
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
