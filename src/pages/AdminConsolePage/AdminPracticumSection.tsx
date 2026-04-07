import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applyAdminPracticumOperatingHourRule,
  cancelAdminPracticumReservation,
  createAdminPracticumOperationException,
  fetchAdminPracticumOfflineSchedules,
  fetchAdminPracticumOperatingHours,
  fetchAdminPracticumOperationExceptions,
  fetchAdminPracticumSlotManagement,
  syncAdminPracticumDailyOperation,
  updateAdminPracticumSlotStatuses,
} from '@/api/adminPracticum';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminPracticumDailyOperationPayload,
  AdminPracticumOfflineScheduleOccurrence,
  AdminPracticumOperatingHour,
  AdminPracticumOperatingHourApplyPayload,
  AdminPracticumOperationException,
  AdminPracticumOperationExceptionPayload,
  AdminPracticumReservationItem,
  AdminPracticumSearchCategory,
  AdminPracticumSlotManagementItem,
  PracticumSlotStatus,
} from '@/types/practicum';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatTimeRange,
  getMonthBounds,
  getSlotDateKey,
  todayDateString,
  toMonthValue,
} from '@/utils/practicumCalendar';

import styles from './AdminConsolePage.module.scss';

type PracticumStatusFilter = 'ALL' | PracticumSlotStatus;
type PracticumGroupStatus = PracticumSlotStatus | 'MIXED';

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

const toIsoDateTime = (dateValue: string, hour: number): string => {
  return new Date(`${dateValue}T${String(hour).padStart(2, '0')}:00:00+09:00`).toISOString();
};

interface PracticumTimeReservationRow extends AdminPracticumReservationItem {
  lectureTitle: string;
  programTitle: string;
  sectionTitle: string;
}

interface PracticumTimeGroup {
  endAt: string;
  key: string;
  location: string | null;
  maxCapacity: number;
  reservations: PracticumTimeReservationRow[];
  reservedCount: number;
  slotIds: number[];
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
  date: string;
  endHour: number;
  startHour: number;
}

interface DailyOperationFormState {
  blockedHours: number[];
  date: string;
  endHour: number;
  startHour: number;
}

