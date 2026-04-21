import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { cancelMyLecturePracticum, reserveMyLecturePracticum } from '@/api/mypage';
import Button from '@/components/ui/Button/Button';
import {
  myEnrollmentPracticumQueryKey,
  useMyEnrollmentPracticumQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type {
  EnrollmentPracticumLecture,
  PracticumSlot,
  PracticumSlotStatus,
} from '@/types/practicum';
import { classNames } from '@/utils/classNames';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  formatTimeRange,
  getSlotDateKey,
  toDateInputValue,
  toMonthValue,
} from '@/utils/practicumCalendar';

import styles from './MyEnrollmentPracticumPage.module.scss';

const EMPTY_LECTURES: EnrollmentPracticumLecture[] = [];

interface CalendarPreviewItem {
  label: string;
  tone: 'open' | 'reserved';
}

interface EnrollmentSelectionState {
  enrollmentId: number | null;
  monthValue: string | null;
  selectedDate: string | null;
}

const formatDateRange = (startValue?: string | null, endValue?: string | null) => {
  const startDate = startValue ? new Date(startValue) : null;
  const endDate = endValue ? new Date(endValue) : null;

  const format = (value: Date | null) => {
    if (!value || Number.isNaN(value.getTime())) {
      return '-';
    }

    return value.toLocaleDateString('ko-KR');
  };

  if (!startDate && !endDate) {
    return '-';
  }

  return `${format(startDate)} ~ ${endDate ? format(endDate) : '기간 제한 없음'}`;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    weekday: 'short',
  });
};

const slotStatusLabel: Record<PracticumSlotStatus, string> = {
  BLOCKED: '예약 불가',
  CLOSED: '운영 종료',
  OPEN: '예약 가능',
};

const isPracticumSlotInPast = (slot: PracticumSlot) => Date.parse(slot.startAt) < Date.now();

const isPracticumSlotReservable = (slot: PracticumSlot) =>
  slot.slotStatus === 'OPEN' && !slot.full && !isPracticumSlotInPast(slot);

const getDefaultMonthValue = (lectures: EnrollmentPracticumLecture[]) => {
  const candidates = lectures
    .flatMap((lecture) => {
      const slotDates = lecture.slots.map((slot) => slot.startAt);
      return lecture.currentReservation
        ? [lecture.currentReservation.startAt, ...slotDates]
        : slotDates;
    })
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return toMonthValue(candidates[0] ?? new Date());
};

const getDefaultSelectedDate = (lectures: EnrollmentPracticumLecture[]) => {
  const firstSlot = lectures
    .flatMap((lecture) => lecture.slots)
    .filter((slot) => isPracticumSlotReservable(slot))
    .map((slot) => slot.startAt)
    .sort()[0];

  return firstSlot ? getSlotDateKey(firstSlot) : toDateInputValue(new Date());
};

