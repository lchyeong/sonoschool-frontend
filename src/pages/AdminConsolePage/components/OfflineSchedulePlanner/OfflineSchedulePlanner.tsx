import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminPracticumOperatingHours } from '@/api/adminPracticum';
import calendarIconSrc from '@/assets/icons/lucide_calendar.svg';
import { TextField } from '@/components/ui/TextField/TextField';
import type { AdminPracticumOperatingHour } from '@/types/practicum';
import { classNames } from '@/utils/classNames';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  toMonthValue,
} from '@/utils/practicumCalendar';

import styles from './OfflineSchedulePlanner.module.scss';

export interface OfflineSchedulePlannerItem {
  date: string;
  endTime: string;
  location: string;
  notes: string;
  startTime: string;
}

interface DatePickerProps {
  disabled?: boolean;
  isOpen: boolean;
  max: string;
  min: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onMonthChange: (value: Date) => void;
  onOpen: () => void;
  pickerMonth: Date;
  value: string;
}

interface OfflineSchedulePlannerProps {
  disabled?: boolean;
  maxDate: string;
  minDate: string;
  onSchedulesChange: (schedules: OfflineSchedulePlannerItem[]) => void;
  schedules: OfflineSchedulePlannerItem[];
}

const EMPTY_SCHEDULE: OfflineSchedulePlannerItem = {
  date: '',
  endTime: '',
  location: '',
  notes: '',
  startTime: '',
};

const weekdayByDateIndex: AdminPracticumOperatingHour['weekday'][] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const addMonths = (value: Date, amount: number): Date => {
  const nextDate = new Date(value);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return nextDate;
};