interface PersonalScheduleFormState {
  date: string;
  endHour: number;
  startHour: number;
  title: string;
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
        slotIds: sortedItems.map((item) => item.slotId),
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
        blockedHours: [],
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

const buildCalendarEntryLabel = (entry: PracticumCalendarEntry): string => {
  if (entry.kind === 'ADMIN_SCHEDULE') {
    return entry.label;
  }
  if (entry.kind === 'OFFLINE') {
    return `${formatTimeRange(entry.startAt, entry.endAt)} 오프라인`;
  }
  return `${formatTimeRange(entry.startAt, entry.endAt)} 실습`;
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
  const [operationDraft, setOperationDraft] = useState<OperationFormState | null>(null);
  const [dailyOperationDraft, setDailyOperationDraft] = useState<DailyOperationFormState | null>(
    null,
  );
  const [personalScheduleDraft, setPersonalScheduleDraft] =
    useState<PersonalScheduleFormState | null>(null);
  const deferredKeyword = useDeferredValue(keyword).trim();

  const monthBounds = useMemo(() => getMonthBounds(monthValue), [monthValue]);
  const calendarCells = useMemo(() => buildCalendarCells(monthValue), [monthValue]);
  const resolvedSelectedDate = selectedDate.startsWith(monthValue)
    ? selectedDate
    : monthBounds.from;

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
    return groupSelectedDateItems(selectedDateItems).filter((group) => group.reservedCount > 0);
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
    ).filter((group) => group.reservedCount > 0);
  }, [selectedDateOverviewDate, slotItems]);

  const overviewDatePersonalSchedules = useMemo(() => {
    if (!selectedDateOverviewDate) {
      return [];
    }
    return (operationExceptionsQuery.data ?? []).filter((item) =>
      isExceptionOnDate(item, selectedDateOverviewDate),
    );
  }, [operationExceptionsQuery.data, selectedDateOverviewDate]);

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
        .filter((group) => group.reservedCount > 0)
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

  const operationState =
    operationDraft?.date === resolvedSelectedDate
      ? operationDraft
      : {
          date: resolvedSelectedDate,
          endHour: selectedDateOperatingHour?.openToHour ?? DEFAULT_OPERATION_STATE.endHour,
          startHour: selectedDateOperatingHour?.openFromHour ?? DEFAULT_OPERATION_STATE.startHour,
        };

  const updateOperationState = (updater: (current: OperationFormState) => OperationFormState) => {
    setOperationDraft((current) => {
      const baseState =
        current?.date === resolvedSelectedDate
          ? current
          : {
              date: resolvedSelectedDate,
              endHour: selectedDateOperatingHour?.openToHour ?? DEFAULT_OPERATION_STATE.endHour,
              startHour:
                selectedDateOperatingHour?.openFromHour ?? DEFAULT_OPERATION_STATE.startHour,
            };
      return {
        ...updater(baseState),
        date: resolvedSelectedDate,
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

  const updatePracticumTimeGroupStatusMutation = useMutation({
    mutationFn: async ({ slotIds, status }: { slotIds: number[]; status: PracticumSlotStatus }) => {
      await updateAdminPracticumSlotStatuses(slotIds, status);
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '선택한 시간대 상태를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      setOperationDraft(null);
      setDailyOperationDraft(null);
      showToast({
        message:
          variables.status === 'BLOCKED'
            ? '선택한 시간대를 예약 제외로 설정했습니다.'
            : '선택한 시간대를 예약 가능으로 변경했습니다.',
        variant: 'success',
      });
    },
  });

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
      setOperationDraft(null);
      setDailyOperationDraft(null);
      showToast({
        message: '실습 예약을 취소했습니다.',
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
    mutationFn: (payload: AdminPracticumOperatingHourApplyPayload) =>
      applyAdminPracticumOperatingHourRule(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '운영시간 변경을 반영하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumOperatingHours'] });
      setOperationDraft(null);
      setDailyOperationDraft(null);
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

  return (
    <section className={styles['workspace']}>
      <div className={styles['stackList']}>
        <section className={styles['panelWide']}>
          <div className={styles['panelToolbar']}>
            <div className={styles['adminInlineFilters']}>
              <label className={`${styles['field']} ${styles['adminInlineFilterField']}`}>
                <span className={styles['fieldLabel']}>조회 월</span>
                <input
                  className={styles['searchInput']}
                  onChange={(event) => {
                    const nextMonthValue = event.target.value;
                    setMonthValue(nextMonthValue);
                    if (!resolvedSelectedDate.startsWith(nextMonthValue)) {
                      setSelectedDate(getMonthBounds(nextMonthValue).from);
                    }
                  }}
                  type='month'
                  value={monthValue}
                />
              </label>

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

              <label className={`${styles['field']} ${styles['adminInlineSearchField']}`}>
                <span className={styles['fieldLabel']}>검색</span>
                <input
                  aria-label='일정관리 검색'
                  className={styles['searchInput']}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                  }}
                  placeholder={practicumSearchPlaceholder[searchCategory]}
                  type='search'
                  value={keyword}
                />
              </label>
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
                      aria-pressed={isSelected}
                      className={styles['practicumCalendarDay']}
                      data-has-items={hasItems}
                      data-selected={isSelected}
                      key={cellDate}
                      onClick={() => {
                        setSelectedDate(cellDate);
                        setSelectedDateOverviewDate(cellDate);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedDate(cellDate);
                          setSelectedDateOverviewDate(cellDate);
                        }
                      }}
                      role='button'
                      tabIndex={0}
                    >
                      <div className={styles['practicumCalendarDayHeader']}>
                        <span className={styles['practicumCalendarDayNumber']}>
                          {Number(cellDate.slice(-2))}
                        </span>
                        <span className={styles['practicumCalendarDayCount']}>
                          {hasItems ? `일정 ${String(dayCount)}건` : ''}
                        </span>
                      </div>
                      <div className={styles['practicumCalendarPreviewList']}>
                        {previewEntries.length ? (
                          previewEntries.map((entry) => (
                            <button
                              className={styles['practicumCalendarPreviewButton']}
                              key={entry.key}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedDate(cellDate);
                                setSelectedDateOverviewDate(null);
                                setSelectedCalendarEntry(entry);
                              }}
                              type='button'
                            >
                              <span className={styles['practicumCalendarPreviewItem']}>
                                {buildCalendarEntryLabel(entry)}
                              </span>
                            </button>
                          ))
                        ) : (
                          <span className={styles['practicumCalendarEmptyText']}>일정 없음</span>
                        )}
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
                      관리자 개인일정 추가
                    </Button>
                  </div>
                  <h3
                    className={styles['panelTitle']}
                  >{`${formatDate(resolvedSelectedDate)} ~`}</h3>
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

                    <div className={styles['adminPracticumToolbar']}>
                      <Button
                        disabled={applyOperatingHoursMutation.isPending}
                        onClick={() => {
                          applyOperatingHoursMutation.mutate({
                            blockedHours: [],
                            date: resolvedSelectedDate,
                            location: null,
                            openFromHour: operationState.startHour,
                            openToHour: operationState.endHour,
                          });
                        }}
                        type='button'
                      >
                        {applyOperatingHoursMutation.isPending ? '변경 중...' : '운영시간 변경'}
                      </Button>
                    </div>

                    <div className={styles['stackListCompact']}>
                      <p className={styles['helperText']}>
                        선택한 요일의 운영시간을 앞으로 1년 동안 한 번에 바꿉니다.
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
                  <div className={styles['practicumOperationFields']}>
                    <label className={styles['field']}>
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
                    <p className={styles['helperText']}>등록된 관리자 개인일정이 없습니다.</p>
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
                            {group.reservedCount > 0 ? (
                              <div className={styles['adminPracticumMeta']}>
                                <span>
                                  예약 {String(group.reservedCount)}/{String(group.maxCapacity)}명
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className={styles['adminPracticumActions']}>
                            {renderSlotStatusBadge(group.slotStatus)}
                            <Button
                              onClick={() => {
                                updatePracticumTimeGroupStatusMutation.mutate({
                                  slotIds: group.slotIds,
                                  status: group.slotStatus === 'BLOCKED' ? 'OPEN' : 'BLOCKED',
                                });
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              {group.slotStatus === 'BLOCKED' ? '예약 가능' : '예약 제외'}
                            </Button>
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
                                  {reservation.lectureCompleted ? (
                                    <span className={styles['badgeSuccess']}>강의 완료</span>
                                  ) : (
                                    <span className={styles['badgeDanger']}>강의 미완료</span>
                                  )}
                                  <span className={styles['badge']}>
                                    {reservation.status === 'ACTIVE' ? '예약중' : '취소'}
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

              {selectedDateOverviewDate ? (
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
                        <h4 className={styles['practicumDayOverviewTitle']}>오프라인 강좌</h4>
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
                                setSelectedDateOverviewDate(null);
                                setSelectedCalendarEntry({
                                  date: selectedDateOverviewDate,
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
                        <p className={styles['helperText']}>등록된 오프라인 강좌가 없습니다.</p>
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
                                setSelectedDateOverviewDate(null);
                                setSelectedCalendarEntry({
                                  date: selectedDateOverviewDate,
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
                                {group.reservedCount > 0 ? (
                                  <span className={styles['cellSecondary']}>
                                    예약 {String(group.reservedCount)}/{String(group.maxCapacity)}명
                                    {group.reservations.filter(
                                      (reservation) => reservation.status === 'ACTIVE',
                                    ).length
                                      ? ` · ${group.reservations
                                          .filter((reservation) => reservation.status === 'ACTIVE')
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
                        <h4 className={styles['practicumDayOverviewTitle']}>관리자 개인일정</h4>
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
                                setSelectedDateOverviewDate(null);
                                setSelectedCalendarEntry({
                                  date: selectedDateOverviewDate,
                                  endAt: item.endAt,
                                  key: `schedule:${String(item.id)}:${selectedDateOverviewDate}`,
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
                        <p className={styles['helperText']}>등록된 관리자 개인일정이 없습니다.</p>
                      )}
                    </section>
                  </div>
                </Modal>
              ) : null}

              {selectedCalendarEntry ? (
                <Modal
                  description={
                    selectedCalendarEntry.kind === 'PRACTICUM'
                      ? `${formatDateTime(selectedCalendarEntry.startAt)} ~ ${formatDateTime(selectedCalendarEntry.endAt)}`
                      : selectedCalendarEntry.kind === 'OFFLINE'
                        ? `${formatDateTime(selectedCalendarEntry.offlineSchedule.startAt)} ~ ${formatDateTime(selectedCalendarEntry.offlineSchedule.endAt)}`
                        : `${formatDateTime(selectedCalendarEntry.schedule.startAt)} ~ ${formatDateTime(selectedCalendarEntry.schedule.endAt)}`
                  }
                  onClose={() => {
                    setSelectedCalendarEntry(null);
                  }}
                  title={
                    selectedCalendarEntry.kind === 'PRACTICUM'
                      ? '실습 일정 상세'
                      : selectedCalendarEntry.kind === 'OFFLINE'
                        ? '오프라인 일정 상세'
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
                            <span>예약</span>
                            <strong>
                              {String(selectedCalendarEntry.group.reservedCount)}/
                              {String(selectedCalendarEntry.group.maxCapacity)}명
                            </strong>
                          </>
                        ) : null}
                      </div>

                      {selectedCalendarEntry.group.reservations.filter(
                        (reservation) => reservation.status === 'ACTIVE',
                      ).length ? (
                        <div className={styles['practicumDetailReservationList']}>
                          {selectedCalendarEntry.group.reservations
                            .filter((reservation) => reservation.status === 'ACTIVE')
                            .map((reservation) => (
                              <div
                                className={styles['practicumDetailReservationItem']}
                                key={reservation.reservationId}
                              >
                                <strong>{reservation.userName}</strong>
                                <span>{reservation.loginId}</span>
                                <span>{reservation.phoneNumber}</span>
                                <span>
                                  {reservation.programTitle} &gt; {reservation.lectureTitle}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className={styles['helperText']}>예약된 수강생이 없습니다.</p>
                      )}
                    </div>
                  ) : selectedCalendarEntry.kind === 'OFFLINE' ? (
                    <div className={styles['practicumDetailModal']}>
                      <div className={styles['practicumDetailSummary']}>
                        <span>프로그램</span>
                        <strong>{selectedCalendarEntry.offlineSchedule.programTitle}</strong>
                        <span>강의</span>
                        <strong>
                          {selectedCalendarEntry.offlineSchedule.sectionTitle} &gt;{' '}
                          {selectedCalendarEntry.offlineSchedule.lectureTitle}
                        </strong>
                        <span>시간</span>
                        <strong>
                          {formatTimeRange(
                            selectedCalendarEntry.offlineSchedule.startAt,
                            selectedCalendarEntry.offlineSchedule.endAt,
                          )}
                        </strong>
                        <span>장소</span>
                        <strong>
                          {selectedCalendarEntry.offlineSchedule.location?.trim() || '장소 미정'}
                        </strong>
                        <span>수강생</span>
                        <strong>
                          {String(selectedCalendarEntry.offlineSchedule.activeEnrollmentCount)}명
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className={styles['practicumDetailModal']}>
                      <div className={styles['practicumDetailSummary']}>
                        <span>일정명</span>
                        <strong>{selectedCalendarEntry.schedule.title}</strong>
                        <span>시간</span>
                        <strong>
                          {formatTimeRange(
                            selectedCalendarEntry.schedule.startAt,
                            selectedCalendarEntry.schedule.endAt,
                          )}
                        </strong>
                        <span>유형</span>
                        <strong>
                          {practicumExceptionTypeLabels[selectedCalendarEntry.schedule.type]}
                        </strong>
                      </div>
                    </div>
                  )}
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
