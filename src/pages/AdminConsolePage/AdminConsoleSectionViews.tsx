import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelAdminPayment } from '@/api/adminPayments';
import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import Modal from '@/components/overlay/Modal/Modal';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import { TextAreaField } from '@/components/ui/TextField/TextField';
import {
  adminPaymentDetailQueryKey,
  adminPaymentsQueryKey,
  useAdminPaymentDetailQuery,
  useAdminPaymentsQuery,
} from '@/query/useAdminPaymentsQuery';
import { useToastStore } from '@/stores/useToastStore';
import { formatPaymentMethodLabel, paymentStatusLabels } from '@/types/payment';
import {
  buildCalendarCells,
  calendarWeekdays,
  formatDate,
  formatMonthLabel,
  toMonthValue,
} from '@/utils/practicumCalendar';

import styles from './AdminConsolePage.module.scss';
import { sectionContent, type AdminConsoleSection } from './adminConsolePageShared';

interface AdminConsolePageHeaderProps {
  section: AdminConsoleSection;
}

interface DeferredSectionProps {
  section: Extract<AdminConsoleSection, 'reviews'>;
}

const PAYMENTS_PAGE_SIZE = 12;

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatCompactDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('year')}.${getPart('month')}.${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    currency: 'KRW',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
};

const formatOrderTypeLabel = (value: string): string => {
  switch (value) {
    case 'PROGRAM':
      return '단일 강의';
    case 'CART_CHECKOUT':
      return '장바구니 결제';
    default:
      return value;
  }
};

const formatOrderNumberPreview = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return value.length > 10 ? value.slice(0, 10) : value;
};

const formatLectureProgressLabel = (
  completedLectureCount: number,
  totalLectureCount: number,
): string => {
  if (totalLectureCount <= 0) {
    return '-';
  }

  return `${String(completedLectureCount)}/${String(totalLectureCount)}강`;
};

interface SalesPoint {
  amount: number;
  fullLabel: string;
  label: string;
  pointKey: string;
}

const startOfWeek = (value: Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date;
};

const matchesDateRange = (value: string | null, startDate: string, endDate: string): boolean => {
  if (!value) {
    return false;
  }

  const target = new Date(value);

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);

    if (target < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);

    if (target > end) {
      return false;
    }
  }

  return true;
};

const addMonths = (value: Date, amount: number): Date => {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
};

const formatDateRangeText = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) {
    return '조회 기간 선택';
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  if (!startDate) {
    return false;
  }

  if (!endDate) {
    return date === startDate;
  }

  return date >= startDate && date <= endDate;
};

const buildMonthlySalesPoints = (
  payments: Array<{
    approvedAmount: number | null;
    amount: number;
    paidAt: string | null;
    status: string;
  }>,
): SalesPoint[] => {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from({ length: 12 }, (_, index) => {
    const pointDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - (11 - index),
      1,
    );
    const nextMonth = new Date(pointDate.getFullYear(), pointDate.getMonth() + 1, 1);
    const amount = payments
      .filter((payment) => payment.status === 'COMPLETED' && payment.paidAt)
      .filter((payment) => {
        const paidAt = new Date(payment.paidAt as string);
        return paidAt >= pointDate && paidAt < nextMonth;
      })
      .reduce((sum, payment) => sum + (payment.approvedAmount ?? payment.amount), 0);

    return {
      amount,
      fullLabel: `${String(pointDate.getFullYear())}년 ${String(pointDate.getMonth() + 1)}월`,
      label: String(pointDate.getMonth() + 1),
      pointKey: `${String(pointDate.getFullYear())}-${String(pointDate.getMonth() + 1).padStart(2, '0')}`,
    };
  });
};

const buildWeeklySalesPoints = (
  payments: Array<{
    approvedAmount: number | null;
    amount: number;
    paidAt: string | null;
    status: string;
  }>,
): SalesPoint[] => {
  const currentWeek = startOfWeek(new Date());

  return Array.from({ length: 12 }, (_, index) => {
    const pointDate = new Date(currentWeek);
    pointDate.setDate(currentWeek.getDate() - (11 - index) * 7);
    const nextWeek = new Date(pointDate);
    nextWeek.setDate(pointDate.getDate() + 7);

    const amount = payments
      .filter((payment) => payment.status === 'COMPLETED' && payment.paidAt)
      .filter((payment) => {
        const paidAt = new Date(payment.paidAt as string);
        return paidAt >= pointDate && paidAt < nextWeek;
      })
      .reduce((sum, payment) => sum + (payment.approvedAmount ?? payment.amount), 0);

    return {
      amount,
      fullLabel: `${String(pointDate.getMonth() + 1)}/${String(pointDate.getDate())}`,
      label: `${pointDate.getMonth() + 1}/${pointDate.getDate()}`,
      pointKey: `${pointDate.toISOString()}`,
    };
  });
};

