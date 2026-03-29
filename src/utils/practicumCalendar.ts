export const calendarWeekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;

export interface CalendarCell {
  date: string | null;
  isCurrentMonth: boolean;
}

export const toDateInputValue = (date: Date): string => {
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
};

export const toMonthValue = (date: Date): string => {
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const todayDateString = (): string => {
  return toDateInputValue(new Date());
};

export const getMonthBounds = (monthValue: string): { from: string; to: string } => {
  const [yearPart, monthPart] = monthValue.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const fromDate = new Date(year, month - 1, 1);
  const toDate = new Date(year, month, 0);

  return {
    from: toDateInputValue(fromDate),
    to: toDateInputValue(toDate),
  };
};

const buildCalendarDays = (monthValue: string): string[] => {
  const [yearPart, monthPart] = monthValue.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const days: string[] = [];
  const cursor = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  while (cursor <= end) {
    days.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

export const buildCalendarCells = (monthValue: string): CalendarCell[] => {
  const calendarDays = buildCalendarDays(monthValue);
  if (!calendarDays.length) {
    return [];
  }

  const firstDate = new Date(`${calendarDays[0]}T00:00:00`);
  const leadingEmptyCellCount = firstDate.getDay();
  const cells: CalendarCell[] = Array.from({ length: leadingEmptyCellCount }, () => ({
    date: null,
    isCurrentMonth: false,
  }));

  for (const date of calendarDays) {
    cells.push({
      date,
      isCurrentMonth: true,
    });
  }

  const trailingEmptyCellCount = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingEmptyCellCount; index += 1) {
    cells.push({
      date: null,
      isCurrentMonth: false,
    });
  }

  return cells;
};

export const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
};

export const formatMonthLabel = (value: string): string => {
  const [yearPart, monthPart] = value.split('-');
  return `${yearPart}년 ${String(Number(monthPart))}월`;
};

export const formatTimeRange = (startAt: string, endAt: string): string => {
  const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${timeFormatter.format(new Date(startAt))} - ${timeFormatter.format(new Date(endAt))}`;
};

export const getSlotDateKey = (value: string): string => {
  return toDateInputValue(new Date(value));
};