const MyEnrollmentPracticumPage = () => {
  const params = useParams<{ enrollmentId: string }>();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const resolvedEnrollmentId = Number(params.enrollmentId ?? '');
  const isValidEnrollmentId = Number.isInteger(resolvedEnrollmentId) && resolvedEnrollmentId > 0;
  const practicumQuery = useMyEnrollmentPracticumQuery(
    isValidEnrollmentId ? resolvedEnrollmentId : null,
    isValidEnrollmentId,
  );
  const overview = practicumQuery.data;
  const lectures = overview?.lectures ?? EMPTY_LECTURES;
  const [selectionState, setSelectionState] = useState<EnrollmentSelectionState>({
    enrollmentId: null,
    monthValue: null,
    selectedDate: null,
  });
  const defaultMonthValue = overview ? getDefaultMonthValue(lectures) : toMonthValue(new Date());
  const defaultSelectedDate = overview
    ? getDefaultSelectedDate(lectures)
    : toDateInputValue(new Date());
  const usesSelectionState = selectionState.enrollmentId === resolvedEnrollmentId;
  const monthValue =
    usesSelectionState && selectionState.monthValue ? selectionState.monthValue : defaultMonthValue;
  const selectedDateCandidate =
    usesSelectionState && selectionState.selectedDate
      ? selectionState.selectedDate
      : defaultSelectedDate;
  const selectedDate = selectedDateCandidate.startsWith(monthValue)
    ? selectedDateCandidate
    : `${monthValue}-01`;

  const calendarCells = useMemo(() => buildCalendarCells(monthValue), [monthValue]);

  const lectureSlotsByDate = useMemo(() => {
    const grouped = new Map<string, EnrollmentPracticumLecture[]>();

    lectures.forEach((lecture) => {
      const dateKeys = new Set(lecture.slots.map((slot) => getSlotDateKey(slot.startAt)));
      if (lecture.currentReservation) {
        dateKeys.add(getSlotDateKey(lecture.currentReservation.startAt));
      }

      dateKeys.forEach((dateKey) => {
        const current = grouped.get(dateKey);
        if (current) {
          current.push(lecture);
        } else {
          grouped.set(dateKey, [lecture]);
        }
      });
    });

    return grouped;
  }, [lectures]);

  const countsByDate = useMemo(() => {
    const counts = new Map<string, number>();

    lectures.forEach((lecture) => {
      lecture.slots.forEach((slot) => {
        if (!isPracticumSlotReservable(slot)) {
          return;
        }

        const dateKey = getSlotDateKey(slot.startAt);
        counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
      });
    });

    return counts;
  }, [lectures]);

  const reservationsByDate = useMemo(() => {
    const counts = new Map<string, number>();

    lectures.forEach((lecture) => {
      if (!lecture.currentReservation) {
        return;
      }

      const dateKey = getSlotDateKey(lecture.currentReservation.startAt);
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    });

    return counts;
  }, [lectures]);

  const previewByDate = useMemo(() => {
    const previews = new Map<string, CalendarPreviewItem[]>();

    lectures.forEach((lecture) => {
      if (!lecture.currentReservation) {
        return;
      }

      const dateKey = getSlotDateKey(lecture.currentReservation.startAt);
      previews.set(dateKey, [
        {
          label: formatTimeRange(
            lecture.currentReservation.startAt,
            lecture.currentReservation.endAt,
          ),
          tone: 'reserved',
        },
      ]);
    });

    return previews;
  }, [lectures]);

  const currentReservations = useMemo(() => {
    return lectures
      .flatMap((lecture) => {
        if (!lecture.currentReservation) {
          return [];
        }

        return [
          {
            endAt: lecture.currentReservation.endAt,
            lectureId: lecture.lectureId,
            lectureTitle: lecture.lectureTitle,
            location: lecture.currentReservation.location || null,
            reservationId: lecture.currentReservation.id,
            sectionTitle: lecture.sectionTitle,
            startAt: lecture.currentReservation.startAt,
          },
        ];
      })
      .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
  }, [lectures]);

  const selectedDateLectures = useMemo(() => {
    return (lectureSlotsByDate.get(selectedDate) ?? []).map((lecture) => ({
      ...lecture,
      slots: lecture.slots
        .filter((slot) => getSlotDateKey(slot.startAt) === selectedDate)
        .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)),
    }));
  }, [lectureSlotsByDate, selectedDate]);

  const reserveMutation = useMutation({
    mutationFn: ({ lectureId, slotId }: { lectureId: number; slotId: number }) =>
      reserveMyLecturePracticum(resolvedEnrollmentId, slotId, lectureId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약을 완료했습니다.',
        variant: 'success',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: number) =>
      cancelMyLecturePracticum(resolvedEnrollmentId, reservationId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 예약 취소에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: myEnrollmentPracticumQueryKey(resolvedEnrollmentId),
      });
      showToast({
        message: '실습 예약을 취소했습니다.',
        variant: 'success',
      });
    },
  });

  const renderSlotRow = (
    slot: PracticumSlot,
    lectureId: number,
    lectureEligible: boolean,
    hasCurrentReservation: boolean,
  ) => {
    const disableReserve =
      reserveMutation.isPending ||
      cancelMutation.isPending ||
      hasCurrentReservation ||
      !lectureEligible ||
      !isPracticumSlotReservable(slot);

    return (
      <div className={styles['slotRow']} key={slot.id}>
        <div className={styles['slotMain']}>
          <div>
            <strong className={styles['slotTime']}>
              {formatTimeRange(slot.startAt, slot.endAt)}
            </strong>
            <p className={styles['slotMeta']}>
              {slot.location || '장소 미정'} · {slot.reservedCount}/{slot.maxCapacity}명
            </p>
          </div>
          <span
            className={classNames(
              styles['slotStatusChip'],
              styles[`slotStatusChip${slot.slotStatus}`],
            )}
          >
            {slotStatusLabel[slot.slotStatus]}
          </span>
        </div>
        <Button
          disabled={disableReserve}
          onClick={() => {
            reserveMutation.mutate({ lectureId, slotId: slot.id });
          }}
          size='sm'
          type='button'
          variant='secondary'
        >
          {slot.reservedByMe ? '예약됨' : '예약하기'}
        </Button>
      </div>
    );
  };

  return (
    <div className={styles['page']}>
      <div className={styles['shell']}>
        <header className={styles['header']}>
          <div>
            <Link className={styles['backLink']} to={routePaths.mypage}>
              내 강의로 돌아가기
            </Link>
            <h1 className={styles['title']}>실습 예약</h1>
          </div>
          {overview ? (
            <div className={styles['headerActions']}>
              <div className={styles['summaryCard']}>
                <strong className={styles['summaryTitle']}>{overview.programTitle}</strong>
                <p className={styles['summaryMeta']}>
                  수강 기간 {formatDateRange(overview.enrolledAt, overview.expireAt)}
                </p>
              </div>
              <Link
                className={styles['learningLink']}
                to={routePaths.learningPlayer(String(overview.enrollmentId))}
              >
                학습하기
              </Link>
            </div>
          ) : null}
        </header>

        {overview ? (
          <section className={styles['reservationSummarySection']}>
            <div className={styles['reservationSummaryHeader']}>
              <h2 className={styles['reservationSummaryTitle']}>현재 예약한 실습</h2>
              <p className={styles['reservationSummaryMeta']}>
                {currentReservations.length
                  ? `${String(currentReservations.length)}건 예약됨`
                  : '현재 예약된 실습이 없습니다.'}
              </p>
            </div>
            {currentReservations.length ? (
              <div className={styles['reservationSummaryList']}>
                {currentReservations.map((reservation) => (
                  <article
                    className={styles['reservationSummaryRow']}
                    key={reservation.reservationId}
                  >
                    <strong className={styles['reservationSummaryCourse']}>
                      {reservation.lectureTitle}
                    </strong>
                    <span className={styles['reservationSummaryDivider']}>·</span>
                    <span className={styles['reservationSummarySectionText']}>
                      {reservation.sectionTitle}
                    </span>
                    <span className={styles['reservationSummaryDivider']}>·</span>
                    <span className={styles['reservationSummaryInfo']}>
                      {formatDateTime(reservation.startAt)} - {formatDateTime(reservation.endAt)}
                    </span>
                    <span className={styles['reservationSummaryDivider']}>·</span>
                    <span className={styles['reservationSummaryInfo']}>
                      {reservation.location || '장소 미정'}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles['reservationSummaryEmpty']}>아직 예약한 실습이 없습니다.</div>
            )}
          </section>
        ) : null}

        {!isValidEnrollmentId ? (
          <p className={styles['message']}>올바른 수강 정보가 아닙니다.</p>
        ) : null}
        {isValidEnrollmentId && practicumQuery.isLoading ? (
          <p className={styles['message']}>실습 예약 정보를 불러오는 중입니다.</p>
        ) : null}
        {isValidEnrollmentId && practicumQuery.isError ? (
          <p className={styles['errorText']}>
            {practicumQuery.error instanceof Error
              ? practicumQuery.error.message
              : '실습 예약 정보를 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!practicumQuery.isLoading && !practicumQuery.isError ? (
          lectures.length ? (
            <div className={styles['calendarLayout']}>
              <section className={styles['calendarPanel']}>
                <div className={styles['calendarMonthHeader']}>
                  <strong className={styles['calendarMonthTitle']}>
                    {formatMonthLabel(monthValue)}
                  </strong>
                  <input
                    className={styles['monthInput']}
                    onChange={(event) => {
                      const nextMonthValue = event.target.value;
                      setSelectionState({
                        enrollmentId: resolvedEnrollmentId,
                        monthValue: nextMonthValue,
                        selectedDate: selectedDate.startsWith(nextMonthValue)
                          ? selectedDate
                          : `${nextMonthValue}-01`,
                      });
                    }}
                    type='month'
                    value={monthValue}
                  />
                </div>

                <div className={styles['calendarWeekdays']}>
                  {calendarWeekdays.map((weekday) => (
                    <span className={styles['calendarWeekday']} key={weekday}>
                      {weekday}
                    </span>
                  ))}
                </div>

                <div className={styles['calendarGrid']}>
                  {calendarCells.map((cell, index) => {
                    if (!cell.date) {
                      return (
                        <div
                          className={styles['calendarEmptyCell']}
                          key={`empty-${String(index)}`}
                        />
                      );
                    }
                    const date = cell.date;

                    const availableCount = countsByDate.get(date) ?? 0;
                    const reservationCount = reservationsByDate.get(date) ?? 0;
                    const previews = previewByDate.get(date) ?? [];
                    const hasItems =
                      availableCount > 0 || reservationCount > 0 || previews.length > 0;

                    return (
                      <button
                        className={styles['calendarDay']}
                        data-has-items={hasItems}
                        data-selected={date === selectedDate}
                        key={date}
                        onClick={() => {
                          setSelectionState((current) => ({
                            enrollmentId: resolvedEnrollmentId,
                            monthValue:
                              current.enrollmentId === resolvedEnrollmentId
                                ? current.monthValue
                                : monthValue,
                            selectedDate: date,
                          }));
                        }}
                        type='button'
                      >
                        <div className={styles['calendarDayHeader']}>
                          <span className={styles['calendarDayNumber']}>
                            {Number(date.split('-')[2])}
                          </span>
                          {reservationCount > 0 ? (
                            <span className={styles['calendarDayCount']}>
                              {`예약 ${String(reservationCount)}건`}
                            </span>
                          ) : null}
                        </div>

                        <div className={styles['calendarPreviewList']}>
                          {previews.map((preview, previewIndex) => (
                            <span
                              className={classNames(
                                styles['calendarPreviewItem'],
                                preview.tone === 'reserved' &&
                                  styles['calendarPreviewItemReserved'],
                              )}
                              key={`${date}-${String(previewIndex)}`}
                            >
                              {preview.label}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={styles['calendarDetail']}>
                <div className={styles['detailHeader']}>
                  <div>
                    <h2 className={styles['detailTitle']}>
                      선택 날짜 - {formatDate(selectedDate)}
                    </h2>
                    <p className={styles['detailDescription']}>
                      선택한 날짜에 열려 있는 강의별 실습 시간만 모아서 보여줍니다.
                    </p>
                  </div>
                </div>

                {selectedDateLectures.length ? (
                  <div className={styles['lectureList']}>
                    {selectedDateLectures.map((lecture) => {
                      const hasCurrentReservation = Boolean(lecture.currentReservation);
                      const currentReservation = lecture.currentReservation;
                      return (
                        <section className={styles['lectureCard']} key={lecture.lectureId}>
                          <div className={styles['lectureHeader']}>
                            <div>
                              <p className={styles['lectureSection']}>{lecture.sectionTitle}</p>
                              <h3 className={styles['lectureTitle']}>{lecture.lectureTitle}</h3>
                            </div>
                            <div className={styles['lectureBadges']}>
                              <span className={styles['statusChip']}>
                                {lecture.lectureCompleted ? '강의 완료' : '강의 미완료'}
                              </span>
                              <span className={styles['statusChip']}>
                                {lecture.eligible ? '예약 가능' : '예약 불가'}
                              </span>
                            </div>
                          </div>

                          {currentReservation &&
                          getSlotDateKey(currentReservation.startAt) === selectedDate ? (
                            <div className={styles['currentReservation']}>
                              <div>
                                <strong className={styles['currentReservationTitle']}>
                                  현재 예약
                                </strong>
                                <p className={styles['currentReservationMeta']}>
                                  {formatDateTime(currentReservation.startAt)} ~{' '}
                                  {formatDateTime(currentReservation.endAt)}
                                </p>
                                <p className={styles['currentReservationMeta']}>
                                  {currentReservation.location || '장소 미정'}
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  cancelMutation.mutate(currentReservation.id);
                                }}
                                size='sm'
                                type='button'
                                variant='secondary'
                              >
                                예약 취소
                              </Button>
                            </div>
                          ) : null}

                          {!lecture.eligible && lecture.blockedReason ? (
                            <p className={styles['blockedText']}>{lecture.blockedReason}</p>
                          ) : null}

                          {lecture.slots.length ? (
                            <div className={styles['slotList']}>
                              {lecture.slots.map((slot) =>
                                renderSlotRow(
                                  slot,
                                  lecture.lectureId,
                                  lecture.eligible,
                                  hasCurrentReservation,
                                ),
                              )}
                            </div>
                          ) : (
                            <p className={styles['mutedText']}>
                              선택한 날짜에 예약 가능한 시간이 없습니다.
                            </p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles['message']}>
                    선택한 날짜에는 예약 가능한 실습 일정이 없습니다.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <p className={styles['message']}>이 수강에는 예약할 수 있는 실습 강의가 없습니다.</p>
          )
        ) : null}
      </div>
    </div>
  );
};

export default MyEnrollmentPracticumPage;