const SalesLineChart = ({
  axisMode,
  onHighlightPoint,
  onResetHighlight,
  points,
  selectedPointKey,
  tone,
  title,
}: {
  axisMode: 'all' | 'sparse';
  onHighlightPoint?: ((point: SalesPoint) => void) | undefined;
  onResetHighlight?: (() => void) | undefined;
  points: SalesPoint[];
  selectedPointKey?: string | null;
  tone: 'amber' | 'teal';
  title: string;
}) => {
  const maxAmount = Math.max(...points.map((point) => point.amount), 0);
  const resolvedMaxAmount = maxAmount > 0 ? maxAmount : 1;
  const width = 100;
  const height = 44;
  const chartId = title.replace(/\s+/g, '-');
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - (point.amount / resolvedMaxAmount) * height;
    const xPercent = (x / width) * 100;

    return {
      ...point,
      x,
      xPercent,
      y,
      tooltipAlign: xPercent < 14 ? 'left' : xPercent > 86 ? 'right' : 'center',
    };
  });
  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = `0,${String(height)} ${polylinePoints} ${String(width)},${String(height)}`;
  const axisPoints =
    axisMode === 'all'
      ? points
      : Array.from(
          new Set([
            0,
            Math.floor((points.length - 1) / 3),
            Math.floor(((points.length - 1) * 2) / 3),
            Math.max(points.length - 1, 0),
          ]),
        )
          .map((index) => points[index])
          .filter((point): point is SalesPoint => Boolean(point));

  const cardToneClassName =
    tone === 'teal' ? styles['salesChartCardTeal'] : styles['salesChartCardAmber'];
  const legendToneClassName =
    tone === 'teal' ? styles['salesChartLegendTeal'] : styles['salesChartLegendAmber'];
  const lineToneClassName =
    tone === 'teal' ? styles['salesChartLineTeal'] : styles['salesChartLineAmber'];
  const axisClassName =
    axisMode === 'all' ? styles['salesChartAxisDense'] : styles['salesChartAxisSparse'];
  const selectedChartPoint =
    selectedPointKey !== null && selectedPointKey !== undefined
      ? (chartPoints.find((point) => point.pointKey === selectedPointKey) ?? null)
      : null;
  const latestPoint = points[points.length - 1] ?? { amount: 0, label: '-' };

  return (
    <article className={`${styles['salesChartCard']} ${cardToneClassName}`}>
      <header className={styles['salesChartHeader']}>
        <h2 className={styles['salesChartTitle']}>{title}</h2>
      </header>
      <div className={styles['salesChartBody']}>
        <ul className={styles['salesChartLegend']} aria-hidden='true'>
          <li className={legendToneClassName}>결제 완료 금액</li>
        </ul>
        <div className={styles['salesChartCanvas']}>
          <div className={styles['salesChartGridLines']} aria-hidden='true'>
            <span />
            <span />
            <span />
          </div>
          <svg
            aria-hidden='true'
            className={styles['salesChartSvg']}
            preserveAspectRatio='none'
            viewBox={`0 0 ${String(width)} ${String(height)}`}
          >
            <defs>
              <linearGradient id={`${chartId}-fill`} x1='0' x2='0' y1='0' y2='1'>
                <stop offset='0%' stopColor='currentColor' stopOpacity='0.28' />
                <stop offset='100%' stopColor='currentColor' stopOpacity='0.02' />
              </linearGradient>
            </defs>
            <polygon
              className={`${styles['salesChartArea']} ${lineToneClassName}`}
              fill={`url(#${chartId}-fill)`}
              points={areaPoints}
            />
            <polyline
              className={`${styles['salesChartLine']} ${lineToneClassName}`}
              fill='none'
              points={polylinePoints}
              vectorEffect='non-scaling-stroke'
            />
          </svg>
          {selectedChartPoint ? (
            <div
              aria-hidden='true'
              className={styles['salesChartSelection']}
              style={{
                left: `${String(selectedChartPoint.xPercent)}%`,
                top: `${String((selectedChartPoint.y / height) * 100)}%`,
              }}
            >
              <span
                className={`${styles['salesChartSelectionBubble']} ${
                  selectedChartPoint.tooltipAlign === 'left'
                    ? styles['salesChartSelectionBubbleLeft']
                    : selectedChartPoint.tooltipAlign === 'right'
                      ? styles['salesChartSelectionBubbleRight']
                      : styles['salesChartSelectionBubbleCenter']
                }`}
              >
                {selectedChartPoint.fullLabel} · {formatCurrency(selectedChartPoint.amount)}
              </span>
              <span className={styles['salesChartSelectionDot']} />
            </div>
          ) : null}
        </div>
      </div>
      <div className={`${styles['salesChartAxis']} ${axisClassName}`}>
        {axisPoints.map((point) =>
          onHighlightPoint ? (
            <button
              aria-label={`${point.fullLabel} 매출 보기`}
              className={`${styles['salesChartAxisButton']} ${
                selectedPointKey === point.pointKey ? styles['salesChartAxisButtonActive'] : ''
              }`}
              key={`${title}-axis-${point.pointKey}`}
              onBlur={onResetHighlight}
              onFocus={() => {
                onHighlightPoint(point);
              }}
              onMouseEnter={() => {
                onHighlightPoint(point);
              }}
              onMouseLeave={onResetHighlight}
              onPointerEnter={() => {
                onHighlightPoint(point);
              }}
              type='button'
            >
              <span className={styles['salesChartAxisLabel']}>{point.label}</span>
            </button>
          ) : (
            <span className={styles['salesChartAxisLabel']} key={`${title}-axis-${point.pointKey}`}>
              {point.label}
            </span>
          ),
        )}
      </div>
      <p className={styles['salesChartMeta']}>
        최근 기준 {latestPoint.label} · {formatCurrency(latestPoint.amount)}
      </p>
    </article>
  );
};

