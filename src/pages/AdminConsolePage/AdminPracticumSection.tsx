import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAdminCurriculum, replaceAdminLectureOfflineSchedules } from '@/api/adminCurriculum';
import {
  applyAdminPracticumOperatingHourRule,
  cancelAdminPracticumReservation,
  completeAdminPracticumReservation,
  createAdminPracticumOperationException,
  deleteAdminPracticumOperationException,
  fetchAdminPracticumSlots,
  fetchAdminPracticumOfflineScheduleDetail,
  fetchAdminPracticumOfflineSchedules,
  fetchAdminPracticumOperatingHours,
  fetchAdminPracticumOperationExceptions,
  fetchAdminPracticumSlotManagement,
  markAdminPracticumReservationNoShow,
  moveAdminPracticumReservation,
  restoreAdminPracticumReservationNoShow,
  syncAdminPracticumDailyOperation,
  updateAdminPracticumOfflineScheduleAttendance,
  updateAdminPracticumOperationException,
} from '@/api/adminPracticum';
import calendarIconSrc from '@/assets/icons/lucide_calendar.svg';
import Modal from '@/components/overlay/Modal/Modal';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminPracticumDailyOperationPayload,
  AdminPracticumOfflineScheduleOccurrence,
  AdminPracticumOfflineScheduleDetail,
  AdminPracticumOperatingHour,
  AdminPracticumOperatingHourApplyPayload,
  AdminPracticumOperationException,
  AdminPracticumOperationExceptionPayload,
  AdminPracticumReservationStatus,
  AdminPracticumReservationItem,
  AdminPracticumSearchCategory,
  AdminPracticumSlotManagementItem,
  PracticumSlot,
  PracticumSlotStatus,
} from '@/types/practicum';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  formatTimeRange,
  getMonthBounds,
  getSlotDateKey,
  todayDateString,
  toMonthValue,
} from '@/utils/practicumCalendar';

import styles from './AdminConsolePage.module.scss';

type PracticumStatusFilter = 'ALL' | PracticumSlotStatus;
type PracticumGroupStatus = PracticumSlotStatus | 'MIXED';
type OfflineAttendanceStatus = 'UNCHECKED' | 'PRESENT' | 'ABSENT';
type OperatingWeekday = AdminPracticumOperatingHour['weekday'];

const practicumStatusLabels: Record<PracticumStatusFilter, string> = {
  ALL: '전체',
  BLOCKED: '예약 제외',
  CLOSED: '운영 종료',
  OPEN: '예약 가능',
};

const practicumSearchCategoryLabels: Record<AdminPracticumSearchCategory, string> = {
  LECTURE: '강의',
  PROGRAM: '프로그램',
  STUDENT: '수강생',
};

const practicumSearchPlaceholder: Record<AdminPracticumSearchCategory, string> = {
  LECTURE: '강의명 검색',
  PROGRAM: '프로그램명 검색',
  STUDENT: '수강생명, 아이디, 연락처 검색',
};

const practicumExceptionTypeLabels: Record<AdminPracticumOperationException['type'], string> = {
  ADMIN_SCHEDULE: '개인일정',
};

const offlineAttendanceStatusLabels: Record<OfflineAttendanceStatus, string> = {
  ABSENT: '결석',
  PRESENT: '출석',
  UNCHECKED: '선택 안 함',
};

const offlineAttendanceStatusOptions: OfflineAttendanceStatus[] = [
  'UNCHECKED',
  'PRESENT',
  'ABSENT',
];
const monthPickerLabels = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];
const operatingWeekdayOptions: { label: string; value: OperatingWeekday }[] = [
  { label: '일요일', value: 'SUNDAY' },
  { label: '월요일', value: 'MONDAY' },
  { label: '화요일', value: 'TUESDAY' },
  { label: '수요일', value: 'WEDNESDAY' },
  { label: '목요일', value: 'THURSDAY' },
  { label: '금요일', value: 'FRIDAY' },
  { label: '토요일', value: 'SATURDAY' },
];

const getOfflineAttendanceDraftKey = (ruleId: number, enrollmentId: number) =>
  `${String(ruleId)}:${String(enrollmentId)}`;

const hourOptions = Array.from({ length: 24 }, (_, index) => index);
const endHourOptions = Array.from({ length: 24 }, (_, index) => index + 1);
const DEFAULT_OPERATION_STATE = {
  blockedHours: [],
  endHour: 18,
  startHour: 9,
} satisfies {
  blockedHours: number[];
  endHour: number;
  startHour: number;
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeZone: 'Asia/Seoul',
    timeStyle: 'short',
  }).format(new Date(value));
};

const parseSeoulDate = (dateValue: string): Date => {
  return new Date(`${dateValue}T00:00:00+09:00`);
};

const toSeoulHour = (value: string): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).formatToParts(new Date(value));
  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
};

const getWeekdayKey = (dateValue: string): AdminPracticumOperatingHour['weekday'] => {
  const weekdayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'long',
  }).format(parseSeoulDate(dateValue));
  const weekdayMap: Record<string, AdminPracticumOperatingHour['weekday']> = {
    Friday: 'FRIDAY',
    Monday: 'MONDAY',
    Saturday: 'SATURDAY',
    Sunday: 'SUNDAY',
    Thursday: 'THURSDAY',
    Tuesday: 'TUESDAY',
    Wednesday: 'WEDNESDAY',
  };
  return weekdayMap[weekdayLabel] ?? 'MONDAY';
};

const getRepresentativeDateForWeekday = (
  monthValue: string,
  weekday: OperatingWeekday,
  fallbackDate: string,
): string => {
  const [yearValue, monthPart] = monthValue.split('-').map(Number);
  const lastDay = new Date(yearValue, monthPart, 0).getDate();

  for (let day = 1; day <= lastDay; day += 1) {
    const dateValue = `${monthValue}-${String(day).padStart(2, '0')}`;
    if (getWeekdayKey(dateValue) === weekday) {
      return dateValue;
    }
  }

  return fallbackDate;
};

const toIsoDateTime = (dateValue: string, hour: number): string => {
  return new Date(`${dateValue}T${String(hour).padStart(2, '0')}:00:00+09:00`).toISOString();
};

interface PracticumTimeReservationRow extends AdminPracticumReservationItem {
  lectureTitle: string;
  programTitle: string;
  sectionTitle: string;
  slotEndAt: string;
  slotLocation: string | null;
  slotStartAt: string;
}

interface PracticumTimeGroup {
  endAt: string;
  key: string;
  location: string | null;
  maxCapacity: number;
  reservations: PracticumTimeReservationRow[];
  reservedCount: number;
  slotStatus: PracticumGroupStatus;
  startAt: string;
}

type PracticumCalendarEntry =
  | {
      date: string;
      endAt: string;
      key: string;
      kind: 'ADMIN_SCHEDULE';
      label: string;
      schedule: AdminPracticumOperationException;
      startAt: string;
    }
  | {
      date: string;
      endAt: string;
      key: string;
      kind: 'OFFLINE';
      label: string;
      offlineSchedule: AdminPracticumOfflineScheduleOccurrence;
      startAt: string;
    }
  | {
      date: string;
      endAt: string;
      group: PracticumTimeGroup;
      key: string;
      kind: 'PRACTICUM';
      label: string;
      startAt: string;
    };

interface OperationFormState {
  blockedHours: number[];
  date: string;
  endHour: number;
  startHour: number;
  weekdays: OperatingWeekday[];
}

interface OperationFeedbackState {
  message: string;
  tone: 'error' | 'success';
}

interface DailyOperationFormState {
  blockedHours: number[];
  date: string;
  endHour: number;
  startHour: number;
}

interface PersonalScheduleFormState {
  content: string;
  date: string;
  endHour: number;
  startHour: number;
  title: string;
}

interface ReservationActionItem {
  lectureId: number;
  lectureTitle: string;
  programTitle: string;
  reservationId: number;
  sectionTitle: string;
  slotEndAt: string;
  slotStartAt: string;
  sourceKind: 'OFFLINE' | 'PRACTICUM';
  status: AdminPracticumReservationStatus;
  userName: string;
}

interface MoveReservationState {
  monthValue: string;
  reservations: ReservationActionItem[];
  returnLabel: string;
  selectedDate: string;
  sourceKind: 'OFFLINE' | 'PRACTICUM';
}

interface MoveOfflineScheduleState {
  detail: AdminPracticumOfflineScheduleDetail;
  nextDate: string;
}

interface PersonalScheduleEditState extends PersonalScheduleFormState {
  exceptionId: number;
}

const deriveGroupStatus = (items: AdminPracticumSlotManagementItem[]): PracticumGroupStatus => {
  const statuses = new Set(items.map((item) => item.slotStatus));
  if (statuses.size === 1) {
    return items[0]?.slotStatus ?? 'OPEN';
  }
  return 'MIXED';
};

