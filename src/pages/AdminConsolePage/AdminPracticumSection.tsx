import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelAdminPracticumReservation,
  fetchAdminPracticumSlotManagement,
  syncAdminPracticumDailyOperation,
  updateAdminPracticumSlotStatus,
} from '@/api/adminPracticum';
import Button from '@/components/ui/Button/Button';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminPracticumDailyOperationPayload,
  AdminPracticumSlotManagementItem,
  AdminPracticumReservationItem,
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

const practicumStatusLabels: Record<PracticumStatusFilter, string> = {
  ALL: '전체',
  BLOCKED: '예약 제외',
  CLOSED: '운영 종료',
  OPEN: '예약 가능',
};

const hourOptions = Array.from({ length: 24 }, (_, index) => index);
const endHourOptions = Array.from({ length: 24 }, (_, index) => index + 1);
const DEFAULT_OPERATION_STATE = {
  blockedHours: [],
  endHour: 18,
  location: '',
  startHour: 9,
} satisfies {
  blockedHours: number[];
  endHour: number;
  location: string;
  startHour: number;
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

interface PracticumTimeReservationRow extends AdminPracticumReservationItem {
  lectureTitle: string;
  location: string | null;
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

interface OperationFormState {
  blockedHours: number[];
  date: string;
  endHour: number;
  location: string;
  startHour: number;
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
            location: item.location,
            programTitle: item.programTitle,
            sectionTitle: item.sectionTitle,
          })),
        )
        .sort((left, right) => Date.parse(left.reservedAt) - Date.parse(right.reservedAt));
      return {
        endAt: sortedItems[0].endAt,
        key,
        location: sortedItems.find((item) => item.location?.trim())?.location?.trim() ?? null,
        maxCapacity: sortedItems[0].maxCapacity,
        reservations: reservationRows,
        reservedCount: sortedItems[0].reservedCount,
        slotIds: sortedItems.map((item) => item.slotId),
        slotStatus: deriveGroupStatus(sortedItems),
        startAt: sortedItems[0].startAt,
      } satisfies PracticumTimeGroup;
    })
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
};