const parseDateValue = (value: string): Date => {
  if (!value) {
    return new Date();
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

const toTimeValue = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

const parseTimeHour = (timeValue: string): number | null => {
  const hour = Number(timeValue.split(':')[0]);
  return Number.isInteger(hour) ? hour : null;
};

const getWeekdayKey = (dateValue: string): AdminPracticumOperatingHour['weekday'] | null => {
  const date = parseDateValue(dateValue);
  if (!dateValue || Number.isNaN(date.getTime())) {
    return null;
  }

  return weekdayByDateIndex[date.getDay()] ?? null;
};

const resolveOperatingHour = (
  dateValue: string,
  operatingHours: AdminPracticumOperatingHour[],
): AdminPracticumOperatingHour | null => {
  const weekday = getWeekdayKey(dateValue);
  if (!weekday) {
    return null;
  }

  return operatingHours.find((item) => item.weekday === weekday && item.enabled) ?? null;
};

const buildStartTimeOptions = (operatingHour: AdminPracticumOperatingHour | null): string[] => {
  if (!operatingHour) {
    return [];
  }

  const blockedHours = new Set(operatingHour.blockedHours);
  return Array.from(
    { length: Math.max(0, operatingHour.openToHour - operatingHour.openFromHour) },
    (_, index) => operatingHour.openFromHour + index,
  )
    .filter((hour) => !blockedHours.has(hour))
    .map(toTimeValue);
};

const buildEndTimeOptions = (
  operatingHour: AdminPracticumOperatingHour | null,
  startTime: string,
): string[] => {
  const startHour = parseTimeHour(startTime);
  if (!operatingHour || startHour === null) {
    return [];
  }

  const blockedHours = new Set(operatingHour.blockedHours);
  const options: string[] = [];
  for (let endHour = startHour + 1; endHour <= operatingHour.openToHour; endHour += 1) {
    const includedHour = endHour - 1;
    if (blockedHours.has(includedHour)) {
      break;
    }
    options.push(toTimeValue(endHour));
  }

  return options;
};

const isScheduleTimeWithinOperatingHour = (
  operatingHour: AdminPracticumOperatingHour | null,
  startTime: string,
  endTime: string,
): boolean => {
  const startHour = parseTimeHour(startTime);
  const endHour = parseTimeHour(endTime);
  if (!operatingHour || startHour === null || endHour === null || startHour >= endHour) {
    return false;
  }
  if (startHour < operatingHour.openFromHour || endHour > operatingHour.openToHour) {
    return false;
  }

  const blockedHours = new Set(operatingHour.blockedHours);
  for (let hour = startHour; hour < endHour; hour += 1) {
    if (blockedHours.has(hour)) {
      return false;
    }
  }

  return true;
};

const formatBlockedHours = (blockedHours: number[]): string => {
  return blockedHours.map(toTimeValue).join(', ');
};

const DatePicker = ({
  disabled = false,
  isOpen,
  max,
  min,
  onChange,
  onClose,
  onMonthChange,
  onOpen,
  pickerMonth,
  value,
}: DatePickerProps) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const calendarCells = useMemo(() => buildCalendarCells(toMonthValue(pickerMonth)), [pickerMonth]);
  const label = value ? formatDate(value) : '날짜 선택';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePopoverPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const width = Math.min(320, window.innerWidth - 32);
      const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
      const estimatedHeight = 330;
      const top =
        rect.bottom + estimatedHeight + 16 > window.innerHeight
          ? Math.max(16, rect.top - estimatedHeight - 8)
          : rect.bottom + 8;
      setPopoverStyle({
        left,
        maxHeight: window.innerHeight - top - 16,
        top,
        width,
      });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    updatePopoverPosition();
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isOpen, onClose]);

  return (
    <div className={styles['datePicker']}>
      <label className={styles['fieldLabel']} htmlFor='offline-schedule-date'>
        날짜
      </label>
      <button
        aria-expanded={isOpen}
        aria-haspopup='dialog'
        className={classNames(styles['dateTrigger'], isOpen && styles['dateTriggerActive'])}
        disabled={disabled}
        id='offline-schedule-date'
        onClick={onOpen}
        ref={triggerRef}
        type='button'
      >
        <span className={classNames(styles['dateValue'], !value && styles['muted'])}>{label}</span>
        <img alt='' aria-hidden='true' className={styles['dateIcon']} src={calendarIconSrc} />
      </button>
      {isOpen ? (
        <div className={styles['datePopover']} ref={popoverRef} role='dialog' style={popoverStyle}>
          <div className={styles['calendarHead']}>
            <button
              className={styles['calendarNav']}
              onClick={() => {
                onMonthChange(addMonths(pickerMonth, -1));
              }}
              type='button'
            >
              이전
            </button>
            <strong className={styles['monthLabel']}>
              {formatMonthLabel(toMonthValue(pickerMonth))}
            </strong>
            <button
              className={styles['calendarNav']}
              onClick={() => {
                onMonthChange(addMonths(pickerMonth, 1));
              }}
              type='button'
            >
              다음
            </button>
          </div>
          <div className={styles['weekdays']}>
            {calendarWeekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className={styles['days']}>
            {calendarCells.map((cell, cellIndex) => {
              const dateValue = cell.date ?? '';
              const isSelectable =
                cell.isCurrentMonth &&
                Boolean(dateValue) &&
                (!min || dateValue >= min) &&
                (!max || dateValue <= max);
              const isSelected = Boolean(dateValue) && dateValue === value;

              return (
                <button
                  aria-label={dateValue ? formatDate(dateValue) : undefined}
                  className={classNames(
                    styles['day'],
                    !cell.isCurrentMonth && styles['dayOutside'],
                    isSelected && styles['daySelected'],
                  )}
                  disabled={!isSelectable}
                  key={`offline-schedule-date-${String(cellIndex)}-${dateValue}`}
                  onClick={() => {
                    onChange(dateValue);
                    onClose();
                  }}
                  type='button'
                >
                  {dateValue ? Number(dateValue.split('-')[2]) : ''}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const OfflineSchedulePlanner = ({
  disabled = false,
  maxDate,
  minDate,
  onSchedulesChange,
  schedules,
}: OfflineSchedulePlannerProps) => {
  const operatingHoursQuery = useQuery({
    enabled: Boolean(schedules[0]?.date),
    queryFn: () => fetchAdminPracticumOperatingHours(schedules[0]?.date),
    queryKey: ['adminPracticumOperatingHours', schedules[0]?.date ?? ''],
  });
  const schedule = schedules[0] ?? EMPTY_SCHEDULE;
  const operatingHours = useMemo(() => operatingHoursQuery.data ?? [], [operatingHoursQuery.data]);
  const selectedOperatingHour = useMemo(
    () => resolveOperatingHour(schedule.date, operatingHours),
    [operatingHours, schedule.date],
  );
  const startTimeOptions = useMemo(
    () => buildStartTimeOptions(selectedOperatingHour),
    [selectedOperatingHour],
  );
  const endTimeOptions = useMemo(
    () => buildEndTimeOptions(selectedOperatingHour, schedule.startTime),
    [schedule.startTime, selectedOperatingHour],
  );
  const blockedHourLabels = selectedOperatingHour
    ? formatBlockedHours(
        [...selectedOperatingHour.blockedHours].sort((left, right) => left - right),
      )
    : '';
  const startTimeDisabled =
    disabled ||
    !schedule.date ||
    operatingHoursQuery.isPending ||
    !selectedOperatingHour ||
    startTimeOptions.length === 0;
  const endTimeDisabled =
    disabled ||
    !schedule.startTime ||
    operatingHoursQuery.isPending ||
    !selectedOperatingHour ||
    endTimeOptions.length === 0;
  const [datePicker, setDatePicker] = useState<{ isOpen: boolean; month: Date }>({
    isOpen: false,
    month: parseDateValue(schedule.date || minDate),
  });

  const updateSchedule = (
    updater: (schedule: OfflineSchedulePlannerItem) => OfflineSchedulePlannerItem,
  ) => {
    onSchedulesChange([updater(schedule)]);
  };

  useEffect(() => {
    if (!schedule.date || operatingHoursQuery.isPending) {
      return;
    }

    const hasStartTime = Boolean(schedule.startTime);
    const hasEndTime = Boolean(schedule.endTime);
    const hasValidStartTime = !hasStartTime || startTimeOptions.includes(schedule.startTime);
    const hasValidEndTime =
      !hasEndTime ||
      (hasStartTime &&
        isScheduleTimeWithinOperatingHour(
          selectedOperatingHour,
          schedule.startTime,
          schedule.endTime,
        ));

    if (hasValidStartTime && hasValidEndTime) {
      return;
    }

    onSchedulesChange([
      {
        ...schedule,
        endTime: '',
        startTime: hasValidStartTime ? schedule.startTime : '',
      },
    ]);
  }, [
    onSchedulesChange,
    operatingHoursQuery.isPending,
    schedule,
    selectedOperatingHour,
    startTimeOptions,
  ]);

  return (
    <div className={styles['planner']}>
      <div className={styles['scheduleCard']}>
        <div className={styles['sectionHead']}>
          <strong>고정 일정</strong>
          <span>오프라인 강의는 강의당 일정 1개만 등록합니다.</span>
        </div>
        <div className={styles['fieldGrid']}>
          <DatePicker
            isOpen={datePicker.isOpen}
            disabled={disabled}
            max={maxDate}
            min={minDate}
            onChange={(dateValue) => {
              updateSchedule((current) => {
                return {
                  ...current,
                  date: dateValue,
                  endTime: '',
                  startTime: '',
                };
              });
            }}
            onClose={() => {
              setDatePicker((current) => ({ ...current, isOpen: false }));
            }}
            onMonthChange={(month) => {
              setDatePicker((current) => ({ ...current, month }));
            }}
            onOpen={() => {
              setDatePicker((current) => ({
                isOpen: !current.isOpen,
                month: parseDateValue(schedule.date || minDate),
              }));
            }}
            pickerMonth={datePicker.month}
            value={schedule.date}
          />
          <label className={styles['selectField']}>
            <span className={styles['fieldLabel']}>시작 시간</span>
            <select
              className={styles['selectControl']}
              disabled={startTimeDisabled}
              onChange={(event) => {
                const startTime = event.target.value;
                updateSchedule((current) => ({
                  ...current,
                  endTime: current.endTime > startTime ? current.endTime : '',
                  startTime,
                }));
              }}
              value={schedule.startTime}
            >
              <option value=''>선택</option>
              {startTimeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={styles['selectField']}>
            <span className={styles['fieldLabel']}>종료 시간</span>
            <select
              className={styles['selectControl']}
              disabled={endTimeDisabled}
              onChange={(event) => {
                updateSchedule((current) => ({ ...current, endTime: event.target.value }));
              }}
              value={schedule.endTime}
            >
              <option value=''>선택</option>
              {endTimeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <div className={styles['locationField']}>
            <TextField
              label='장소'
              name='offline-schedule-location'
              onChange={(event) => {
                updateSchedule((current) => ({ ...current, location: event.target.value }));
              }}
              value={schedule.location}
            />
          </div>
        </div>
        {schedule.date && operatingHoursQuery.isSuccess && !selectedOperatingHour ? (
          <p className={styles['helperText']} data-tone='warning'>
            선택한 날짜에 운영시간이 없어 시작 시간을 선택할 수 없습니다.
          </p>
        ) : null}
        {schedule.date && operatingHoursQuery.isError ? (
          <p className={styles['helperText']} data-tone='warning'>
            운영시간을 불러오지 못해 시간을 선택할 수 없습니다.
          </p>
        ) : null}
        {schedule.date && selectedOperatingHour && startTimeOptions.length === 0 ? (
          <p className={styles['helperText']} data-tone='warning'>
            운영시간 내 선택 가능한 시간이 없습니다.
            {blockedHourLabels ? ` 예약불가 시간: ${blockedHourLabels}` : ''}
          </p>
        ) : null}
        {schedule.date && selectedOperatingHour ? (
          <p className={styles['helperText']}>
            운영시간 {toTimeValue(selectedOperatingHour.openFromHour)}~
            {toTimeValue(selectedOperatingHour.openToHour)} 안에서만 등록할 수 있습니다.
            {blockedHourLabels ? ` 예약불가 시간: ${blockedHourLabels}` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default OfflineSchedulePlanner;