const getDeferredDescription = (_section: DeferredSectionProps['section']): string => {
  return '교육후기 운영 화면은 게시 정책과 공개 구조를 정리한 뒤 별도 관리자 페이지로 연결합니다.';
};

export const AdminConsolePageHeader = ({ section }: AdminConsolePageHeaderProps) => {
  const sectionMeta = sectionContent[section];

  return (
    <header className={styles['pageHeader']}>
      <h1 className={styles['pageTitle']}>{sectionMeta.title}</h1>
    </header>
  );
};

export const AdminDeferredSection = ({ section }: DeferredSectionProps) => {
  const sectionMeta = sectionContent[section];

  return (
    <section className={styles['stateSection']}>
      <h2 className={styles['stateTitle']}>{sectionMeta.title} 준비 중</h2>
      <p className={styles['stateDescription']}>{getDeferredDescription(section)}</p>
    </section>
  );
};

export const AdminPaymentsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const paymentsQuery = useAdminPaymentsQuery();
  const [searchField, setSearchField] = useState<'orderNumber' | 'buyerDisplayName' | 'orderName'>(
    'orderNumber',
  );
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hoveredMonthlyPointKey, setHoveredMonthlyPointKey] = useState<string | null>(null);
  const [hoveredWeeklyPointKey, setHoveredWeeklyPointKey] = useState<string | null>(null);
  const [requestedDateFrom, setRequestedDateFrom] = useState('');
  const [requestedDateTo, setRequestedDateTo] = useState('');
  const [draftRequestedDateFrom, setDraftRequestedDateFrom] = useState('');
  const [draftRequestedDateTo, setDraftRequestedDateTo] = useState('');
  const [datePickerMessage, setDatePickerMessage] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false);
  const [leftCalendarMonth, setLeftCalendarMonth] = useState(() => addMonths(new Date(), -1));
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const paymentItems = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const operationalPaymentItems = useMemo(() => {
    return paymentItems.filter((payment) => {
      return payment.status === 'COMPLETED' || payment.status === 'CANCELLED';
    });
  }, [paymentItems]);
  const monthlySalesPoints = useMemo(() => buildMonthlySalesPoints(paymentItems), [paymentItems]);
  const weeklySalesPoints = useMemo(() => buildWeeklySalesPoints(paymentItems), [paymentItems]);
  const rightCalendarMonth = useMemo(() => addMonths(leftCalendarMonth, 1), [leftCalendarMonth]);
  const leftCalendarCells = useMemo(
    () => buildCalendarCells(toMonthValue(leftCalendarMonth)),
    [leftCalendarMonth],
  );
  const rightCalendarCells = useMemo(
    () => buildCalendarCells(toMonthValue(rightCalendarMonth)),
    [rightCalendarMonth],
  );
  const displayedRangeText = useMemo(
    () => formatDateRangeText(requestedDateFrom, requestedDateTo),
    [requestedDateFrom, requestedDateTo],
  );
  const draftRangeText = useMemo(
    () => formatDateRangeText(draftRequestedDateFrom, draftRequestedDateTo),
    [draftRequestedDateFrom, draftRequestedDateTo],
  );
  const displayedPaymentItems = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    return operationalPaymentItems.filter((payment) => {
      const referenceDate = payment.cancelledAt ?? payment.paidAt ?? payment.requestedAt;
      if (!matchesDateRange(referenceDate, requestedDateFrom, requestedDateTo)) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const targetValue =
        searchField === 'orderNumber'
          ? (payment.orderNumber ?? '')
          : searchField === 'buyerDisplayName'
            ? payment.buyerDisplayName
            : payment.orderName;

      return targetValue.toLowerCase().includes(normalizedKeyword);
    });
  }, [operationalPaymentItems, requestedDateFrom, requestedDateTo, searchField, searchKeyword]);
  const totalPages = Math.max(1, Math.ceil(displayedPaymentItems.length / PAYMENTS_PAGE_SIZE));
  const currentPageIndex = Math.min(currentPage, totalPages - 1);
  const pagedPaymentItems = useMemo(() => {
    const startIndex = currentPageIndex * PAYMENTS_PAGE_SIZE;
    return displayedPaymentItems.slice(startIndex, startIndex + PAYMENTS_PAGE_SIZE);
  }, [currentPageIndex, displayedPaymentItems]);
  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index);
  }, [totalPages]);
  const detailQuery = useAdminPaymentDetailQuery(isPaymentDetailOpen ? selectedPaymentId : null);

  const paymentSummary = useMemo(() => {
    return {
      cancelledCount: operationalPaymentItems.filter((item) => item.status === 'CANCELLED').length,
      completedCount: operationalPaymentItems.filter((item) => item.status === 'COMPLETED').length,
      completedRevenue: operationalPaymentItems
        .filter((item) => item.status === 'COMPLETED')
        .reduce((sum, item) => sum + (item.approvedAmount ?? item.amount), 0),
      totalCount: operationalPaymentItems.length,
    };
  }, [operationalPaymentItems]);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (datePickerRef.current?.contains(target)) {
        return;
      }
      setIsDatePickerOpen(false);
      setDatePickerMessage(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    setCurrentPage(0);
  }, [requestedDateFrom, requestedDateTo, searchField, searchKeyword]);

  const cancelMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: number; reason: string }) =>
      cancelAdminPayment(paymentId, { reason }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '결제 취소 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      setCancelReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPaymentsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: adminPaymentDetailQueryKey(variables.paymentId),
        }),
      ]);
      showToast({
        message: '결제 취소 처리를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const handleCancel = () => {
    if (selectedPaymentId === null) {
      return;
    }

    if (!cancelReason.trim()) {
      showToast({
        message: '취소 사유를 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    cancelMutation.mutate({
      paymentId: selectedPaymentId,
      reason: cancelReason.trim(),
    });
  };

  const handleOpenDatePicker = () => {
    const baseDate = requestedDateFrom
      ? new Date(`${requestedDateFrom}T00:00:00`)
      : requestedDateTo
        ? new Date(`${requestedDateTo}T00:00:00`)
        : addMonths(new Date(), -1);

    setDraftRequestedDateFrom(requestedDateFrom);
    setDraftRequestedDateTo(requestedDateTo);
    setDatePickerMessage(null);
    setLeftCalendarMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setIsDatePickerOpen(true);
  };

  const handleCalendarDateSelect = (dateValue: string) => {
    setDatePickerMessage(null);

    if (!draftRequestedDateFrom || draftRequestedDateTo) {
      setDraftRequestedDateFrom(dateValue);
      setDraftRequestedDateTo('');
      return;
    }

    if (dateValue < draftRequestedDateFrom) {
      setDraftRequestedDateFrom(dateValue);
      setDraftRequestedDateTo('');
      return;
    }

    setDraftRequestedDateTo(dateValue);
  };

  const handleApplyDateFilter = () => {
    if (!draftRequestedDateFrom || !draftRequestedDateTo) {
      setDatePickerMessage('조회 기간은 시작일과 종료일을 모두 선택한 뒤 적용해 주세요.');
      return;
    }

    setRequestedDateFrom(draftRequestedDateFrom);
    setRequestedDateTo(draftRequestedDateTo);
    setDatePickerMessage(null);
    setIsDatePickerOpen(false);
  };

  const handleResetDateFilter = () => {
    setDraftRequestedDateFrom('');
    setDraftRequestedDateTo('');
    setRequestedDateFrom('');
    setRequestedDateTo('');
    setDatePickerMessage(null);
    setIsDatePickerOpen(false);
  };

  const handleApplySearch = () => {
    setSearchKeyword(searchInput.trim());
  };

  const handleOpenPaymentDetail = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setCancelReason('');
    setIsPaymentDetailOpen(true);
  };

  const handleClosePaymentDetail = () => {
    setIsPaymentDetailOpen(false);
    setCancelReason('');
  };

  if (paymentsQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>결제 목록을 불러오는 중입니다.</h2>
        <p className={styles['stateDescription']}>
          운영에 필요한 최소 결제 정보만 정리해서 가져오고 있습니다.
        </p>
      </section>
    );
  }

  if (paymentsQuery.isError) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>결제 관리 화면을 불러오지 못했습니다.</h2>
        <p className={styles['stateDescription']}>
          {paymentsQuery.error instanceof Error
            ? paymentsQuery.error.message
            : '관리자 결제 API 상태를 확인해 주세요.'}
        </p>
      </section>
    );
  }

  if (operationalPaymentItems.length === 0) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>표시할 운영 결제 내역이 없습니다.</h2>
        <p className={styles['stateDescription']}>
          관리자 화면에는 결제 완료와 취소 건만 노출합니다.
        </p>
      </section>
    );
  }

  const selectedPayment = detailQuery.data ?? null;

  return (
    <section className={styles['panel']}>
      <div className={styles['salesChartGrid']}>
        <SalesLineChart
          axisMode='all'
          onHighlightPoint={(point) => {
            setHoveredMonthlyPointKey(point.pointKey);
          }}
          onResetHighlight={() => {
            setHoveredMonthlyPointKey(null);
          }}
          points={monthlySalesPoints}
          selectedPointKey={hoveredMonthlyPointKey}
          tone='amber'
          title='월별 매출 차트'
        />
        <SalesLineChart
          axisMode='sparse'
          onHighlightPoint={(point) => {
            setHoveredWeeklyPointKey(point.pointKey);
          }}
          onResetHighlight={() => {
            setHoveredWeeklyPointKey(null);
          }}
          points={weeklySalesPoints}
          selectedPointKey={hoveredWeeklyPointKey}
          tone='teal'
          title='주별 매출 차트'
        />
      </div>

      <div className={styles['toolbar']}>
        <div className={styles['toolbarFilters']}>
          <div className={styles['toolbarFilterRow']}>
            <div className={styles['paymentDatePicker']} ref={datePickerRef}>
              <button
                className={`${styles['paymentDatePickerTrigger']} ${
                  displayedRangeText !== '조회 기간 선택'
                    ? styles['paymentDatePickerTriggerActive']
                    : ''
                }`}
                onClick={() => {
                  if (isDatePickerOpen) {
                    setIsDatePickerOpen(false);
                    setDatePickerMessage(null);
                    return;
                  }
                  handleOpenDatePicker();
                }}
                type='button'
              >
                <span>{displayedRangeText}</span>
                <span aria-hidden='true' className={styles['paymentDatePickerIcon']} />
              </button>

              {isDatePickerOpen ? (
                <div className={styles['paymentDatePickerPopover']}>
                  <div className={styles['paymentDatePickerCalendars']}>
                    {[
                      {
                        cells: leftCalendarCells,
                        key: 'left',
                        month: leftCalendarMonth,
                        nav: (
                          <button
                            className={styles['paymentDatePickerNav']}
                            onClick={() => {
                              setLeftCalendarMonth((previous) => addMonths(previous, -1));
                            }}
                            type='button'
                          >
                            이전
                          </button>
                        ),
                        navAfter: <span className={styles['paymentDatePickerNavSpacer']} />,
                      },
                      {
                        cells: rightCalendarCells,
                        key: 'right',
                        month: rightCalendarMonth,
                        nav: <span className={styles['paymentDatePickerNavSpacer']} />,
                        navAfter: (
                          <button
                            className={styles['paymentDatePickerNav']}
                            onClick={() => {
                              setLeftCalendarMonth((previous) => addMonths(previous, 1));
                            }}
                            type='button'
                          >
                            다음
                          </button>
                        ),
                      },
                    ].map((calendar) => (
                      <div className={styles['paymentDatePickerCalendarPanel']} key={calendar.key}>
                        <div className={styles['paymentDatePickerCalendarHead']}>
                          {calendar.nav}
                          <strong className={styles['paymentDatePickerMonthLabel']}>
                            {formatMonthLabel(toMonthValue(calendar.month))}
                          </strong>
                          {calendar.navAfter}
                        </div>
                        <div className={styles['paymentDatePickerWeekdays']}>
                          {calendarWeekdays.map((label) => (
                            <span key={`${calendar.key}-weekday-${label}`}>{label}</span>
                          ))}
                        </div>
                        <div className={styles['paymentDatePickerDays']}>
                          {calendar.cells.map((cell, index) => {
                            const dateValue = cell.date;
                            const isInRange = Boolean(
                              dateValue &&
                                cell.isCurrentMonth &&
                                isDateInRange(
                                  dateValue,
                                  draftRequestedDateFrom,
                                  draftRequestedDateTo,
                                ),
                            );
                            const isSelectedStart = Boolean(
                              dateValue &&
                                cell.isCurrentMonth &&
                                draftRequestedDateFrom === dateValue,
                            );
                            const isSelectedEnd = Boolean(
                              dateValue &&
                                cell.isCurrentMonth &&
                                draftRequestedDateTo === dateValue,
                            );

                            return (
                              <button
                                aria-label={dateValue ? formatDate(dateValue) : undefined}
                                className={`${styles['paymentDatePickerDay']} ${
                                  !cell.isCurrentMonth ? styles['paymentDatePickerDayOutside'] : ''
                                } ${isInRange ? styles['paymentDatePickerDayInRange'] : ''} ${
                                  isSelectedStart ? styles['paymentDatePickerDaySelectedStart'] : ''
                                } ${isSelectedEnd ? styles['paymentDatePickerDaySelectedEnd'] : ''}`}
                                disabled={!cell.isCurrentMonth || !dateValue}
                                key={`${calendar.key}-${dateValue ?? 'empty'}-${String(index)}`}
                                onClick={() => {
                                  if (dateValue) {
                                    handleCalendarDateSelect(dateValue);
                                  }
                                }}
                                type='button'
                              >
                                {dateValue ? Number(dateValue.slice(-2)) : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles['paymentDatePickerFooter']}>
                    <div className={styles['paymentDatePickerCopy']}>
                      <p>
                        {draftRangeText === '조회 기간 선택'
                          ? '시작일과 종료일을 선택해 조회 기간을 설정하세요.'
                          : draftRangeText}
                      </p>
                      {datePickerMessage ? (
                        <small className={styles['paymentDatePickerMessage']}>
                          {datePickerMessage}
                        </small>
                      ) : null}
                    </div>
                    <div className={styles['paymentDatePickerActions']}>
                      <button
                        className={styles['tableActionButton']}
                        disabled={
                          !requestedDateFrom &&
                          !requestedDateTo &&
                          !draftRequestedDateFrom &&
                          !draftRequestedDateTo
                        }
                        onClick={handleResetDateFilter}
                        type='button'
                      >
                        초기화
                      </button>
                      <Button
                        disabled={!draftRequestedDateFrom || !draftRequestedDateTo}
                        onClick={handleApplyDateFilter}
                        type='button'
                      >
                        적용
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className={styles['paymentSearchControls']}>
              <UnifiedSearchBar
                className={styles['adminSearchBarWide']}
                inputAriaLabel='결제 검색'
                inputType='text'
                leading={
                  <select
                    aria-label='검색 조건'
                    className={styles['adminSearchSelect']}
                    onChange={(event) => {
                      setSearchField(
                        event.target.value as 'orderNumber' | 'buyerDisplayName' | 'orderName',
                      );
                    }}
                    value={searchField}
                  >
                    <option value='orderNumber'>주문번호</option>
                    <option value='buyerDisplayName'>구매자</option>
                    <option value='orderName'>프로그램명</option>
                  </select>
                }
                onChange={(nextValue) => {
                  setSearchInput(nextValue);
                }}
                onSubmit={handleApplySearch}
                placeholder={
                  searchField === 'orderNumber'
                    ? '주문번호를 입력하세요'
                    : searchField === 'buyerDisplayName'
                      ? '구매자 이름을 입력하세요'
                      : '프로그램명을 입력하세요'
                }
                value={searchInput}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles['salesSummaryGrid']}>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>운영 결제</p>
          <strong className={styles['salesMetricValue']}>{paymentSummary.totalCount}건</strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>결제 완료</p>
          <strong className={styles['salesMetricValue']}>{paymentSummary.completedCount}건</strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>결제 취소</p>
          <strong className={styles['salesMetricValue']}>{paymentSummary.cancelledCount}건</strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>완료 매출</p>
          <strong className={styles['salesMetricValue']}>
            {formatCurrency(paymentSummary.completedRevenue)}
          </strong>
        </article>
      </div>

      <div className={styles['tableWrap']}>
        <table className={`${styles['table']} ${styles['paymentTable']}`}>
          <thead>
            <tr>
              <th scope='col'>프로그램명</th>
              <th scope='col'>주문번호</th>
              <th scope='col'>구매자</th>
              <th scope='col'>결제 수단</th>
              <th scope='col'>상태</th>
              <th scope='col'>결제 금액</th>
              <th scope='col'>결제일</th>
              <th scope='col'>진도율</th>
              <th scope='col'>취소일</th>
              <th scope='col'>관리</th>
            </tr>
          </thead>
          <tbody>
            {displayedPaymentItems.length === 0 ? (
              <tr>
                <td className={styles['emptyTableCell']} colSpan={10}>
                  선택한 기간에 결제 내역이 없습니다.
                </td>
              </tr>
            ) : null}
            {pagedPaymentItems.map((payment) => {
              return (
                <tr key={payment.paymentId}>
                  <td>{payment.orderName}</td>
                  <td title={payment.orderNumber ?? undefined}>
                    {formatOrderNumberPreview(payment.orderNumber)}
                  </td>
                  <td>
                    <span className={styles['cellSecondaryInline']}>
                      {payment.buyerDisplayName} · {payment.buyerLoginId}
                    </span>
                  </td>
                  <td>{formatPaymentMethodLabel(payment.paymentMethod)}</td>
                  <td>{paymentStatusLabels[payment.status]}</td>
                  <td>{formatCurrency(payment.approvedAmount ?? payment.amount)}</td>
                  <td>{formatCompactDateTime(payment.paidAt)}</td>
                  <td>
                    {formatLectureProgressLabel(
                      payment.completedLectureCount,
                      payment.totalLectureCount,
                    )}
                  </td>
                  <td>{formatCompactDateTime(payment.cancelledAt)}</td>
                  <td>
                    <div className={styles['tableActionGroup']}>
                      <button
                        className={styles['tableActionButton']}
                        onClick={() => {
                          handleOpenPaymentDetail(payment.paymentId);
                        }}
                        type='button'
                      >
                        {payment.canCancel ? '결제 취소' : '취소 내역'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className={styles['paginationBar']}>
          <div className={styles['paginationNumbers']}>
            <button
              aria-label='이전 페이지'
              className={styles['paginationArrowButton']}
              disabled={currentPageIndex === 0}
              onClick={() => {
                setCurrentPage(Math.max(0, currentPageIndex - 1));
              }}
              type='button'
            >
              <img
                alt=''
                aria-hidden='true'
                className={`${styles['paginationArrow']} ${styles['paginationArrowPrev']}`}
                src={rightArrowIconSrc}
              />
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                aria-current={pageNumber === currentPageIndex ? 'page' : undefined}
                className={
                  pageNumber === currentPageIndex
                    ? styles['paginationButtonActive']
                    : styles['paginationButton']
                }
                key={`payment-page-${String(pageNumber)}`}
                onClick={() => {
                  setCurrentPage(pageNumber);
                }}
                type='button'
              >
                {String(pageNumber + 1)}
              </button>
            ))}

            <button
              aria-label='다음 페이지'
              className={styles['paginationArrowButton']}
              disabled={currentPageIndex >= totalPages - 1}
              onClick={() => {
                setCurrentPage(Math.min(totalPages - 1, currentPageIndex + 1));
              }}
              type='button'
            >
              <img
                alt=''
                aria-hidden='true'
                className={styles['paginationArrow']}
                src={rightArrowIconSrc}
              />
            </button>
          </div>
        </div>
      ) : null}

      {isPaymentDetailOpen ? (
        <Modal onClose={handleClosePaymentDetail} size='lg' title='결제 상세'>
          <div className={styles['paymentDetailModalBody']}>
            {detailQuery.isPending ? (
              <p className={styles['itemDescription']}>결제 상세를 불러오는 중입니다.</p>
            ) : null}

            {detailQuery.isError ? (
              <p className={styles['itemDescription']}>
                {detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : '결제 상세를 불러오지 못했습니다.'}
              </p>
            ) : null}

            {selectedPayment ? (
              <>
                <section className={styles['paymentDetailSection']}>
                  <p className={styles['replyLabel']}>결제 정보</p>
                  <p className={styles['itemTitle']}>{selectedPayment.orderName}</p>
                  <div className={styles['metaRow']}>
                    <span className={styles['badge']}>
                      {formatOrderTypeLabel(selectedPayment.orderType)}
                    </span>
                    <span className={styles['badgeAccent']}>
                      {paymentStatusLabels[selectedPayment.status]}
                    </span>
                  </div>
                  <div className={styles['paymentDetailGrid']}>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>구매자</span>
                      <strong className={styles['paymentDetailValue']}>
                        {selectedPayment.buyerDisplayName} · {selectedPayment.buyerLoginId}
                      </strong>
                    </div>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>주문번호</span>
                      <strong className={styles['paymentDetailValue']}>
                        {selectedPayment.orderNumber ?? '-'}
                      </strong>
                    </div>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>결제 수단</span>
                      <strong className={styles['paymentDetailValue']}>
                        {formatPaymentMethodLabel(selectedPayment.paymentMethod)}
                      </strong>
                    </div>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>결제 금액</span>
                      <strong className={styles['paymentDetailValue']}>
                        {formatCurrency(selectedPayment.approvedAmount ?? selectedPayment.amount)}
                      </strong>
                    </div>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>결제일</span>
                      <strong className={styles['paymentDetailValue']}>
                        {formatDateTime(selectedPayment.paidAt)}
                      </strong>
                    </div>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>취소일</span>
                      <strong className={styles['paymentDetailValue']}>
                        {formatDateTime(selectedPayment.cancelledAt)}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className={styles['paymentDetailSection']}>
                  <p className={styles['replyLabel']}>수강 정보</p>
                  <div className={styles['paymentDetailGrid']}>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>진도율</span>
                      <strong className={styles['paymentDetailValue']}>
                        {formatLectureProgressLabel(
                          selectedPayment.completedLectureCount ?? 0,
                          selectedPayment.totalLectureCount ?? 0,
                        )}
                      </strong>
                    </div>
                    {selectedPayment.receiptUrl ? (
                      <div className={styles['paymentDetailField']}>
                        <span className={styles['paymentDetailLabel']}>영수증</span>
                        <div className={styles['actionRow']}>
                          <a
                            className={styles['tableActionButton']}
                            href={selectedPayment.receiptUrl}
                            rel='noreferrer'
                            target='_blank'
                          >
                            영수증 보기
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                {selectedPayment.cancelReason ? (
                  <section className={styles['paymentDetailSection']}>
                    <p className={styles['replyLabel']}>취소 정보</p>
                    <div className={styles['paymentDetailField']}>
                      <span className={styles['paymentDetailLabel']}>취소 사유</span>
                      <p className={styles['itemDescription']}>{selectedPayment.cancelReason}</p>
                    </div>
                  </section>
                ) : null}

                {selectedPayment.canCancel ? (
                  <section className={styles['paymentDetailSection']}>
                    <p className={styles['replyLabel']}>결제 취소</p>
                    <div className={styles['replyComposer']}>
                      <p className={styles['paymentDetailNotice']}>
                        결제 취소를 실행하면 KCP 취소 요청과 내부 수강 취소가 함께 진행됩니다.
                      </p>
                      <TextAreaField
                        className={styles['paymentCancelReasonField']}
                        label='취소 사유'
                        name='cancelReason'
                        onChange={(event) => {
                          setCancelReason(event.target.value);
                        }}
                        value={cancelReason}
                      />
                      <Button
                        disabled={cancelMutation.isPending}
                        onClick={handleCancel}
                        type='button'
                      >
                        {cancelMutation.isPending ? '취소 처리 중...' : '결제 취소 처리'}
                      </Button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </section>
  );
};