const groupSelectedDateItems = (
  items: AdminPracticumSlotManagementItem[],
): PracticumTimeGroup[] => {
  const grouped = new Map<string, AdminPracticumSlotManagementItem[]>();
  for (const item of items) {
    const key = `${item.startAt}|${item.endAt}`;
    const current = grouped.get(key);
    if (current) {
      current.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return [...grouped.entries()]
    .map(([key, groupItems]) => {
      const sortedItems = [...groupItems].sort((left, right) =>
        left.lectureTitle.localeCompare(right.lectureTitle),
      );
      const reservationRows = sortedItems
        .flatMap((item) =>
          item.reservations.map((reservation) => ({
            ...reservation,
            lectureTitle: item.lectureTitle,
            programTitle: item.programTitle,
            sectionTitle: item.sectionTitle,
            slotEndAt: item.endAt,
            slotLocation: item.location,
            slotStartAt: item.startAt,
          })),
        )
        .sort((left, right) => Date.parse(left.reservedAt) - Date.parse(right.reservedAt));
      const activeReservedCount = reservationRows.filter(
        (reservation) => reservation.status === 'ACTIVE',
      ).length;
      const totalCapacity = sortedItems.reduce((sum, item) => sum + item.maxCapacity, 0);

      return {
        endAt: sortedItems[0].endAt,
        key,
        location: sortedItems.find((item) => item.location?.trim())?.location?.trim() ?? null,
        maxCapacity: totalCapacity,
        reservations: reservationRows,
        reservedCount: activeReservedCount,
        slotStatus: deriveGroupStatus(sortedItems),
        startAt: sortedItems[0].startAt,
      } satisfies PracticumTimeGroup;
    })
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
};

const deriveOperationState = (
  items: AdminPracticumSlotManagementItem[],
  operatingHour: AdminPracticumOperatingHour | null,
): {
  blockedHours: number[];
  endHour: number;
  startHour: number;
} => {
  if (!items.length) {
    if (operatingHour) {
      return {
        blockedHours: operatingHour.blockedHours,
        endHour: operatingHour.openToHour,
        startHour: operatingHour.openFromHour,
      };
    }

    return DEFAULT_OPERATION_STATE;
  }

  const sortedItems = [...items].sort((left, right) => left.startAt.localeCompare(right.startAt));
  const startHours = sortedItems.map((item) => toSeoulHour(item.startAt));
  const endHours = sortedItems.map((item) => toSeoulHour(item.endAt));
  const blocked = sortedItems
    .filter((item) => item.slotStatus === 'BLOCKED')
    .map((item) => toSeoulHour(item.startAt))
    .sort((left, right) => left - right);

  return {
    blockedHours: blocked,
    endHour: operatingHour?.openToHour ?? Math.max(...endHours),
    startHour: operatingHour?.openFromHour ?? Math.min(...startHours),
  };
};

const renderSlotStatusBadge = (slotStatus: PracticumGroupStatus) => {
  if (slotStatus === 'OPEN') {
    return <span className={styles['badgeSuccess']}>예약 가능</span>;
  }

  if (slotStatus === 'BLOCKED') {
    return <span className={styles['badgeDanger']}>예약 제외</span>;
  }

  if (slotStatus === 'MIXED') {
    return <span className={styles['badgeAccent']}>혼합</span>;
  }

  return <span className={styles['badge']}>운영 종료</span>;
};

const isFutureDateTime = (value: string): boolean => {
  return Date.parse(value) > Date.now();
};

const getReservationProgressLabel = (reservation: PracticumTimeReservationRow): string => {
  if (reservation.status === 'COMPLETED') {
    return '실습완료';
  }
  if (reservation.status === 'NO_SHOW') {
    return '실습불참';
  }
  if (isFutureDateTime(reservation.slotStartAt)) {
    return '예약신청완료';
  }
  if (reservation.lectureCompleted) {
    return '선행강의완료';
  }
  return '실습미진행';
};

const renderReservationProgressBadge = (reservation: PracticumTimeReservationRow) => {
  const label = getReservationProgressLabel(reservation);

  if (label === '실습완료' || label === '선행강의완료') {
    return <span className={styles['badgeSuccess']}>{label}</span>;
  }
  if (label === '예약신청완료') {
    return <span className={styles['badgeAccent']}>{label}</span>;
  }
  if (label === '실습불참') {
    return <span className={styles['badgeDanger']}>{label}</span>;
  }
  return <span className={styles['badge']}>{label}</span>;
};

const resolveOfflineAttendanceStatus = (
  attendee: AdminPracticumOfflineScheduleDetail['attendees'][number],
): OfflineAttendanceStatus => {
  if (attendee.attendanceStatus === 'PRESENT') {
    return 'PRESENT';
  }
  if (attendee.attendanceStatus === 'ABSENT' || attendee.absent) {
    return 'ABSENT';
  }
  return 'UNCHECKED';
};

const renderOfflineAttendanceBadge = (status: OfflineAttendanceStatus) => {
  if (status === 'PRESENT') {
    return <span className={styles['badgeSuccess']}>출석</span>;
  }
  if (status === 'ABSENT') {
    return <span className={styles['badgeDanger']}>결석</span>;
  }
  return <span className={styles['badge']}>선택 안 함</span>;
};

const getReservationStatusLabel = (status: AdminPracticumReservationStatus): string => {
  if (status === 'COMPLETED') {
    return '완료';
  }
  if (status === 'NO_SHOW') {
    return '불참';
  }
  if (status === 'CANCELLED') {
    return '취소';
  }
  return '활성';
};

const getPersonalScheduleProgressLabel = (
  schedule: Pick<AdminPracticumOperationException, 'endAt'>,
): '일정예정' | '일정완료' => {
  return Date.parse(schedule.endAt) > Date.now() ? '일정예정' : '일정완료';
};

const buildCalendarEntryLabel = (entry: PracticumCalendarEntry): string => {
  if (entry.kind === 'ADMIN_SCHEDULE') {
    return `${formatTimeRange(entry.startAt, entry.endAt)} ${entry.label}`;
  }
  if (entry.kind === 'OFFLINE') {
    return `${formatTimeRange(entry.startAt, entry.endAt)} 오프라인`;
  }
  return `${formatTimeRange(entry.startAt, entry.endAt)} 실습`;
};

const shiftMonthValue = (value: string, offset: number): string => {
  const [yearPart, monthPart] = value.split('-');
  const date = new Date(Number(yearPart), Number(monthPart) - 1 + offset, 1);
  return toMonthValue(date);
};

const shiftMonthYearValue = (value: string, offset: number): string => {
  const [yearPart, monthPart] = value.split('-');
  return `${String(Number(yearPart) + offset)}-${monthPart}`;
};

const resolveMonthYear = (value: string): number => {
  const [yearPart] = value.split('-');
  return Number(yearPart);
};

const isExceptionOnDate = (
  operationException: AdminPracticumOperationException,
  dateValue: string,
): boolean => {
  const dayStart = new Date(`${dateValue}T00:00:00+09:00`);
  const dayEnd = new Date(`${dateValue}T23:59:59.999+09:00`);

  return (
    new Date(operationException.startAt).getTime() <= dayEnd.getTime() &&
    new Date(operationException.endAt).getTime() > dayStart.getTime()
  );
};

const resolveScheduleEndHour = (dateValue: string, endAt: string): number => {
  const hour = toSeoulHour(endAt);

  if (hour === 0 && getSlotDateKey(endAt) > dateValue) {
    return 24;
  }

  return hour;
};

const buildPersonalScheduleFormState = (
  schedule: AdminPracticumOperationException,
): PersonalScheduleFormState => {
  const date = getSlotDateKey(schedule.startAt);

  return {
    content: schedule.content ?? '',
    date,
    endHour: resolveScheduleEndHour(date, schedule.endAt),
    startHour: toSeoulHour(schedule.startAt),
    title: schedule.title,
  };
};

const PracticumModalBackButton = ({ label, onClick }: { label: string; onClick: () => void }) => {
  return (
    <Button
      aria-label={label}
      className={styles['practicumModalBackButton']}
      onClick={onClick}
      size='sm'
      type='button'
      variant='secondary'
    >
      <span aria-hidden='true'>&lt;</span>
    </Button>
  );
};

const CalendarIconDateInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    inputRef.current?.showPicker?.();
  };

  return (
    <span className={styles['dateInputWithIcon']} onClick={openPicker}>
      <input
        className={styles['searchInput']}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        ref={inputRef}
        type='date'
        value={value}
      />
      <img alt='' aria-hidden='true' className={styles['dateInputIcon']} src={calendarIconSrc} />
    </span>
  );
};