const deriveOperationState = (
  items: AdminPracticumSlotManagementItem[],
): {
  blockedHours: number[];
  endHour: number;
  location: string;
  startHour: number;
} | null => {
  if (!items.length) {
    return null;
  }

  const sortedItems = [...items].sort((left, right) => left.startAt.localeCompare(right.startAt));
  const startHours = sortedItems.map((item) => new Date(item.startAt).getHours());
  const endHours = sortedItems.map((item) => new Date(item.endAt).getHours());
  const blocked = sortedItems
    .filter((item) => item.slotStatus === 'BLOCKED')
    .map((item) => new Date(item.startAt).getHours())
    .sort((left, right) => left - right);
  const firstLocation = sortedItems.find((item) => item.location?.trim())?.location?.trim() ?? '';

  return {
    blockedHours: blocked,
    endHour: Math.max(...endHours),
    location: firstLocation,
    startHour: Math.min(...startHours),
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

const AdminPracticumSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  const [monthValue, setMonthValue] = useState(() => toMonthValue(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [statusFilter, setStatusFilter] = useState<PracticumStatusFilter>('ALL');
  const [keyword, setKeyword] = useState('');
  const [operationDraft, setOperationDraft] = useState<OperationFormState | null>(null);
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
        statusFilter,
      ),
    queryKey: [
      'adminPracticumManagement',
      monthBounds.from,
      monthBounds.to,
      deferredKeyword,
      statusFilter,
    ],
    staleTime: 15 * 1000,
  });

  const slotItems = useMemo(
    () => practicumManagementQuery.data ?? [],
    [practicumManagementQuery.data],
  );

  const countsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of slotItems) {
      const dateKey = getSlotDateKey(item.startAt);
      const activeReservationCount = item.reservations.filter(
        (reservation) => reservation.status === 'ACTIVE',
      ).length;
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + activeReservationCount);
    }
    return counts;
  }, [slotItems]);

  const selectedDateItems = useMemo(() => {
    return slotItems.filter((item) => getSlotDateKey(item.startAt) === resolvedSelectedDate);
  }, [resolvedSelectedDate, slotItems]);

  const selectedDateGroups = useMemo(() => {
    return groupSelectedDateItems(selectedDateItems);
  }, [selectedDateItems]);

  const baseOperationState = useMemo(() => {
    return deriveOperationState(selectedDateItems) ?? DEFAULT_OPERATION_STATE;
  }, [selectedDateItems]);

  const operationState =
    operationDraft?.date === resolvedSelectedDate
      ? operationDraft
      : {
          date: resolvedSelectedDate,
          ...baseOperationState,
        };

  const updateOperationState = (updater: (current: OperationFormState) => OperationFormState) => {
    setOperationDraft((current) => {
      const baseState =
        current?.date === resolvedSelectedDate
          ? current
          : {
              date: resolvedSelectedDate,
              ...baseOperationState,
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

  const updatePracticumTimeGroupStatusMutation = useMutation({
    mutationFn: async ({ slotIds, status }: { slotIds: number[]; status: PracticumSlotStatus }) => {
      await Promise.all(slotIds.map((slotId) => updateAdminPracticumSlotStatus(slotId, status)));
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
        message: error instanceof Error ? error.message : '실습 운영 시간을 반영하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminPracticumManagement'] });
      setOperationDraft(null);
      showToast({
        message: '선택 날짜 운영 시간을 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const visibleBlockHours = useMemo(() => {
    return hourOptions.filter(
      (hour) => hour >= operationState.startHour && hour < operationState.endHour,
    );
  }, [operationState.endHour, operationState.startHour]);

  return (
    <section className={styles['workspace']}>
      <div className={styles['stackList']}>
        <section className={styles['panelWide']}>
          <div className={styles['panelToolbar']}>
            <div>
              <h2 className={styles['panelTitle']}>실습일정관리</h2>
              <p className={styles['metaText']}>
                하이브리드 실습 시간을 달력 기준으로 보고, 예약 제외 시간과 예약자 상태를
                운영합니다.
              </p>
            </div>

            <div className={styles['adminInlineFilters']}>
              <label className={styles['field']}>
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

              <label className={styles['field']}>
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

              <label className={styles['searchField']}>
                <span className={styles['searchLabel']}>실습 검색</span>
                <input
                  aria-label='실습일정 검색'
                  className={styles['searchInput']}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                  }}
                  placeholder='프로그램명, 강의명, 장소 검색'
                  type='search'
                  value={keyword}
                />
              </label>
            </div>
          </div>

          <div className={styles['practicumCalendarLayout']}>
            <div className={styles['practicumCalendarPanel']}>
              <div className={styles['practicumCalendarMonthHeader']}>
                <strong className={styles['practicumCalendarMonthTitle']}>
                  {formatMonthLabel(monthValue)}
                </strong>
                <span className={styles['metaText']}>
                  등록된 실습 시간과 예약 현황을 날짜별로 확인합니다.
                </span>
              </div>

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

                  const dayCount = countsByDate.get(cellDate) ?? 0;
                  const isSelected = cellDate === resolvedSelectedDate;
                  const hasItems = dayCount > 0;
                  const daySlots = slotItems
                    .filter((item) => getSlotDateKey(item.startAt) === cellDate)
                    .slice(0, 2);

                  return (
                    <button
                      className={styles['practicumCalendarDay']}
                      data-has-items={hasItems}
                      data-selected={isSelected}
                      key={cellDate}
                      onClick={() => {
                        setSelectedDate(cellDate);
                      }}
                      type='button'
                    >
                      <div className={styles['practicumCalendarDayHeader']}>
                        <span className={styles['practicumCalendarDayNumber']}>
                          {Number(cellDate.slice(-2))}
                        </span>
                        <span className={styles['practicumCalendarDayCount']}>
                          {hasItems ? `예약 ${String(dayCount)}건` : ''}
                        </span>
                      </div>
                      <div className={styles['practicumCalendarPreviewList']}>
                        {daySlots.length ? (
                          daySlots.map((slot) => (
                            <span
                              className={styles['practicumCalendarPreviewItem']}
                              key={slot.slotId}
                            >
                              {formatTimeRange(slot.startAt, slot.endAt)}
                            </span>
                          ))
                        ) : (
                          <span className={styles['practicumCalendarEmptyText']}>일정 없음</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles['practicumCalendarDetail']}>
              <div className={styles['panelHeader']}>
                <h3 className={styles['panelTitle']}>
                  선택 날짜 - {formatDate(resolvedSelectedDate)}
                </h3>
                <p className={styles['metaText']}>
                  시간별 슬롯, 예약자, 강의 완료 여부와 퀴즈 응시 여부를 같이 확인합니다.
                </p>
              </div>

              <section className={styles['practicumOperationPanel']}>
                <div className={styles['panelHeader']}>
                  <h4 className={styles['panelTitle']}>운영 시간 설정</h4>
                  <p className={styles['metaText']}>
                    예: 09-18 운영, 10-12 예약 제외면 10시와 11시를 예약 제외로 선택합니다.
                  </p>
                </div>

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

                  <label className={styles['field']}>
                    <span className={styles['fieldLabel']}>장소</span>
                    <input
                      className={styles['searchInput']}
                      onChange={(event) => {
                        updateOperationState((current) => ({
                          ...current,
                          location: event.target.value,
                        }));
                      }}
                      placeholder='예: 서울 강의실 A'
                      type='text'
                      value={operationState.location}
                    />
                  </label>
                </div>

                <div className={styles['practicumBlockedHours']}>
                  {visibleBlockHours.map((hour) => {
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

                <div className={styles['actionRow']}>
                  <Button
                    disabled={syncDailyOperationMutation.isPending}
                    onClick={() => {
                      syncDailyOperationMutation.mutate({
                        date: resolvedSelectedDate,
                        openFromHour: operationState.startHour,
                        openToHour: operationState.endHour,
                        blockedHours: operationState.blockedHours,
                        location: operationState.location.trim()
                          ? operationState.location.trim()
                          : null,
                      });
                    }}
                    type='button'
                  >
                    {syncDailyOperationMutation.isPending ? '반영 중...' : '선택 날짜 운영 반영'}
                  </Button>
                </div>
              </section>

              {practicumManagementQuery.isPending ? (
                <p className={styles['helperText']}>실습 일정 현황을 불러오는 중입니다.</p>
              ) : null}
              {practicumManagementQuery.isError ? (
                <p className={styles['helperText']}>
                  {practicumManagementQuery.error instanceof Error
                    ? practicumManagementQuery.error.message
                    : '실습 일정 현황을 불러오지 못했습니다.'}
                </p>
              ) : null}

              {!practicumManagementQuery.isPending && !practicumManagementQuery.isError ? (
                selectedDateGroups.length ? (
                  <div className={styles['adminPracticumList']}>
                    {selectedDateGroups.map((group) => (
                      <article className={styles['adminPracticumCard']} key={group.key}>
                        <div className={styles['adminPracticumHeader']}>
                          <div className={styles['cellStack']}>
                            <strong className={styles['itemTitle']}>
                              {formatTimeRange(group.startAt, group.endAt)}
                            </strong>
                            <div className={styles['adminPracticumMeta']}>
                              <span>{group.location?.trim() || '장소 미정'}</span>
                              <span>
                                예약 {String(group.reservedCount)}/{String(group.maxCapacity)}명
                              </span>
                            </div>
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
                                    <button
                                      className={styles['tableActionButtonDanger']}
                                      onClick={() => {
                                        cancelReservationMutation.mutate(reservation.reservationId);
                                      }}
                                      type='button'
                                    >
                                      예약 취소
                                    </button>
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
                  <p className={styles['helperText']}>선택한 날짜에 등록된 실습 슬롯이 없습니다.</p>
                )
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AdminPracticumSection;