const AdminPracticumSection = () => {
  const [activeConfigPanel, setActiveConfigPanel] = useState<
    'DAILY_OPERATION' | 'OPERATING_HOURS' | 'ADMIN_SCHEDULE'
  >('DAILY_OPERATION');
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  const [monthValue, setMonthValue] = useState(() => toMonthValue(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [statusFilter, setStatusFilter] = useState<PracticumStatusFilter>('ALL');
  const [searchCategory, setSearchCategory] = useState<AdminPracticumSearchCategory>('PROGRAM');
  const [keyword, setKeyword] = useState('');
  const [selectedDateOverviewDate, setSelectedDateOverviewDate] = useState<string | null>(null);
  const [selectedCalendarEntry, setSelectedCalendarEntry] = useState<PracticumCalendarEntry | null>(
    null,
  );
  const [moveReservationState, setMoveReservationState] = useState<MoveReservationState | null>(
    null,
  );
  const [moveOfflineScheduleState, setMoveOfflineScheduleState] =
    useState<MoveOfflineScheduleState | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const [offlineAttendanceDraft, setOfflineAttendanceDraft] = useState<
    Partial<Record<string, OfflineAttendanceStatus>>
  >({});
  const [operationDraft, setOperationDraft] = useState<OperationFormState | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackState | null>(null);
  const [dailyOperationDraft, setDailyOperationDraft] = useState<DailyOperationFormState | null>(
    null,
  );
  const [personalScheduleDraft, setPersonalScheduleDraft] =
    useState<PersonalScheduleFormState | null>(null);
  const [personalScheduleEditDraft, setPersonalScheduleEditDraft] =
    useState<PersonalScheduleEditState | null>(null);
  const deferredKeyword = useDeferredValue(keyword).trim();

  const monthBounds = useMemo(() => getMonthBounds(monthValue), [monthValue]);
  const calendarCells = useMemo(() => buildCalendarCells(monthValue), [monthValue]);
  const resolvedSelectedDate = selectedDate.startsWith(monthValue)
    ? selectedDate
    : monthBounds.from;
  const selectedMonthYear = resolveMonthYear(monthValue);
  const moveReservationMonthValue = moveReservationState?.monthValue ?? monthValue;
  const moveReservationCalendarCells = useMemo(
    () => buildCalendarCells(moveReservationMonthValue),
    [moveReservationMonthValue],
  );

  const practicumManagementQuery = useQuery({
    gcTime: 60 * 1000,
    queryFn: () =>
      fetchAdminPracticumSlotManagement(
        monthBounds.from,
        monthBounds.to,
        deferredKeyword || undefined,
        searchCategory,
        statusFilter,
      ),
    queryKey: [
      'adminPracticumManagement',
      monthBounds.from,
      monthBounds.to,
      deferredKeyword,
      searchCategory,
      statusFilter,
    ],
    staleTime: 15 * 1000,
  });

  const operatingHoursQuery = useQuery({
    queryFn: fetchAdminPracticumOperatingHours,
    queryKey: ['adminPracticumOperatingHours'],
    staleTime: 60 * 1000,
  });

  const operationExceptionsQuery = useQuery({
    queryFn: () => fetchAdminPracticumOperationExceptions(monthBounds.from, monthBounds.to),
    queryKey: ['adminPracticumOperationExceptions', monthBounds.from, monthBounds.to],
    staleTime: 15 * 1000,
  });

  const offlineSchedulesQuery = useQuery({
    queryFn: () =>
      fetchAdminPracticumOfflineSchedules(
        monthBounds.from,
        monthBounds.to,
        deferredKeyword || undefined,
        searchCategory,
      ),
    queryKey: [
      'adminPracticumOfflineSchedules',
      monthBounds.from,
      monthBounds.to,
      deferredKeyword,
      searchCategory,
    ],
    staleTime: 15 * 1000,
  });

  const moveReservationOptionsQuery = useQuery({
    enabled: moveReservationState?.reservations[0]?.lectureId !== undefined,
    gcTime: 60 * 1000,
    queryFn: () => {
      const lectureId = moveReservationState?.reservations[0]?.lectureId;
      if (lectureId === undefined) {
        throw new Error('예약 강의 정보를 찾지 못했습니다.');
      }
      return fetchAdminPracticumSlots(lectureId);
    },
    queryKey: ['adminPracticumMoveOptions', moveReservationState?.reservations[0]?.lectureId],
    staleTime: 15 * 1000,
  });

  const selectedOfflineScheduleRuleId =
    selectedCalendarEntry?.kind === 'OFFLINE' ? selectedCalendarEntry.offlineSchedule.ruleId : null;

  const offlineScheduleDetailQuery = useQuery({
    enabled: selectedOfflineScheduleRuleId !== null,
    queryFn: () => {
      if (selectedOfflineScheduleRuleId === null) {
        throw new Error('오프라인 일정이 선택되지 않았습니다.');
      }
      return fetchAdminPracticumOfflineScheduleDetail(selectedOfflineScheduleRuleId);
    },
    queryKey: ['adminPracticumOfflineScheduleDetail', selectedOfflineScheduleRuleId],
    staleTime: 15 * 1000,
  });

  const slotItems = useMemo(
    () => practicumManagementQuery.data ?? [],
    [practicumManagementQuery.data],
  );

  const selectedDateOperatingHour = useMemo(() => {
    const weekday = getWeekdayKey(resolvedSelectedDate);
    return operatingHoursQuery.data?.find((item) => item.weekday === weekday) ?? null;
  }, [operatingHoursQuery.data, resolvedSelectedDate]);

  const selectedDateItems = useMemo(() => {
    return slotItems.filter((item) => getSlotDateKey(item.startAt) === resolvedSelectedDate);
  }, [resolvedSelectedDate, slotItems]);

  const selectedDateGroups = useMemo(() => {
    return groupSelectedDateItems(selectedDateItems);
  }, [selectedDateItems]);

  const selectedDatePersonalSchedules = useMemo(() => {
    return (operationExceptionsQuery.data ?? []).filter((item) =>
      isExceptionOnDate(item, resolvedSelectedDate),
    );
  }, [operationExceptionsQuery.data, resolvedSelectedDate]);

  const overviewDateOfflineSchedules = useMemo(() => {
    if (!selectedDateOverviewDate) {
      return [];
    }
    return (offlineSchedulesQuery.data ?? []).filter(
      (item) => getSlotDateKey(item.startAt) === selectedDateOverviewDate,
    );
  }, [offlineSchedulesQuery.data, selectedDateOverviewDate]);

  const overviewDatePracticumGroups = useMemo(() => {
    if (!selectedDateOverviewDate) {
      return [];
    }
    return groupSelectedDateItems(
      slotItems.filter((item) => getSlotDateKey(item.startAt) === selectedDateOverviewDate),
    ).filter((group) => group.reservations.length > 0);
  }, [selectedDateOverviewDate, slotItems]);

  const moveReservationOptions = useMemo(() => {
    const requiredCapacity = moveReservationState?.reservations.length ?? 1;
    const currentStartAt = moveReservationState?.reservations[0]?.slotStartAt ?? null;

    return (moveReservationOptionsQuery.data ?? [])
      .filter((item) => item.slotStatus === 'OPEN' && item.remainingCapacity > 0)
      .filter((item) => item.startAt !== currentStartAt)
      .filter((item) => item.remainingCapacity >= requiredCapacity)
      .filter((item) => getSlotDateKey(item.startAt).startsWith(moveReservationMonthValue))
      .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
  }, [
    moveReservationMonthValue,
    moveReservationOptionsQuery.data,
    moveReservationState?.reservations,
  ]);

  const moveReservationOptionsByDate = useMemo(() => {
    const optionsByDate = new Map<string, PracticumSlot[]>();

    for (const item of moveReservationOptions) {
      const dateKey = getSlotDateKey(item.startAt);
      const current = optionsByDate.get(dateKey);
      if (current) {
        current.push(item);
      } else {
        optionsByDate.set(dateKey, [item]);
      }
    }

    return optionsByDate;
  }, [moveReservationOptions]);

  const selectedMoveReservationOptions = useMemo(() => {
    if (!moveReservationState) {
      return [];
    }

    return moveReservationOptionsByDate.get(moveReservationState.selectedDate) ?? [];
  }, [moveReservationOptionsByDate, moveReservationState]);

  const overviewDatePersonalSchedules = useMemo(() => {
    if (!selectedDateOverviewDate) {
      return [];
    }
    return (operationExceptionsQuery.data ?? []).filter((item) =>
      isExceptionOnDate(item, selectedDateOverviewDate),
    );
  }, [operationExceptionsQuery.data, selectedDateOverviewDate]);

  const selectedOfflineScheduleDetail: AdminPracticumOfflineScheduleDetail | null =
    selectedCalendarEntry?.kind === 'OFFLINE' ? (offlineScheduleDetailQuery.data ?? null) : null;

  const offlineAttendanceChanges = useMemo(() => {
    if (!selectedOfflineScheduleDetail) {
      return [];
    }

    return selectedOfflineScheduleDetail.attendees.filter((attendee) => {
      const draftValue =
        offlineAttendanceDraft[
          getOfflineAttendanceDraftKey(selectedOfflineScheduleDetail.ruleId, attendee.enrollmentId)
        ];
      return draftValue !== undefined && draftValue !== resolveOfflineAttendanceStatus(attendee);
    });
  }, [offlineAttendanceDraft, selectedOfflineScheduleDetail]);

  const isEditingSelectedPersonalSchedule =
    selectedCalendarEntry?.kind === 'ADMIN_SCHEDULE' &&
    personalScheduleEditDraft?.exceptionId === selectedCalendarEntry.schedule.id;
  const selectedPersonalScheduleEditDraft = isEditingSelectedPersonalSchedule
    ? personalScheduleEditDraft
    : null;

  const calendarEntriesByDate = useMemo(() => {
    const entries = new Map<string, PracticumCalendarEntry[]>();
    const slotItemsByDate = new Map<string, AdminPracticumSlotManagementItem[]>();

    for (const item of slotItems) {
      const dateKey = getSlotDateKey(item.startAt);
      const current = slotItemsByDate.get(dateKey);
      if (current) {
        current.push(item);
      } else {
        slotItemsByDate.set(dateKey, [item]);
      }
    }

    for (const [dateKey, items] of slotItemsByDate.entries()) {
      const dayEntries = groupSelectedDateItems(items)
        .filter((group) => group.reservations.length > 0)
        .map((group) => ({
          date: dateKey,
          endAt: group.endAt,
          group,
          key: `group:${group.key}`,
          kind: 'PRACTICUM' as const,
          label: `${formatTimeRange(group.startAt, group.endAt)} 실습`,
          startAt: group.startAt,
        }));
      entries.set(dateKey, dayEntries);
    }

    for (const item of offlineSchedulesQuery.data ?? []) {
      const dateKey = getSlotDateKey(item.startAt);
      const current = entries.get(dateKey) ?? [];
      current.push({
        date: dateKey,
        endAt: item.endAt,
        key: `offline:${String(item.ruleId)}:${item.startAt}`,
        kind: 'OFFLINE',
        label: item.lectureTitle,
        offlineSchedule: item,
        startAt: item.startAt,
      });
      entries.set(dateKey, current);
    }

    for (const item of operationExceptionsQuery.data ?? []) {
      for (const cell of calendarCells) {
        if (!cell.date || !isExceptionOnDate(item, cell.date)) {
          continue;
        }
        const current = entries.get(cell.date) ?? [];
        current.push({
          date: cell.date,
          endAt: item.endAt,
          key: `schedule:${String(item.id)}:${cell.date}`,
          kind: 'ADMIN_SCHEDULE',
          label: item.title,
          schedule: item,
          startAt: item.startAt,
        });
        entries.set(cell.date, current);
      }
    }

    for (const [dateKey, items] of entries.entries()) {
      entries.set(
        dateKey,
        [...items].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)),
      );
    }

    return entries;
  }, [calendarCells, offlineSchedulesQuery.data, operationExceptionsQuery.data, slotItems]);

  const countsByDate = useMemo(() => {
    return new Map(
      [...calendarEntriesByDate.entries()].map(([dateKey, entries]) => [dateKey, entries.length]),
    );
  }, [calendarEntriesByDate]);

  const baseDailyOperationState = useMemo(() => {
    return deriveOperationState(selectedDateItems, selectedDateOperatingHour);
  }, [selectedDateItems, selectedDateOperatingHour]);

  const selectedOperationWeekdays =
    operationDraft?.date === resolvedSelectedDate
      ? operationDraft.weekdays
      : [getWeekdayKey(resolvedSelectedDate)];
  const primaryOperationWeekday =
    selectedOperationWeekdays[0] ?? getWeekdayKey(resolvedSelectedDate);
  const selectedOperationOperatingHour = useMemo(() => {
    return (
      operatingHoursQuery.data?.find((item) => item.weekday === primaryOperationWeekday) ?? null
    );
  }, [operatingHoursQuery.data, primaryOperationWeekday]);

  const operationState =
    operationDraft?.date === resolvedSelectedDate
      ? operationDraft
      : {
          blockedHours: selectedOperationOperatingHour?.blockedHours ?? [],
          date: resolvedSelectedDate,
          endHour: selectedOperationOperatingHour?.openToHour ?? DEFAULT_OPERATION_STATE.endHour,
          startHour:
            selectedOperationOperatingHour?.openFromHour ?? DEFAULT_OPERATION_STATE.startHour,
          weekdays: selectedOperationWeekdays,
        };

  const updateOperationState = (updater: (current: OperationFormState) => OperationFormState) => {
    setOperationDraft((current) => {
      const baseState =
        current?.date === resolvedSelectedDate
          ? current
          : {
              blockedHours: selectedOperationOperatingHour?.blockedHours ?? [],
              date: resolvedSelectedDate,
              endHour:
                selectedOperationOperatingHour?.openToHour ?? DEFAULT_OPERATION_STATE.endHour,
              startHour:
                selectedOperationOperatingHour?.openFromHour ?? DEFAULT_OPERATION_STATE.startHour,
              weekdays: selectedOperationWeekdays,
            };
      const nextState = updater(baseState);

      return {
        ...nextState,
        blockedHours: nextState.blockedHours
          .filter((hour) => hour >= nextState.startHour && hour < nextState.endHour)
          .sort((left, right) => left - right),
        date: resolvedSelectedDate,
      };
    });
  };

  const toggleOperationWeekday = (weekday: OperatingWeekday) => {
    setOperationDraft((current) => {
      const baseState =
        current?.date === resolvedSelectedDate
          ? current
          : {
              blockedHours: selectedOperationOperatingHour?.blockedHours ?? [],
              date: resolvedSelectedDate,
              endHour:
                selectedOperationOperatingHour?.openToHour ?? DEFAULT_OPERATION_STATE.endHour,
              startHour:
                selectedOperationOperatingHour?.openFromHour ?? DEFAULT_OPERATION_STATE.startHour,
              weekdays: selectedOperationWeekdays,
            };
      const isSelected = baseState.weekdays.includes(weekday);
      const nextWeekdays = isSelected
        ? baseState.weekdays.filter((value) => value !== weekday)
        : [...baseState.weekdays, weekday];

      return {
        ...baseState,
        weekdays: operatingWeekdayOptions
          .map((option) => option.value)
          .filter((value) => nextWeekdays.includes(value)),
      };
    });
  };

  const dailyOperationState =
    dailyOperationDraft?.date === resolvedSelectedDate
      ? dailyOperationDraft
      : {
          date: resolvedSelectedDate,
          ...baseDailyOperationState,
        };

  const updateDailyOperationState = (
    updater: (current: DailyOperationFormState) => DailyOperationFormState,
  ) => {
    setDailyOperationDraft((current) => {
      const baseState =
        current?.date === resolvedSelectedDate
          ? current
          : {
              date: resolvedSelectedDate,
              ...baseDailyOperationState,
            };
      const nextState = updater(baseState);

      return {
        ...nextState,
        blockedHours: nextState.blockedHours
          .filter((hour) => hour >= nextState.startHour && hour < nextState.endHour)
          .sort((left, right) => left - right),
        date: resolvedSelectedDate,
      };
    });
  };

  const personalScheduleState =
    personalScheduleDraft?.date === resolvedSelectedDate
      ? personalScheduleDraft
      : {
          content: '',
          date: resolvedSelectedDate,
          endHour: Math.min(operationState.startHour + 1, operationState.endHour),
          startHour: operationState.startHour,
          title: '',
        };

  const updatePersonalScheduleState = (
    updater: (current: PersonalScheduleFormState) => PersonalScheduleFormState,
  ) => {
    setPersonalScheduleDraft((current) => {
      const baseState =
        current?.date === resolvedSelectedDate
          ? current
          : {
              content: '',
              date: resolvedSelectedDate,
              endHour: Math.min(operationState.startHour + 1, operationState.endHour),
              startHour: operationState.startHour,
              title: '',
            };
      const nextState = updater(baseState);

      return {
        ...nextState,
        endHour:
          nextState.endHour <= nextState.startHour
            ? Math.min(nextState.startHour + 1, 24)
            : nextState.endHour,
        startHour: Math.max(0, Math.min(nextState.startHour, 23)),
      };
    });
  };

  const updatePersonalScheduleEditState = (
    updater: (current: PersonalScheduleEditState) => PersonalScheduleEditState,
  ) => {
    setPersonalScheduleEditDraft((current) => {
      if (!current) {
        return current;
      }

      const nextState = updater(current);

      return {
        ...nextState,
        endHour:
          nextState.endHour <= nextState.startHour
            ? Math.min(nextState.startHour + 1, 24)
            : nextState.endHour,
        startHour: Math.max(0, Math.min(nextState.startHour, 23)),
      };
    });
  };

  const updateSelectedPracticumReservationStatus = (
    reservationIds: number[],
    status: AdminPracticumReservationStatus,
  ) => {
    const reservationIdSet = new Set(reservationIds);

    setSelectedCalendarEntry((current) => {
      if (current?.kind !== 'PRACTICUM') {
        return current;
      }

      const reservations = current.group.reservations.map((reservation) =>
        reservationIdSet.has(reservation.reservationId)
          ? {
              ...reservation,
              status,
            }
          : reservation,
      );

      return {
        ...current,
        group: {
          ...current.group,
          reservations,
          reservedCount: reservations.filter((reservation) => reservation.status === 'ACTIVE')
            .length,
        },
      };
    });
  };

  const cancelReservationMutation = useMutation({
    mutationFn: (reservationId: number) => cancelAdminPracticumReservation(reservationId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약을 취소하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumMoveOptions'] });
      setOperationDraft(null);
      setDailyOperationDraft(null);
      setMoveReservationState(null);
      setSelectedCalendarEntry(null);
      showToast({
        message: '관리자 권한으로 실습 예약이 취소되었습니다.',
        variant: 'success',
      });
    },
  });

  const moveReservationMutation = useMutation({
    mutationFn: async ({
      reservationIds,
      startAt,
    }: {
      reservationIds: number[];
      startAt: string;
    }) => {
      await Promise.all(
        reservationIds.map((reservationId) =>
          moveAdminPracticumReservation(reservationId, startAt),
        ),
      );
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약 일정을 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineSchedules'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineScheduleDetail'] });
      setMoveReservationState(null);
      if (
        moveReservationState?.sourceKind === 'PRACTICUM' &&
        variables.reservationIds.length === 1
      ) {
        setSelectedCalendarEntry(null);
      }
      showToast({
        message:
          variables.reservationIds.length > 1
            ? '선택한 예약의 강의일자를 변경했습니다.'
            : '실습 예약 일정을 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const markNoShowMutation = useMutation({
    mutationFn: async (reservationIds: number[]) => {
      await Promise.all(
        reservationIds.map((reservationId) => markAdminPracticumReservationNoShow(reservationId)),
      );
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 불참 처리를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, reservationIds) => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineSchedules'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineScheduleDetail'] });
      updateSelectedPracticumReservationStatus(reservationIds, 'NO_SHOW');
      showToast({
        message:
          reservationIds.length > 1
            ? '선택한 예약을 불참 처리했습니다.'
            : '실습 불참으로 처리했습니다.',
        variant: 'success',
      });
    },
  });

  const restoreNoShowMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      await restoreAdminPracticumReservationNoShow(reservationId);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 불참 처리를 취소하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, reservationId) => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineSchedules'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineScheduleDetail'] });
      updateSelectedPracticumReservationStatus([reservationId], 'ACTIVE');
      showToast({
        message: '실습 불참 처리를 취소했습니다.',
        variant: 'success',
      });
    },
  });

  const completeReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      await completeAdminPracticumReservation(reservationId);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 완료 처리를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineSchedules'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineScheduleDetail'] });
      showToast({
        message: '실습완료로 처리했고 진도율에 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const moveOfflineScheduleMutation = useMutation({
    mutationFn: async ({
      detail,
      nextDate,
    }: {
      detail: AdminPracticumOfflineScheduleDetail;
      nextDate: string;
    }) => {
      const curriculumSections = await fetchAdminCurriculum(detail.programId);
      const lecture = curriculumSections
        .flatMap((section) => section.lectures)
        .find((item) => item.id === detail.lectureId);

      if (!lecture) {
        throw new Error('현재 강의의 오프라인 일정 정보를 찾지 못했습니다.');
      }

      const hasTargetSchedule = lecture.offlineSchedules.some(
        (schedule) => schedule.id === detail.ruleId,
      );

      if (!hasTargetSchedule) {
        throw new Error('변경할 오프라인 강의 일정을 찾지 못했습니다.');
      }

      await replaceAdminLectureOfflineSchedules(detail.lectureId, {
        offlineSchedules: lecture.offlineSchedules.map((schedule) => ({
          date: schedule.id === detail.ruleId ? nextDate : schedule.date,
          endTime: schedule.endTime,
          location: schedule.location,
          notes: schedule.notes,
          startTime: schedule.startTime,
        })),
      });

      return { nextDate };
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '오프라인 강의 일정을 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async ({ nextDate }) => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineSchedules'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineScheduleDetail'] });
      setMonthValue(nextDate.slice(0, 7));
      setSelectedDate(nextDate);
      setMoveOfflineScheduleState(null);
      setSelectedCalendarEntry(null);
      setSelectedDateOverviewDate(null);
      showToast({
        message: '오프라인 강의 일정을 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const updateOfflineAttendanceMutation = useMutation({
    mutationFn: async ({
      changes,
      ruleId,
    }: {
      changes: Array<{ enrollmentId: number; status: OfflineAttendanceStatus }>;
      ruleId: number;
    }) => {
      await Promise.all(
        changes.map(({ enrollmentId, status }) =>
          updateAdminPracticumOfflineScheduleAttendance(
            ruleId,
            enrollmentId,
            status === 'UNCHECKED' ? null : status,
          ),
        ),
      );
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '오프라인 강의 참석 상태를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOfflineScheduleDetail'] });
      setOfflineAttendanceDraft({});
      showToast({
        message: '출석 상태를 저장했습니다.',
        variant: 'success',
      });
    },
  });

  const deletePersonalScheduleMutation = useMutation({
    mutationFn: (exceptionId: number) => deleteAdminPracticumOperationException(exceptionId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '개인 일정을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOperationExceptions'] });
      setPersonalScheduleEditDraft(null);
      setSelectedCalendarEntry(null);
      showToast({
        message: '개인 일정을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const updatePersonalScheduleMutation = useMutation({
    mutationFn: ({
      exceptionId,
      payload,
    }: {
      exceptionId: number;
      payload: AdminPracticumOperationExceptionPayload;
    }) => updateAdminPracticumOperationException(exceptionId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '개인 일정을 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (updatedSchedule) => {
      const nextDate = getSlotDateKey(updatedSchedule.startAt);

      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOperationExceptions'] });
      setMonthValue(nextDate.slice(0, 7));
      setSelectedDate(nextDate);
      setSelectedDateOverviewDate(nextDate);
      setSelectedCalendarEntry({
        date: nextDate,
        endAt: updatedSchedule.endAt,
        key: `schedule:${String(updatedSchedule.id)}:${nextDate}`,
        kind: 'ADMIN_SCHEDULE',
        label: updatedSchedule.title,
        schedule: updatedSchedule,
        startAt: updatedSchedule.startAt,
      });
      setPersonalScheduleEditDraft(null);
      showToast({
        message: '개인 일정을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const syncDailyOperationMutation = useMutation({
    mutationFn: (payload: AdminPracticumDailyOperationPayload) =>
      syncAdminPracticumDailyOperation(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '당일 일정을 반영하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      setDailyOperationDraft(null);
      showToast({
        message: '당일 일정을 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const applyOperatingHoursMutation = useMutation({
    mutationFn: (payloads: AdminPracticumOperatingHourApplyPayload[]) =>
      Promise.all(payloads.map((payload) => applyAdminPracticumOperatingHourRule(payload))),
    onMutate: () => {
      setOperationFeedback(null);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : '운영시간 변경을 반영하지 못했습니다.';
      setOperationFeedback({
        message,
        tone: 'error',
      });
      showToast({
        message,
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOperatingHours'] });
      setOperationDraft(null);
      setDailyOperationDraft(null);
      setOperationFeedback({
        message: '운영시간 변경을 반영했습니다.',
        tone: 'success',
      });
      showToast({
        message: '운영시간 변경을 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const createPersonalScheduleMutation = useMutation({
    mutationFn: (payload: AdminPracticumOperationExceptionPayload) =>
      createAdminPracticumOperationException(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '개인 일정을 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOperationExceptions'] });
      setPersonalScheduleDraft(null);
      showToast({
        message: '개인 일정을 추가했습니다.',
        variant: 'success',
      });
    },
  });

  const visibleBlockHours = useMemo(() => {
    return hourOptions.filter(
      (hour) => hour >= dailyOperationState.startHour && hour < dailyOperationState.endHour,
    );
  }, [dailyOperationState.endHour, dailyOperationState.startHour]);
  const visibleOperationBlockHours = useMemo(() => {
    return hourOptions.filter(
      (hour) => hour >= operationState.startHour && hour < operationState.endHour,
    );
  }, [operationState.endHour, operationState.startHour]);
  const isOperationFullyBlocked =
    visibleOperationBlockHours.length > 0 &&
    visibleOperationBlockHours.every((hour) => operationState.blockedHours.includes(hour));
  const isDailyOperationFullyBlocked =
    visibleBlockHours.length > 0 &&
    visibleBlockHours.every((hour) => dailyOperationState.blockedHours.includes(hour));

  useEffect(() => {
    if (!isMonthPickerOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (monthPickerRef.current?.contains(target)) {
        return;
      }
      setIsMonthPickerOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMonthPickerOpen]);

  const updateMonthFilter = (nextMonthValue: string) => {
    setMonthValue(nextMonthValue);
    if (!resolvedSelectedDate.startsWith(nextMonthValue)) {
      setSelectedDate(getMonthBounds(nextMonthValue).from);
    }
  };

  const closeCalendarModalStack = () => {
    setOfflineAttendanceDraft({});
    setMoveOfflineScheduleState(null);
    setMoveReservationState(null);
    setPersonalScheduleEditDraft(null);
    setSelectedCalendarEntry(null);
    setSelectedDateOverviewDate(null);
  };

  const returnToOverview = () => {
    setPersonalScheduleEditDraft(null);
    setSelectedCalendarEntry(null);
  };

  return (
    <section className={styles['workspace']}>
      <div className={styles['stackList']}>
        <section className={styles['panelWide']}>
          <div className={styles['panelToolbar']}>
            <div className={styles['adminInlineFilters']}>
              <div className={`${styles['field']} ${styles['adminInlineFilterField']}`}>
                <span className={styles['fieldLabel']}>조회 월</span>
                <div className={styles['monthPickerShell']} ref={monthPickerRef}>
                  <button
                    aria-expanded={isMonthPickerOpen}
                    aria-haspopup='dialog'
                    className={styles['monthPickerTrigger']}
                    onClick={() => {
                      setIsMonthPickerOpen((current) => !current);
                    }}
                    type='button'
                  >
                    <span>{formatMonthLabel(monthValue)}</span>
                    <img
                      alt=''
                      aria-hidden='true'
                      className={styles['monthPickerIcon']}
                      src={calendarIconSrc}
                    />
                  </button>
                  <input
                    aria-label='조회 월'
                    className={styles['visuallyHiddenInput']}
                    onChange={(event) => {
                      updateMonthFilter(event.target.value);
                    }}
                    tabIndex={-1}
                    type='month'
                    value={monthValue}
                  />
                  {isMonthPickerOpen ? (
                    <div className={styles['monthPickerPopover']} role='dialog'>
                      <div className={styles['monthPickerHeader']}>
                        <button
                          aria-label='이전 연도'
                          className={styles['monthPickerNav']}
                          onClick={() => {
                            updateMonthFilter(shiftMonthYearValue(monthValue, -1));
                          }}
                          type='button'
                        >
                          &lt;
                        </button>
                        <strong>{String(selectedMonthYear)}년</strong>
                        <button
                          aria-label='다음 연도'
                          className={styles['monthPickerNav']}
                          onClick={() => {
                            updateMonthFilter(shiftMonthYearValue(monthValue, 1));
                          }}
                          type='button'
                        >
                          &gt;
                        </button>
                      </div>
                      <div className={styles['monthPickerGrid']}>
                        {monthPickerLabels.map((label, index) => {
                          const nextMonthValue = `${String(selectedMonthYear)}-${String(
                            index + 1,
                          ).padStart(2, '0')}`;
                          return (
                            <button
                              className={styles['monthPickerMonthButton']}
                              data-selected={nextMonthValue === monthValue}
                              key={label}
                              onClick={() => {
                                updateMonthFilter(nextMonthValue);
                                setIsMonthPickerOpen(false);
                              }}
                              type='button'
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <label className={`${styles['field']} ${styles['adminInlineFilterField']}`}>
                <span className={styles['fieldLabel']}>상태</span>
                <span className={styles['selectWrap']}>
                  <select
                    className={styles['select']}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as PracticumStatusFilter);
                    }}
                    value={statusFilter}
                  >
                    {Object.entries(practicumStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className={`${styles['field']} ${styles['adminInlineFilterField']}`}>
                <span className={styles['fieldLabel']}>검색 기준</span>
                <span className={styles['selectWrap']}>
                  <select
                    className={styles['select']}
                    onChange={(event) => {
                      setSearchCategory(event.target.value as AdminPracticumSearchCategory);
                    }}
                    value={searchCategory}
                  >
                    {Object.entries(practicumSearchCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <div className={`${styles['field']} ${styles['adminInlineSearchField']}`}>
                <span className={styles['fieldLabel']}>검색</span>
                <UnifiedSearchBar
                  className={styles['adminSearchBarWide']}
                  inputAriaLabel='일정관리 검색'
                  onChange={(nextValue) => {
                    setKeyword(nextValue);
                  }}
                  onSubmit={() => undefined}
                  placeholder={practicumSearchPlaceholder[searchCategory]}
                  value={keyword}
                />
              </div>
            </div>
          </div>

          <div className={styles['practicumCalendarLayout']}>
            <div className={styles['practicumCalendarPanel']}>
              <div className={styles['practicumCalendarWeekdays']}>
                {calendarWeekdays.map((weekday) => (
                  <span className={styles['practicumCalendarWeekday']} key={weekday}>
                    {weekday}
                  </span>
                ))}
              </div>

              <div className={styles['practicumCalendarGrid']}>
                {calendarCells.map((cell, index) => {
                  if (!cell.date) {
                    return (
                      <div
                        className={styles['practicumCalendarEmptyCell']}
                        key={`empty-${String(index)}`}
                      />
                    );
                  }

                  const cellDate = cell.date;
                  const dayEntries = calendarEntriesByDate.get(cellDate) ?? [];
                  const dayCount = countsByDate.get(cellDate) ?? 0;
                  const isSelected = cellDate === resolvedSelectedDate;
                  const hasItems = dayCount > 0;
                  const previewEntries = dayEntries.slice(0, 2);

                  return (
                    <div
                      className={styles['practicumCalendarDay']}
                      data-has-items={hasItems}
                      data-selected={isSelected}
                      key={cellDate}
                      onClick={() => {
                        setSelectedDate(cellDate);
                      }}
                    >
                      <div className={styles['practicumCalendarDayHeader']}>
                        <button
                          className={styles['practicumCalendarDateButton']}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDate(cellDate);
                            setSelectedDateOverviewDate(cellDate);
                          }}
                          type='button'
                        >
                          <span className={styles['practicumCalendarDayNumber']}>
                            {Number(cellDate.slice(-2))}
                          </span>
                          <span className={styles['practicumCalendarDayCount']}>
                            {hasItems ? `일정 ${String(dayCount)}건` : '일정 없음'}
                          </span>
                        </button>
                      </div>
                      <div className={styles['practicumCalendarPreviewList']}>
                        {previewEntries.map((entry) => (
                          <button
                            className={styles['practicumCalendarPreviewButton']}
                            key={entry.key}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDate(cellDate);
                              setSelectedDateOverviewDate(cellDate);
                              setSelectedCalendarEntry(entry);
                            }}
                            type='button'
                          >
                            <span className={styles['practicumCalendarPreviewItem']}>
                              {buildCalendarEntryLabel(entry)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles['practicumCalendarDetail']}>
              <div className={styles['practicumDetailHeader']}>
                <div className={styles['panelHeader']}>
                  <div className={styles['practicumDetailActions']}>
                    <Button
                      onClick={() => {
                        setActiveConfigPanel('DAILY_OPERATION');
                      }}
                      size='sm'
                      type='button'
                      variant={activeConfigPanel === 'DAILY_OPERATION' ? 'primary' : 'secondary'}
                    >
                      당일일정변경
                    </Button>
                    <Button
                      onClick={() => {
                        setActiveConfigPanel('ADMIN_SCHEDULE');
                      }}
                      size='sm'
                      type='button'
                      variant={activeConfigPanel === 'ADMIN_SCHEDULE' ? 'primary' : 'secondary'}
                    >
                      개인일정 추가
                    </Button>
                  </div>
                  <h3 className={styles['panelTitle']}>{formatDate(resolvedSelectedDate)}</h3>
                </div>
                <div className={styles['practicumDetailActionSecondary']}>
                  <Button
                    onClick={() => {
                      setActiveConfigPanel('OPERATING_HOURS');
                    }}
                    size='sm'
                    type='button'
                    variant={activeConfigPanel === 'OPERATING_HOURS' ? 'primary' : 'secondary'}
                  >
                    운영시간 설정 변경
                  </Button>
                </div>
              </div>

              {activeConfigPanel === 'OPERATING_HOURS' ? (
                <section className={styles['practicumOperationPanel']}>
                  <div className={styles['practicumOperationSection']}>
                    <h4 className={styles['practicumOperationSubheading']}>운영시간 변경</h4>
                    <div className={styles['practicumOperationFields']}>
                      <div className={`${styles['field']} ${styles['practicumWeekdayField']}`}>
                        <span className={styles['fieldLabel']}>요일</span>
                        <div className={styles['practicumWeekdayOptions']} role='group'>
                          {operatingWeekdayOptions.map((option) => (
                            <button
                              className={styles['practicumWeekdayOption']}
                              data-selected={operationState.weekdays.includes(option.value)}
                              key={option.value}
                              onClick={() => {
                                toggleOperationWeekday(option.value);
                              }}
                              type='button'
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className={styles['field']}>
                        <span className={styles['fieldLabel']}>운영 시작</span>
                        <span className={styles['selectWrap']}>
                          <select
                            className={styles['select']}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              updateOperationState((current) => ({
                                ...current,
                                endHour:
                                  nextValue >= current.endHour
                                    ? Math.min(nextValue + 1, 24)
                                    : current.endHour,
                                startHour: nextValue,
                              }));
                            }}
                            value={operationState.startHour}
                          >
                            {hourOptions.map((hour) => (
                              <option key={hour} value={hour}>
                                {String(hour).padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                        </span>
                      </label>

                      <label className={styles['field']}>
                        <span className={styles['fieldLabel']}>운영 종료</span>
                        <span className={styles['selectWrap']}>
                          <select
                            className={styles['select']}
                            onChange={(event) => {
                              updateOperationState((current) => ({
                                ...current,
                                endHour: Number(event.target.value),
                              }));
                            }}
                            value={operationState.endHour}
                          >
                            {endHourOptions
                              .filter((hour) => hour > operationState.startHour)
                              .map((hour) => (
                                <option key={hour} value={hour}>
                                  {String(hour).padStart(2, '0')}:00
                                </option>
                              ))}
                          </select>
                        </span>
                      </label>
                    </div>

                    <div className={styles['practicumBlockedSection']}>
                      <div className={styles['practicumBlockedSectionHeader']}>
                        <span className={styles['fieldLabel']}>예약불가 시간</span>
                        <Button
                          onClick={() => {
                            updateOperationState((current) => ({
                              ...current,
                              blockedHours: isOperationFullyBlocked
                                ? []
                                : visibleOperationBlockHours,
                            }));
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          {isOperationFullyBlocked ? '전체 예약가능' : '전체 예약불가'}
                        </Button>
                      </div>
                      <div className={styles['practicumBlockedHours']}>
                        {visibleOperationBlockHours.map((hour) => {
                          const selected = operationState.blockedHours.includes(hour);
                          return (
                            <button
                              className={styles['practicumBlockedHourButton']}
                              data-selected={selected}
                              key={hour}
                              onClick={() => {
                                updateOperationState((current) => ({
                                  ...current,
                                  blockedHours: current.blockedHours.includes(hour)
                                    ? current.blockedHours.filter((value) => value !== hour)
                                    : [...current.blockedHours, hour],
                                }));
                              }}
                              type='button'
                            >
                              {String(hour).padStart(2, '0')}:00
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={styles['adminPracticumToolbar']}>
                      <Button
                        disabled={
                          applyOperatingHoursMutation.isPending ||
                          operationState.weekdays.length === 0
                        }
                        onClick={() => {
                          applyOperatingHoursMutation.mutate(
                            operationState.weekdays.map((weekday) => ({
                              blockedHours: operationState.blockedHours,
                              date: getRepresentativeDateForWeekday(
                                monthValue,
                                weekday,
                                resolvedSelectedDate,
                              ),
                              location: null,
                              openFromHour: operationState.startHour,
                              openToHour: operationState.endHour,
                            })),
                          );
                        }}
                        type='button'
                      >
                        {applyOperatingHoursMutation.isPending ? '변경 중...' : '운영시간 변경'}
                      </Button>
                      {operationFeedback ? (
                        <span
                          className={styles['operationFeedback']}
                          data-tone={operationFeedback.tone}
                          role='status'
                        >
                          {operationFeedback.message}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles['stackListCompact']}>
                      <p className={styles['helperText']}>
                        선택한 요일의 기본 운영시간을 한 번에 바꿉니다.
                      </p>
                      <p className={styles['helperText']}>
                        해당 시간에 예약이 있으면 변경할 수 없습니다.
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeConfigPanel === 'DAILY_OPERATION' ? (
                <section className={styles['practicumOperationPanel']}>
                  <div className={styles['practicumOperationSection']}>
                    <h4 className={styles['practicumOperationSubheading']}>당일 일정 변경</h4>
                    <div className={styles['practicumOperationFields']}>
                      <label className={styles['field']}>
                        <span className={styles['fieldLabel']}>운영 시작</span>
                        <span className={styles['selectWrap']}>
                          <select
                            className={styles['select']}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              updateDailyOperationState((current) => ({
                                ...current,
                                endHour:
                                  nextValue >= current.endHour
                                    ? Math.min(nextValue + 1, 24)
                                    : current.endHour,
                                startHour: nextValue,
                              }));
                            }}
                            value={dailyOperationState.startHour}
                          >
                            {hourOptions.map((hour) => (
                              <option key={hour} value={hour}>
                                {String(hour).padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                        </span>
                      </label>

                      <label className={styles['field']}>
                        <span className={styles['fieldLabel']}>운영 종료</span>
                        <span className={styles['selectWrap']}>
                          <select
                            className={styles['select']}
                            onChange={(event) => {
                              updateDailyOperationState((current) => ({
                                ...current,
                                endHour: Number(event.target.value),
                              }));
                            }}
                            value={dailyOperationState.endHour}
                          >
                            {endHourOptions
                              .filter((hour) => hour > dailyOperationState.startHour)
                              .map((hour) => (
                                <option key={hour} value={hour}>
                                  {String(hour).padStart(2, '0')}:00
                                </option>
                              ))}
                          </select>
                        </span>
                      </label>
                    </div>

                    <div className={styles['practicumBlockedSection']}>
                      <div className={styles['practicumBlockedSectionHeader']}>
                        <span className={styles['fieldLabel']}>예약불가 시간</span>
                        <Button
                          onClick={() => {
                            updateDailyOperationState((current) => ({
                              ...current,
                              blockedHours: isDailyOperationFullyBlocked ? [] : visibleBlockHours,
                            }));
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          {isDailyOperationFullyBlocked ? '전체 예약가능' : '전체 예약불가'}
                        </Button>
                      </div>
                      <div className={styles['practicumBlockedHours']}>
                        {visibleBlockHours.map((hour) => {
                          const selected = dailyOperationState.blockedHours.includes(hour);
                          return (
                            <button
                              className={styles['practicumBlockedHourButton']}
                              data-selected={selected}
                              key={hour}
                              onClick={() => {
                                updateDailyOperationState((current) => ({
                                  ...current,
                                  blockedHours: current.blockedHours.includes(hour)
                                    ? current.blockedHours.filter((value) => value !== hour)
                                    : [...current.blockedHours, hour],
                                }));
                              }}
                              type='button'
                            >
                              {String(hour).padStart(2, '0')}:00
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={styles['adminPracticumToolbar']}>
                      <Button
                        disabled={syncDailyOperationMutation.isPending}
                        onClick={() => {
                          syncDailyOperationMutation.mutate({
                            blockedHours: dailyOperationState.blockedHours,
                            date: resolvedSelectedDate,
                            location: null,
                            openFromHour: dailyOperationState.startHour,
                            openToHour: dailyOperationState.endHour,
                          });
                        }}
                        type='button'
                        variant='secondary'
                      >
                        {syncDailyOperationMutation.isPending ? '반영 중...' : '당일 일정 반영'}
                      </Button>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeConfigPanel === 'ADMIN_SCHEDULE' ? (
                <section className={styles['practicumOperationPanel']}>
                  <div className={styles['personalScheduleFields']}>
                    <label
                      className={`${styles['field']} ${styles['personalScheduleFullWidthField']}`}
                    >
                      <span className={styles['fieldLabel']}>일정명</span>
                      <input
                        className={styles['searchInput']}
                        onChange={(event) => {
                          updatePersonalScheduleState((current) => ({
                            ...current,
                            title: event.target.value,
                          }));
                        }}
                        placeholder='예: 관리자 개인 일정'
                        type='text'
                        value={personalScheduleState.title}
                      />
                    </label>

                    <label
                      className={`${styles['field']} ${styles['personalScheduleFullWidthField']}`}
                    >
                      <span className={styles['fieldLabel']}>일정내용</span>
                      <textarea
                        className={styles['textarea']}
                        onChange={(event) => {
                          updatePersonalScheduleState((current) => ({
                            ...current,
                            content: event.target.value,
                          }));
                        }}
                        placeholder='예: 외부 미팅 준비 및 주간 운영 점검'
                        rows={4}
                        value={personalScheduleState.content}
                      />
                    </label>

                    <label className={styles['field']}>
                      <span className={styles['fieldLabel']}>시작</span>
                      <span className={styles['selectWrap']}>
                        <select
                          className={styles['select']}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            updatePersonalScheduleState((current) => ({
                              ...current,
                              endHour:
                                nextValue >= current.endHour
                                  ? Math.min(nextValue + 1, 24)
                                  : current.endHour,
                              startHour: nextValue,
                            }));
                          }}
                          value={personalScheduleState.startHour}
                        >
                          {hourOptions.map((hour) => (
                            <option key={hour} value={hour}>
                              {String(hour).padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>

                    <label className={styles['field']}>
                      <span className={styles['fieldLabel']}>종료</span>
                      <span className={styles['selectWrap']}>
                        <select
                          className={styles['select']}
                          onChange={(event) => {
                            updatePersonalScheduleState((current) => ({
                              ...current,
                              endHour: Number(event.target.value),
                            }));
                          }}
                          value={personalScheduleState.endHour}
                        >
                          {endHourOptions
                            .filter((hour) => hour > personalScheduleState.startHour)
                            .map((hour) => (
                              <option key={hour} value={hour}>
                                {String(hour).padStart(2, '0')}:00
                              </option>
                            ))}
                        </select>
                      </span>
                    </label>
                  </div>

                  <div className={styles['adminPracticumToolbar']}>
                    <Button
                      disabled={
                        createPersonalScheduleMutation.isPending ||
                        !personalScheduleState.title.trim()
                      }
                      onClick={() => {
                        createPersonalScheduleMutation.mutate({
                          content: personalScheduleState.content.trim() || null,
                          endAt: toIsoDateTime(resolvedSelectedDate, personalScheduleState.endHour),
                          location: null,
                          startAt: toIsoDateTime(
                            resolvedSelectedDate,
                            personalScheduleState.startHour,
                          ),
                          title: personalScheduleState.title.trim(),
                          type: 'ADMIN_SCHEDULE',
                        });
                      }}
                      type='button'
                      variant='secondary'
                    >
                      {createPersonalScheduleMutation.isPending ? '추가 중...' : '개인일정 추가'}
                    </Button>
                  </div>

                  {selectedDatePersonalSchedules.length ? (
                    <div className={styles['adminPracticumList']}>
                      {selectedDatePersonalSchedules.map((item) => (
                        <article className={styles['adminPracticumCard']} key={item.id}>
                          <div className={styles['adminPracticumHeader']}>
                            <button
                              className={styles['scheduleTitleButton']}
                              onClick={() => {
                                setSelectedDateOverviewDate(resolvedSelectedDate);
                                setSelectedCalendarEntry({
                                  date: resolvedSelectedDate,
                                  endAt: item.endAt,
                                  key: `schedule:${String(item.id)}:${resolvedSelectedDate}`,
                                  kind: 'ADMIN_SCHEDULE',
                                  label: item.title,
                                  schedule: item,
                                  startAt: item.startAt,
                                });
                              }}
                              type='button'
                            >
                              {item.title}
                            </button>

                            <div className={styles['adminPracticumActions']}>
                              <span className={styles['badgeDanger']}>
                                {practicumExceptionTypeLabels[item.type]}
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className={styles['helperText']}>등록된 개인일정이 없습니다.</p>
                  )}
                </section>
              ) : null}

              {activeConfigPanel === 'DAILY_OPERATION' && practicumManagementQuery.isPending ? (
                <p className={styles['helperText']}>일정 현황을 불러오는 중입니다.</p>
              ) : null}
              {activeConfigPanel === 'DAILY_OPERATION' && practicumManagementQuery.isError ? (
                <p className={styles['helperText']}>
                  {practicumManagementQuery.error instanceof Error
                    ? practicumManagementQuery.error.message
                    : '일정 현황을 불러오지 못했습니다.'}
                </p>
              ) : null}

              {activeConfigPanel === 'DAILY_OPERATION' &&
              !practicumManagementQuery.isPending &&
              !practicumManagementQuery.isError ? (
                selectedDateGroups.length ? (
                  <div className={styles['adminPracticumList']}>
                    {selectedDateGroups.map((group) => (
                      <article className={styles['adminPracticumCard']} key={group.key}>
                        <div className={styles['adminPracticumHeader']}>
                          <div className={styles['cellStack']}>
                            <button
                              className={styles['scheduleTitleButton']}
                              onClick={() => {
                                setSelectedDateOverviewDate(resolvedSelectedDate);
                                setSelectedCalendarEntry({
                                  date: resolvedSelectedDate,
                                  endAt: group.endAt,
                                  group,
                                  key: `group:${group.key}`,
                                  kind: 'PRACTICUM',
                                  label: `${formatTimeRange(group.startAt, group.endAt)} 실습`,
                                  startAt: group.startAt,
                                });
                              }}
                              type='button'
                            >
                              {formatTimeRange(group.startAt, group.endAt)}
                            </button>
                            {group.reservations.length ? (
                              <div className={styles['adminPracticumMeta']}>
                                <span>
                                  활성 예약 {String(group.reservedCount)}/
                                  {String(group.maxCapacity)}명
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className={styles['adminPracticumActions']}>
                            {renderSlotStatusBadge(group.slotStatus)}
                          </div>
                        </div>

                        {group.reservations.length ? (
                          <div className={styles['adminPracticumReservationList']}>
                            {group.reservations.map((reservation) => (
                              <div
                                className={styles['adminPracticumReservationRow']}
                                key={reservation.reservationId}
                              >
                                <div className={styles['adminPracticumReservationMain']}>
                                  <div className={styles['cellStack']}>
                                    <strong className={styles['cellPrimary']}>
                                      {reservation.loginId}
                                    </strong>
                                    <span className={styles['cellSecondary']}>
                                      {reservation.userName} · {reservation.phoneNumber}
                                    </span>
                                  </div>
                                  <div className={styles['adminPracticumReservationCourse']}>
                                    <span>
                                      {reservation.programTitle} &gt; {reservation.lectureTitle}
                                    </span>
                                  </div>
                                </div>
                                <div className={styles['adminPracticumReservationMeta']}>
                                  <span className={styles['cellSecondary']}>
                                    {formatDateTime(reservation.reservedAt)}
                                  </span>
                                  {renderReservationProgressBadge(reservation)}
                                  <span className={styles['badge']}>
                                    {getReservationStatusLabel(reservation.status)}
                                  </span>
                                  {reservation.status === 'ACTIVE' ? (
                                    <Button
                                      disabled={cancelReservationMutation.isPending}
                                      onClick={() => {
                                        cancelReservationMutation.mutate(reservation.reservationId);
                                      }}
                                      size='sm'
                                      type='button'
                                      variant='danger'
                                    >
                                      예약 취소
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles['adminPracticumEmptyRow']}>
                            <span className={styles['cellSecondary']}>예약된 회원 없음</span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className={styles['helperText']}>선택한 날짜에 등록된 일정이 없습니다.</p>
                )
              ) : null}

              {selectedDateOverviewDate && !selectedCalendarEntry && !moveReservationState ? (
                <Modal
                  description={formatDate(selectedDateOverviewDate)}
                  onClose={() => {
                    setSelectedDateOverviewDate(null);
                  }}
                  title='일정관리 상세'
                >
                  <div className={styles['practicumDayOverviewModal']}>
                    <section className={styles['practicumDayOverviewSection']}>
                      <div className={styles['practicumDayOverviewHeader']}>
                        <h4 className={styles['practicumDayOverviewTitle']}>오프라인 강의</h4>
                        <span className={styles['badge']}>
                          {String(overviewDateOfflineSchedules.length)}건
                        </span>
                      </div>
                      {overviewDateOfflineSchedules.length ? (
                        <div className={styles['practicumDayOverviewList']}>
                          {overviewDateOfflineSchedules.map((item) => (
                            <button
                              className={styles['practicumDayOverviewCard']}
                              key={`overview-offline-${String(item.ruleId)}-${item.startAt}`}
                              onClick={() => {
                                setSelectedCalendarEntry({
                                  date: getSlotDateKey(item.startAt),
                                  endAt: item.endAt,
                                  key: `offline:${String(item.ruleId)}:${item.startAt}`,
                                  kind: 'OFFLINE',
                                  label: item.lectureTitle,
                                  offlineSchedule: item,
                                  startAt: item.startAt,
                                });
                              }}
                              type='button'
                            >
                              <div className={styles['cellStack']}>
                                <strong className={styles['cellPrimary']}>
                                  {formatTimeRange(item.startAt, item.endAt)}
                                </strong>
                                <span className={styles['cellSecondary']}>
                                  {item.programTitle} &gt; {item.sectionTitle} &gt;{' '}
                                  {item.lectureTitle}
                                </span>
                              </div>
                              <span className={styles['badge']}>
                                수강생 {String(item.activeEnrollmentCount)}명
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={styles['helperText']}>등록된 오프라인 강의가 없습니다.</p>
                      )}
                    </section>

                    <section className={styles['practicumDayOverviewSection']}>
                      <div className={styles['practicumDayOverviewHeader']}>
                        <h4 className={styles['practicumDayOverviewTitle']}>실습</h4>
                        <span className={styles['badge']}>
                          {String(overviewDatePracticumGroups.length)}건
                        </span>
                      </div>
                      {overviewDatePracticumGroups.length ? (
                        <div className={styles['practicumDayOverviewList']}>
                          {overviewDatePracticumGroups.map((group) => (
                            <button
                              className={styles['practicumDayOverviewCard']}
                              key={`overview-practicum-${group.key}`}
                              onClick={() => {
                                setSelectedCalendarEntry({
                                  date: getSlotDateKey(group.startAt),
                                  endAt: group.endAt,
                                  group,
                                  key: `group:${group.key}`,
                                  kind: 'PRACTICUM',
                                  label: `${formatTimeRange(group.startAt, group.endAt)} 실습`,
                                  startAt: group.startAt,
                                });
                              }}
                              type='button'
                            >
                              <div className={styles['cellStack']}>
                                <strong className={styles['cellPrimary']}>
                                  {formatTimeRange(group.startAt, group.endAt)}
                                </strong>
                                {group.reservations.length ? (
                                  <span className={styles['cellSecondary']}>
                                    활성 예약 {String(group.reservedCount)}/
                                    {String(group.maxCapacity)}명
                                    {group.reservations.length
                                      ? ` · ${group.reservations
                                          .map((reservation) => reservation.userName)
                                          .join(', ')}`
                                      : ''}
                                  </span>
                                ) : null}
                              </div>
                              {renderSlotStatusBadge(group.slotStatus)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={styles['helperText']}>등록된 실습 일정이 없습니다.</p>
                      )}
                    </section>

                    <section className={styles['practicumDayOverviewSection']}>
                      <div className={styles['practicumDayOverviewHeader']}>
                        <h4 className={styles['practicumDayOverviewTitle']}>개인일정</h4>
                        <span className={styles['badge']}>
                          {String(overviewDatePersonalSchedules.length)}건
                        </span>
                      </div>
                      {overviewDatePersonalSchedules.length ? (
                        <div className={styles['practicumDayOverviewList']}>
                          {overviewDatePersonalSchedules.map((item) => (
                            <button
                              className={styles['practicumDayOverviewCard']}
                              key={`overview-schedule-${String(item.id)}`}
                              onClick={() => {
                                setSelectedCalendarEntry({
                                  date: getSlotDateKey(item.startAt),
                                  endAt: item.endAt,
                                  key: `schedule:${String(item.id)}:${getSlotDateKey(item.startAt)}`,
                                  kind: 'ADMIN_SCHEDULE',
                                  label: item.title,
                                  schedule: item,
                                  startAt: item.startAt,
                                });
                              }}
                              type='button'
                            >
                              <div className={styles['cellStack']}>
                                <strong className={styles['cellPrimary']}>{item.title}</strong>
                                <span className={styles['cellSecondary']}>
                                  {formatTimeRange(item.startAt, item.endAt)}
                                </span>
                              </div>
                              <span className={styles['badgeDanger']}>예약 차단</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={styles['helperText']}>등록된 개인일정이 없습니다.</p>
                      )}
                    </section>
                  </div>
                </Modal>
              ) : null}

              {selectedCalendarEntry && !moveReservationState && !moveOfflineScheduleState ? (
                <Modal
                  description={
                    selectedCalendarEntry.kind === 'PRACTICUM'
                      ? `${formatDateTime(selectedCalendarEntry.startAt)} ~ ${formatDateTime(selectedCalendarEntry.endAt)}`
                      : selectedCalendarEntry.kind === 'OFFLINE'
                        ? `${formatDateTime(selectedCalendarEntry.offlineSchedule.startAt)} ~ ${formatDateTime(selectedCalendarEntry.offlineSchedule.endAt)}`
                        : `${formatDateTime(selectedCalendarEntry.schedule.startAt)} ~ ${formatDateTime(selectedCalendarEntry.schedule.endAt)}`
                  }
                  headerLeading={
                    <PracticumModalBackButton
                      label={
                        selectedCalendarEntry.kind === 'ADMIN_SCHEDULE' &&
                        isEditingSelectedPersonalSchedule
                          ? '개인일정 상세로 돌아가기'
                          : '일정 목록으로 돌아가기'
                      }
                      onClick={() => {
                        if (
                          selectedCalendarEntry.kind === 'ADMIN_SCHEDULE' &&
                          isEditingSelectedPersonalSchedule
                        ) {
                          setPersonalScheduleEditDraft(null);
                          return;
                        }

                        returnToOverview();
                      }}
                    />
                  }
                  headerLeadingStacked
                  onClose={closeCalendarModalStack}
                  title={
                    selectedCalendarEntry.kind === 'PRACTICUM'
                      ? '실습 일정 상세'
                      : selectedCalendarEntry.kind === 'OFFLINE'
                        ? '오프라인 일정 상세'
                        : isEditingSelectedPersonalSchedule
                          ? '일정변경'
                          : '개인일정 상세'
                  }
                >
                  {selectedCalendarEntry.kind === 'PRACTICUM' ? (
                    <div className={styles['practicumDetailModal']}>
                      <div className={styles['practicumDetailSummary']}>
                        <span>시간</span>
                        <strong>
                          {formatTimeRange(
                            selectedCalendarEntry.group.startAt,
                            selectedCalendarEntry.group.endAt,
                          )}
                        </strong>
                        <span>상태</span>
                        <strong>
                          {selectedCalendarEntry.group.slotStatus === 'BLOCKED'
                            ? '예약 제외'
                            : selectedCalendarEntry.group.slotStatus === 'OPEN'
                              ? '예약 가능'
                              : selectedCalendarEntry.group.slotStatus === 'CLOSED'
                                ? '운영 종료'
                                : '혼합'}
                        </strong>
                        {selectedCalendarEntry.group.reservedCount > 0 ? (
                          <>
                            <span>활성 예약</span>
                            <strong>
                              {String(selectedCalendarEntry.group.reservedCount)}/
                              {String(selectedCalendarEntry.group.maxCapacity)}명
                            </strong>
                          </>
                        ) : null}
                      </div>

                      {selectedCalendarEntry.group.reservations.length ? (
                        <div className={styles['practicumDetailReservationList']}>
                          {selectedCalendarEntry.group.reservations.map((reservation) => (
                            <div
                              className={styles['practicumDetailReservationCard']}
                              key={reservation.reservationId}
                            >
                              <div className={styles['practicumDetailReservationHeader']}>
                                <div className={styles['cellStack']}>
                                  <strong className={styles['cellPrimary']}>
                                    {reservation.userName}
                                  </strong>
                                  <span className={styles['cellSecondary']}>
                                    {reservation.loginId} · {reservation.phoneNumber}
                                  </span>
                                </div>
                                <div className={styles['practicumDetailReservationBadges']}>
                                  {renderReservationProgressBadge(reservation)}
                                  <span className={styles['badge']}>
                                    {getReservationStatusLabel(reservation.status)}
                                  </span>
                                </div>
                              </div>

                              <div className={styles['practicumDetailSummary']}>
                                <span>예약 시간</span>
                                <strong>
                                  {formatDateTime(reservation.slotStartAt)} ~{' '}
                                  {formatDateTime(reservation.slotEndAt)}
                                </strong>
                                <span>프로그램</span>
                                <strong>{reservation.programTitle}</strong>
                                <span>섹션</span>
                                <strong>{reservation.sectionTitle}</strong>
                                <span>강의명</span>
                                <strong>{reservation.lectureTitle}</strong>
                                <span>예약자</span>
                                <strong>{reservation.userName}</strong>
                                <span>접수 시각</span>
                                <strong>{formatDateTime(reservation.reservedAt)}</strong>
                                <span>장소</span>
                                <strong>{reservation.slotLocation?.trim() || '장소 미정'}</strong>
                              </div>

                              {reservation.status === 'ACTIVE' ? (
                                <div className={styles['practicumModalActionRow']}>
                                  <Button
                                    disabled={moveReservationMutation.isPending}
                                    onClick={() => {
                                      const reservationDate = getSlotDateKey(
                                        reservation.slotStartAt,
                                      );
                                      setMoveReservationState({
                                        monthValue: toMonthValue(parseSeoulDate(reservationDate)),
                                        reservations: [
                                          {
                                            lectureId: reservation.lectureId,
                                            lectureTitle: reservation.lectureTitle,
                                            programTitle: reservation.programTitle,
                                            reservationId: reservation.reservationId,
                                            sectionTitle: reservation.sectionTitle,
                                            slotEndAt: reservation.slotEndAt,
                                            slotStartAt: reservation.slotStartAt,
                                            sourceKind: 'PRACTICUM',
                                            status: reservation.status,
                                            userName: reservation.userName,
                                          },
                                        ],
                                        returnLabel: '실습 일정 상세로 돌아가기',
                                        selectedDate: reservationDate,
                                        sourceKind: 'PRACTICUM',
                                      });
                                    }}
                                    size='sm'
                                    type='button'
                                    variant='secondary'
                                  >
                                    예약일자 변경
                                  </Button>
                                  <Button
                                    disabled={cancelReservationMutation.isPending}
                                    onClick={() => {
                                      cancelReservationMutation.mutate(reservation.reservationId);
                                    }}
                                    size='sm'
                                    type='button'
                                    variant='danger'
                                  >
                                    예약취소
                                  </Button>
                                  <Button
                                    disabled={markNoShowMutation.isPending}
                                    onClick={() => {
                                      markNoShowMutation.mutate([reservation.reservationId]);
                                    }}
                                    size='sm'
                                    type='button'
                                    variant='secondary'
                                  >
                                    불참처리
                                  </Button>
                                  <span
                                    className={styles['practicumActionTooltipWrap']}
                                    data-tooltip={
                                      isFutureDateTime(reservation.slotEndAt)
                                        ? '실습 종료 후 완료 처리할 수 있습니다.'
                                        : completeReservationMutation.isPending
                                          ? '실습 완료 처리 중입니다.'
                                          : undefined
                                    }
                                  >
                                    <Button
                                      disabled={
                                        completeReservationMutation.isPending ||
                                        isFutureDateTime(reservation.slotEndAt)
                                      }
                                      onClick={() => {
                                        completeReservationMutation.mutate(reservation.reservationId);
                                      }}
                                      size='sm'
                                      type='button'
                                      variant='primary'
                                    >
                                      실습완료
                                    </Button>
                                  </span>
                                </div>
                              ) : reservation.status === 'NO_SHOW' ? (
                                <div className={styles['practicumModalActionRow']}>
                                  <Button
                                    disabled={restoreNoShowMutation.isPending}
                                    onClick={() => {
                                      restoreNoShowMutation.mutate(reservation.reservationId);
                                    }}
                                    size='sm'
                                    type='button'
                                    variant='secondary'
                                  >
                                    불참취소
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles['helperText']}>예약된 수강생이 없습니다.</p>
                      )}
                    </div>
                  ) : selectedCalendarEntry.kind === 'OFFLINE' ? (
                    <div className={styles['practicumDetailModal']}>
                      {offlineScheduleDetailQuery.isLoading ? (
                        <p className={styles['helperText']}>
                          오프라인 일정 상세를 불러오는 중입니다.
                        </p>
                      ) : offlineScheduleDetailQuery.isError ? (
                        <p className={styles['helperText']}>
                          {offlineScheduleDetailQuery.error instanceof Error
                            ? offlineScheduleDetailQuery.error.message
                            : '오프라인 일정 상세를 불러오지 못했습니다.'}
                        </p>
                      ) : selectedOfflineScheduleDetail ? (
                        <>
                          <div className={styles['practicumDetailSummary']}>
                            <span>프로그램</span>
                            <strong>{selectedOfflineScheduleDetail.programTitle}</strong>
                            <span>강의</span>
                            <strong>
                              {selectedOfflineScheduleDetail.sectionTitle} &gt;{' '}
                              {selectedOfflineScheduleDetail.lectureTitle}
                            </strong>
                            <span>시간</span>
                            <strong>
                              {formatTimeRange(
                                selectedOfflineScheduleDetail.startAt,
                                selectedOfflineScheduleDetail.endAt,
                              )}
                            </strong>
                            <span>장소</span>
                            <strong>
                              {selectedOfflineScheduleDetail.location?.trim() || '장소 미정'}
                            </strong>
                            <span>수강생</span>
                            <strong>
                              {`${String(selectedOfflineScheduleDetail.activeEnrollmentCount)}명`}
                            </strong>
                            <span>선행학습 기준</span>
                            <strong>커리큘럼상 앞선 영상/문제/자료 강의</strong>
                            {selectedOfflineScheduleDetail.notes?.trim() ? (
                              <>
                                <span>비고</span>
                                <strong>{selectedOfflineScheduleDetail.notes}</strong>
                              </>
                            ) : null}
                          </div>

                          {selectedOfflineScheduleDetail.attendees.length ? (
                            <div className={styles['practicumDetailReservationList']}>
                              {selectedOfflineScheduleDetail.attendees.map((attendee) => {
                                const attendanceDraftKey = getOfflineAttendanceDraftKey(
                                  selectedOfflineScheduleDetail.ruleId,
                                  attendee.enrollmentId,
                                );
                                const attendanceStatus =
                                  offlineAttendanceDraft[attendanceDraftKey] ??
                                  resolveOfflineAttendanceStatus(attendee);

                                return (
                                  <div
                                    className={styles['practicumDetailReservationCard']}
                                    key={`offline-attendee-${String(attendee.enrollmentId)}`}
                                  >
                                    <div className={styles['practicumDetailReservationHeader']}>
                                      <div className={styles['cellStack']}>
                                        <strong className={styles['cellPrimary']}>
                                          {attendee.userName}
                                        </strong>
                                        <span className={styles['cellSecondary']}>
                                          {attendee.loginId} ·{' '}
                                          {attendee.phoneNumber?.trim() || '연락처 없음'}
                                        </span>
                                      </div>
                                      <div className={styles['practicumDetailReservationActions']}>
                                        <div className={styles['practicumDetailReservationBadges']}>
                                          {attendee.prerequisiteTotalCount > 0 ? (
                                            attendee.prerequisiteCompleted ? (
                                              <span className={styles['badgeSuccess']}>
                                                선행{' '}
                                                {`${String(attendee.prerequisiteCompletedCount)}/${String(attendee.prerequisiteTotalCount)}`}
                                              </span>
                                            ) : (
                                              <span className={styles['badgeDanger']}>
                                                선행{' '}
                                                {`${String(attendee.prerequisiteCompletedCount)}/${String(attendee.prerequisiteTotalCount)}`}
                                              </span>
                                            )
                                          ) : (
                                            <span className={styles['badge']}>선행 없음</span>
                                          )}
                                          {renderOfflineAttendanceBadge(attendanceStatus)}
                                        </div>
                                        <div
                                          aria-label={`${attendee.userName} 출석 상태`}
                                          className={styles['practicumDetailAttendanceGroup']}
                                          role='radiogroup'
                                        >
                                          {offlineAttendanceStatusOptions.map((status) => (
                                            <label
                                              className={
                                                attendanceStatus === status
                                                  ? `${styles['practicumDetailAttendanceOption']} ${styles['isSelected']}`
                                                  : styles['practicumDetailAttendanceOption']
                                              }
                                              key={`${String(attendee.enrollmentId)}-${status}`}
                                            >
                                              <input
                                                checked={attendanceStatus === status}
                                                disabled={updateOfflineAttendanceMutation.isPending}
                                                name={`offline-attendance-${String(attendee.enrollmentId)}`}
                                                onChange={() => {
                                                  setOfflineAttendanceDraft((current) => ({
                                                    ...current,
                                                    [attendanceDraftKey]: status,
                                                  }));
                                                }}
                                                type='radio'
                                                value={status}
                                              />
                                              <span>{offlineAttendanceStatusLabels[status]}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className={styles['helperText']}>표시할 수강생이 없습니다.</p>
                          )}

                          <div className={styles['practicumModalActionRow']}>
                            <Button
                              onClick={() => {
                                setMoveOfflineScheduleState({
                                  detail: selectedOfflineScheduleDetail,
                                  nextDate: getSlotDateKey(selectedOfflineScheduleDetail.startAt),
                                });
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              강의일자 변경
                            </Button>
                            <Button
                              className={styles['practicumDetailAttendanceSaveButton']}
                              disabled={
                                updateOfflineAttendanceMutation.isPending ||
                                offlineAttendanceChanges.length === 0
                              }
                              onClick={() => {
                                updateOfflineAttendanceMutation.mutate({
                                  changes: offlineAttendanceChanges.map((attendee) => ({
                                    enrollmentId: attendee.enrollmentId,
                                    status:
                                      offlineAttendanceDraft[
                                        getOfflineAttendanceDraftKey(
                                          selectedOfflineScheduleDetail.ruleId,
                                          attendee.enrollmentId,
                                        )
                                      ] ?? resolveOfflineAttendanceStatus(attendee),
                                  })),
                                  ruleId: selectedOfflineScheduleDetail.ruleId,
                                });
                              }}
                              size='sm'
                              type='button'
                              variant='primary'
                            >
                              출석 상태 저장
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className={styles['helperText']}>오프라인 일정 상세 정보가 없습니다.</p>
                      )}
                    </div>
                  ) : (
                    <div className={styles['practicumDetailModal']}>
                      {selectedPersonalScheduleEditDraft ? (
                        <>
                          <div className={styles['practicumOperationFields']}>
                            <label className={styles['field']}>
                              <span className={styles['fieldLabel']}>날짜</span>
                              <CalendarIconDateInput
                                onChange={(value) => {
                                  updatePersonalScheduleEditState((current) => ({
                                    ...current,
                                    date: value,
                                  }));
                                }}
                                value={selectedPersonalScheduleEditDraft.date}
                              />
                            </label>

                            <label className={styles['field']}>
                              <span className={styles['fieldLabel']}>일정명</span>
                              <input
                                className={styles['searchInput']}
                                onChange={(event) => {
                                  updatePersonalScheduleEditState((current) => ({
                                    ...current,
                                    title: event.target.value,
                                  }));
                                }}
                                placeholder='예: 관리자 개인 일정'
                                type='text'
                                value={selectedPersonalScheduleEditDraft.title}
                              />
                            </label>

                            <label className={styles['field']}>
                              <span className={styles['fieldLabel']}>일정내용</span>
                              <textarea
                                className={styles['textarea']}
                                onChange={(event) => {
                                  updatePersonalScheduleEditState((current) => ({
                                    ...current,
                                    content: event.target.value,
                                  }));
                                }}
                                rows={4}
                                value={selectedPersonalScheduleEditDraft.content}
                              />
                            </label>

                            <div
                              className={`${styles['field']} ${styles['practicumTimeRangeField']}`}
                            >
                              <span className={styles['fieldLabel']}>시간</span>
                              <div className={styles['practicumTimeRangeControls']}>
                                <label className={styles['practicumTimeSelect']}>
                                  <span className={styles['selectWrap']}>
                                    <select
                                      aria-label='시작 시간'
                                      className={styles['select']}
                                      onChange={(event) => {
                                        const nextValue = Number(event.target.value);
                                        updatePersonalScheduleEditState((current) => ({
                                          ...current,
                                          endHour:
                                            nextValue >= current.endHour
                                              ? Math.min(nextValue + 1, 24)
                                              : current.endHour,
                                          startHour: nextValue,
                                        }));
                                      }}
                                      value={selectedPersonalScheduleEditDraft.startHour}
                                    >
                                      {hourOptions.map((hour) => (
                                        <option key={hour} value={hour}>
                                          {String(hour).padStart(2, '0')}:00
                                        </option>
                                      ))}
                                    </select>
                                  </span>
                                </label>
                                <span className={styles['practicumTimeRangeSeparator']}>~</span>
                                <label className={styles['practicumTimeSelect']}>
                                  <span className={styles['selectWrap']}>
                                    <select
                                      aria-label='종료 시간'
                                      className={styles['select']}
                                      onChange={(event) => {
                                        updatePersonalScheduleEditState((current) => ({
                                          ...current,
                                          endHour: Number(event.target.value),
                                        }));
                                      }}
                                      value={selectedPersonalScheduleEditDraft.endHour}
                                    >
                                      {endHourOptions
                                        .filter(
                                          (hour) =>
                                            hour > selectedPersonalScheduleEditDraft.startHour,
                                        )
                                        .map((hour) => (
                                          <option key={hour} value={hour}>
                                            {String(hour).padStart(2, '0')}:00
                                          </option>
                                        ))}
                                    </select>
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className={styles['adminPracticumToolbar']}>
                            <Button
                              disabled={
                                updatePersonalScheduleMutation.isPending ||
                                !selectedPersonalScheduleEditDraft.title.trim() ||
                                !selectedPersonalScheduleEditDraft.date
                              }
                              onClick={() => {
                                updatePersonalScheduleMutation.mutate({
                                  exceptionId: selectedPersonalScheduleEditDraft.exceptionId,
                                  payload: {
                                    content:
                                      selectedPersonalScheduleEditDraft.content.trim() || null,
                                    endAt: toIsoDateTime(
                                      selectedPersonalScheduleEditDraft.date,
                                      selectedPersonalScheduleEditDraft.endHour,
                                    ),
                                    location: null,
                                    startAt: toIsoDateTime(
                                      selectedPersonalScheduleEditDraft.date,
                                      selectedPersonalScheduleEditDraft.startHour,
                                    ),
                                    title: selectedPersonalScheduleEditDraft.title.trim(),
                                    type: 'ADMIN_SCHEDULE',
                                  },
                                });
                              }}
                              type='button'
                              variant='secondary'
                            >
                              {updatePersonalScheduleMutation.isPending
                                ? '저장 중...'
                                : '수정 저장'}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles['practicumDetailSummary']}>
                            <span>일정시간</span>
                            <strong>
                              {formatTimeRange(
                                selectedCalendarEntry.schedule.startAt,
                                selectedCalendarEntry.schedule.endAt,
                              )}
                            </strong>
                            <span>일정명</span>
                            <strong>{selectedCalendarEntry.schedule.title}</strong>
                            <span>일정내용</span>
                            <strong className={styles['practicumDetailContent']}>
                              {selectedCalendarEntry.schedule.content?.trim() ||
                                '등록된 일정 내용이 없습니다.'}
                            </strong>
                            <span>진행상태</span>
                            <strong>
                              {getPersonalScheduleProgressLabel(selectedCalendarEntry.schedule)}
                            </strong>
                          </div>
                          <div className={styles['practicumModalActionRow']}>
                            <Button
                              disabled={deletePersonalScheduleMutation.isPending}
                              onClick={() => {
                                setPersonalScheduleEditDraft({
                                  ...buildPersonalScheduleFormState(selectedCalendarEntry.schedule),
                                  exceptionId: selectedCalendarEntry.schedule.id,
                                });
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              일정변경
                            </Button>
                            <Button
                              disabled={deletePersonalScheduleMutation.isPending}
                              onClick={() => {
                                deletePersonalScheduleMutation.mutate(
                                  selectedCalendarEntry.schedule.id,
                                );
                              }}
                              size='sm'
                              type='button'
                              variant='danger'
                            >
                              일정취소
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Modal>
              ) : null}

              {moveOfflineScheduleState ? (
                <Modal
                  description={`${moveOfflineScheduleState.detail.programTitle} 오프라인 강의 날짜 변경`}
                  headerLeading={
                    <PracticumModalBackButton
                      label='오프라인 일정 상세로 돌아가기'
                      onClick={() => {
                        setMoveOfflineScheduleState(null);
                      }}
                    />
                  }
                  onClose={closeCalendarModalStack}
                  title='강의일자 변경'
                >
                  <div className={styles['practicumDetailModal']}>
                    <div className={styles['practicumDetailSummary']}>
                      <span>프로그램</span>
                      <strong>{moveOfflineScheduleState.detail.programTitle}</strong>
                      <span>강의</span>
                      <strong>
                        {moveOfflineScheduleState.detail.sectionTitle} &gt;{' '}
                        {moveOfflineScheduleState.detail.lectureTitle}
                      </strong>
                      <span>현재 일정</span>
                      <strong>
                        {formatDateTime(moveOfflineScheduleState.detail.startAt)} ~{' '}
                        {formatDateTime(moveOfflineScheduleState.detail.endAt)}
                      </strong>
                      <span>장소</span>
                      <strong>
                        {moveOfflineScheduleState.detail.location?.trim() || '장소 미정'}
                      </strong>
                    </div>

                    <div className={styles['practicumOperationFields']}>
                      <label className={styles['field']}>
                        <span className={styles['fieldLabel']}>이동 날짜</span>
                        <CalendarIconDateInput
                          onChange={(value) => {
                            setMoveOfflineScheduleState((current) =>
                              current
                                ? {
                                    ...current,
                                    nextDate: value,
                                  }
                                : current,
                            );
                          }}
                          value={moveOfflineScheduleState.nextDate}
                        />
                      </label>
                      <p className={styles['helperText']}>
                        시간, 장소, 비고는 그대로 유지되고 날짜만 변경됩니다.
                      </p>
                    </div>

                    <div className={styles['practicumModalActionRow']}>
                      <Button
                        onClick={() => {
                          setMoveOfflineScheduleState(null);
                        }}
                        size='sm'
                        type='button'
                        variant='secondary'
                      >
                        취소
                      </Button>
                      <Button
                        disabled={
                          moveOfflineScheduleMutation.isPending ||
                          !moveOfflineScheduleState.nextDate ||
                          moveOfflineScheduleState.nextDate ===
                            getSlotDateKey(moveOfflineScheduleState.detail.startAt)
                        }
                        onClick={() => {
                          moveOfflineScheduleMutation.mutate({
                            detail: moveOfflineScheduleState.detail,
                            nextDate: moveOfflineScheduleState.nextDate,
                          });
                        }}
                        size='sm'
                        type='button'
                      >
                        변경 저장
                      </Button>
                    </div>
                  </div>
                </Modal>
              ) : null}

              {moveReservationState ? (
                <Modal
                  description={`${moveReservationState.reservations
                    .map((reservation) => reservation.userName)
                    .join(', ')} 예약 이동`}
                  headerLeading={
                    <PracticumModalBackButton
                      label={moveReservationState.returnLabel}
                      onClick={() => {
                        setMoveReservationState(null);
                      }}
                    />
                  }
                  onClose={closeCalendarModalStack}
                  title='예약일자 변경'
                >
                  <div className={styles['practicumDetailModal']}>
                    <div className={styles['practicumDetailSummary']}>
                      <span>선택 예약자</span>
                      <strong>
                        {moveReservationState.reservations
                          .map((reservation) => reservation.userName)
                          .join(', ')}
                      </strong>
                      <span>선택 인원</span>
                      <strong>{String(moveReservationState.reservations.length)}명</strong>
                      <span>현재 일정</span>
                      <strong>
                        {formatDateTime(moveReservationState.reservations[0]?.slotStartAt ?? null)}{' '}
                        ~ {formatDateTime(moveReservationState.reservations[0]?.slotEndAt ?? null)}
                      </strong>
                      <span>강의명</span>
                      <strong>{moveReservationState.reservations[0]?.lectureTitle ?? '-'}</strong>
                    </div>

                    <p className={styles['helperText']}>
                      예약취소는 예약 자체를 취소해 자리를 다시 열고, 불참처리는 예약 기록을 남긴 채
                      수강생을 불참 상태로 표시합니다.
                    </p>

                    <div className={styles['practicumMoveCalendar']}>
                      <div className={styles['practicumMoveCalendarHeader']}>
                        <Button
                          onClick={() => {
                            setMoveReservationState((current) =>
                              current
                                ? {
                                    ...current,
                                    monthValue: shiftMonthValue(current.monthValue, -1),
                                  }
                                : current,
                            );
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          이전 달
                        </Button>
                        <strong>{formatMonthLabel(moveReservationState.monthValue)}</strong>
                        <Button
                          onClick={() => {
                            setMoveReservationState((current) =>
                              current
                                ? {
                                    ...current,
                                    monthValue: shiftMonthValue(current.monthValue, 1),
                                  }
                                : current,
                            );
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          다음 달
                        </Button>
                      </div>
                      {moveReservationOptionsQuery.isPending ? (
                        <p className={styles['helperText']}>
                          예약 가능한 날짜를 불러오는 중입니다.
                        </p>
                      ) : (
                        <>
                          <div className={styles['practicumCalendarWeekdays']}>
                            {calendarWeekdays.map((weekday) => (
                              <span className={styles['practicumCalendarWeekday']} key={weekday}>
                                {weekday}
                              </span>
                            ))}
                          </div>
                          <div className={styles['practicumMoveCalendarGrid']}>
                            {moveReservationCalendarCells.map((cell, index) => {
                              if (!cell.date) {
                                return (
                                  <span
                                    className={styles['practicumMoveCalendarEmptyCell']}
                                    key={`move-empty-${String(index)}`}
                                  />
                                );
                              }

                              const availableCount =
                                moveReservationOptionsByDate.get(cell.date)?.length ?? 0;

                              return (
                                <button
                                  className={styles['practicumMoveCalendarDay']}
                                  data-has-items={availableCount > 0}
                                  data-selected={cell.date === moveReservationState.selectedDate}
                                  key={`move-date-${cell.date}`}
                                  onClick={() => {
                                    setMoveReservationState((current) =>
                                      current
                                        ? { ...current, selectedDate: cell.date ?? '' }
                                        : current,
                                    );
                                  }}
                                  type='button'
                                >
                                  <strong>{Number(cell.date.slice(-2))}</strong>
                                  <span>
                                    {availableCount > 0
                                      ? `${String(availableCount)}개 예약 가능`
                                      : '예약불가'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {selectedMoveReservationOptions.length ? (
                      <div className={styles['practicumMoveTimePicker']}>
                        <h4 className={styles['practicumMoveTimeTitle']}>예약 가능 시간</h4>
                        <div className={styles['practicumMoveTimeGrid']}>
                          {selectedMoveReservationOptions.map((item) => (
                            <button
                              className={styles['practicumMoveTimeButton']}
                              disabled={moveReservationMutation.isPending}
                              key={`move-slot-${item.startAt}`}
                              onClick={() => {
                                moveReservationMutation.mutate({
                                  reservationIds: moveReservationState.reservations.map(
                                    (reservation) => reservation.reservationId,
                                  ),
                                  startAt: item.startAt,
                                });
                              }}
                              type='button'
                            >
                              <span>{formatTimeRange(item.startAt, item.endAt)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : !moveReservationOptionsQuery.isPending ? (
                      <p className={styles['helperText']}>
                        선택한 날짜에 변경 가능한 예약 시간이 없습니다.
                      </p>
                    ) : null}
                  </div>
                </Modal>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AdminPracticumSection;
