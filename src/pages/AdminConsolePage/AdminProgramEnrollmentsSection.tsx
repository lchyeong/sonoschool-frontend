import { Fragment, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { cancelAdminPayment } from '@/api/adminPayments';
import { cancelAdminEnrollment } from '@/api/adminProgramOperations';
import { fetchAdminUserDetail } from '@/api/adminUsers';
import searchIconSrc from '@/assets/icons/search.svg';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import ChevronDownIcon from '@/components/ui/icons/ChevronDownIcon';
import { adminPaymentDetailQueryKey, adminPaymentsQueryKey } from '@/query/useAdminPaymentsQuery';
import {
  adminProgramEnrollmentsQueryKey,
  useAdminProgramEnrollmentsQuery,
} from '@/query/useAdminProgramOperationsQuery';
import {
  adminProgramsLiveQueryKey,
  useAdminProgramsLiveQuery,
} from '@/query/useAdminProgramsLiveQuery';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramEnrollmentItem } from '@/types/adminProgramOperations';
import type { AdminProgramListItem } from '@/types/adminProgramsLive';
import type { AdminUserDetailEnrollmentItem, AdminUserDetailLectureItem } from '@/types/adminUsers';
import { formatPaymentMethodLabel, paymentStatusLabels } from '@/types/payment';

import styles from './AdminConsolePage.module.scss';
import {
  enrollmentStatusLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDurationMinutes,
  getFirstProblemAttempt,
  lectureTypeLabel,
  paymentStatusLabel,
  programTypeLabel as userDetailProgramTypeLabel,
} from './adminUserDetailUtils';

const EMPTY_PROGRAMS: AdminProgramListItem[] = [];
const EMPTY_ENROLLMENTS: AdminProgramEnrollmentItem[] = [];
const PROGRAMS_PAGE_SIZE = 10;
const ENROLLMENTS_PAGE_SIZE = 10;
const HIDDEN_ENROLLMENT_PAYMENT_STATUSES = new Set<AdminProgramEnrollmentItem['paymentStatus']>([
  'APPROVED_PENDING_FULFILLMENT',
  'FAILED',
  'PENDING',
  'REGISTERED',
]);

const programTypeLabel: Record<AdminProgramListItem['programType'], string> = {
  HYBRID: '실습예약 프로그램',
  OFFLINE: '오프라인',
  ONLINE: '온라인',
  PROBLEM_SOLVING: '문제풀이',
};

const catalogStatusLabel: Record<AdminProgramListItem['catalogStatus'], string> = {
  CLOSED: '판매 종료',
  ENDED: '과정 종료',
  FULL: '정원 마감',
  OPEN: '판매중',
  SCHEDULED: '판매 예정',
  STARTED: '개강됨',
};

const practicumScheduleStatusLabel: Partial<Record<string, string>> = {
  ACTIVE: '예약중',
  COMPLETED: '완료',
  NO_SHOW: '불참',
};

const offlineAttendanceStatusLabel: Partial<Record<string, string>> = {
  ABSENT: '결석',
  PRESENT: '출석',
  UNCHECKED: '미체크',
};

const offlineAttendanceStatusClassName: Partial<Record<string, string>> = {
  ABSENT: 'statusTextDanger',
  PRESENT: 'statusTextSuccess',
  UNCHECKED: 'statusTextMuted',
};

const toNumberOrNull = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const resolveEnrollmentStatusLabel = (status: string): string => {
  return enrollmentStatusLabel[status] ?? status;
};

const resolvePaymentStatusLabel = (status: AdminProgramEnrollmentItem['paymentStatus']): string => {
  if (!status) {
    return '결제 정보 없음';
  }

  return paymentStatusLabels[status];
};

const getTimeOrNull = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
};

const resolveCatalogStatusTextClassName = (
  status: AdminProgramListItem['catalogStatus'],
): string => {
  if (status === 'OPEN') {
    return `${styles['statusText']} ${styles['statusTextSuccess']}`;
  }

  if (status === 'FULL' || status === 'SCHEDULED' || status === 'STARTED') {
    return `${styles['statusText']} ${styles['statusTextWarning']}`;
  }

  return `${styles['statusText']} ${styles['statusTextMuted']}`;
};

const resolveEnrollmentStatusTextClassName = (status: string): string => {
  if (status === 'ACTIVE') {
    return `${styles['statusText']} ${styles['statusTextSuccess']}`;
  }

  if (status === 'CANCELLED') {
    return `${styles['statusText']} ${styles['statusTextDanger']}`;
  }

  return `${styles['statusText']} ${styles['statusTextMuted']}`;
};

const resolveProgramEnrollmentLifecycleStatus = (
  item: AdminProgramEnrollmentItem,
): { label: string; className: string; detail: string } => {
  if (item.paymentStatus === 'CANCELLED') {
    return {
      label: '결제취소',
      className: `${styles['statusText']} ${styles['statusTextDanger']}`,
      detail: item.cancelledAt ? `취소일 ${formatDate(item.cancelledAt)}` : '결제 취소',
    };
  }

  if (item.enrollmentStatus === 'CANCELLED') {
    return {
      label: '수강취소',
      className: `${styles['statusText']} ${styles['statusTextDanger']}`,
      detail: '수강권 취소',
    };
  }

  const now = Date.now();
  const enrolledAt = getTimeOrNull(item.enrolledAt);
  const expireAt = getTimeOrNull(item.expireAt);

  if (item.enrollmentStatus === 'EXPIRED' || (expireAt !== null && expireAt <= now)) {
    return {
      label: '만료',
      className: `${styles['statusText']} ${styles['statusTextMuted']}`,
      detail: `만료 ${formatDate(item.expireAt)}`,
    };
  }

  if (item.enrollmentStatus === 'ACTIVE' && enrolledAt !== null && enrolledAt > now) {
    return {
      label: '수강예정',
      className: `${styles['statusText']} ${styles['statusTextWarning']}`,
      detail: `${formatDate(item.enrolledAt)} 시작`,
    };
  }

  if (item.enrollmentStatus === 'ACTIVE') {
    return {
      label: '수강중',
      className: `${styles['statusText']} ${styles['statusTextSuccess']}`,
      detail: item.expireAt ? `만료 ${formatDate(item.expireAt)}` : '수강중',
    };
  }

  return {
    label: resolveEnrollmentStatusLabel(item.enrollmentStatus),
    className: resolveEnrollmentStatusTextClassName(item.enrollmentStatus),
    detail: resolveEnrollmentStatusLabel(item.enrollmentStatus),
  };
};

const resolvePaymentStatusTextClassName = (
  status: AdminProgramEnrollmentItem['paymentStatus'],
): string => {
  if (status === 'COMPLETED') {
    return `${styles['statusText']} ${styles['statusTextSuccess']}`;
  }

  if (status === 'CANCELLED' || status === 'FAILED') {
    return `${styles['statusText']} ${styles['statusTextDanger']}`;
  }

  const isPendingStatus =
    status === 'PENDING' || status === 'REGISTERED' || status === 'APPROVED_PENDING_FULFILLMENT';

  if (isPendingStatus) {
    return `${styles['statusText']} ${styles['statusTextWarning']}`;
  }

  return `${styles['statusText']} ${styles['statusTextMuted']}`;
};

const resolveUserDetailPaymentStatusLabel = (status: string): string => {
  const paymentStatusTextMap: Partial<Record<string, string>> = paymentStatusLabels;
  const userDetailPaymentStatusTextMap: Partial<Record<string, string>> = paymentStatusLabel;

  return paymentStatusTextMap[status] ?? userDetailPaymentStatusTextMap[status] ?? status;
};

const formatTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
  }).format(new Date(value));
};

const formatScheduleWindow = (startAt: string | null, endAt: string | null): string => {
  if (!startAt && !endAt) {
    return '-';
  }

  if (!startAt) {
    return formatTime(endAt);
  }

  return `${formatDateTime(startAt)} ~ ${formatTime(endAt)}`;
};

const getPrimaryOfflineSchedule = (
  schedules: NonNullable<AdminUserDetailLectureItem['schedules']>,
) => {
  const offlineSchedules = schedules.filter((schedule) => schedule.scheduleKind === 'OFFLINE');

  if (!offlineSchedules.length) {
    return null;
  }

  return (
    offlineSchedules.find((schedule) => schedule.status && schedule.status !== 'UNCHECKED') ??
    offlineSchedules[0]
  );
};

const getProgramEnrollmentCount = (program: AdminProgramListItem | null): number => {
  if (!program) {
    return 0;
  }

  return program.activeEnrollmentCount ?? program.currentStudents;
};

const formatProgramStudentCount = (program: AdminProgramListItem): string => {
  const activeEnrollmentCount = getProgramEnrollmentCount(program);

  return `${String(activeEnrollmentCount)}명`;
};

const AdminProgramEnrollmentsSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [programSearchKeyword, setProgramSearchKeyword] = useState('');
  const requestedProgramId = toNumberOrNull(searchParams.get('programId'));
  const programsQuery = useAdminProgramsLiveQuery();
  const programs = programsQuery.data ?? EMPTY_PROGRAMS;
  const filteredPrograms = useMemo(() => {
    const normalizedKeyword = programSearchKeyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return programs;
    }

    return programs.filter((program) => {
      return [
        program.title,
        program.categoryName,
        programTypeLabel[program.programType],
        catalogStatusLabel[program.catalogStatus],
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword);
    });
  }, [programSearchKeyword, programs]);
  const totalProgramPages = Math.max(1, Math.ceil(filteredPrograms.length / PROGRAMS_PAGE_SIZE));
  const requestedProgramPageIndex = useMemo(() => {
    if (requestedProgramId === null) {
      return null;
    }

    const selectedProgramIndex = filteredPrograms.findIndex(
      (program) => program.id === requestedProgramId,
    );

    if (selectedProgramIndex < 0) {
      return null;
    }

    return Math.floor(selectedProgramIndex / PROGRAMS_PAGE_SIZE);
  }, [filteredPrograms, requestedProgramId]);
  const safeCurrentPageIndex = Math.min(
    requestedProgramPageIndex ?? currentPageIndex,
    totalProgramPages - 1,
  );
  const pagedPrograms = useMemo(() => {
    const startIndex = safeCurrentPageIndex * PROGRAMS_PAGE_SIZE;

    return filteredPrograms.slice(startIndex, startIndex + PROGRAMS_PAGE_SIZE);
  }, [filteredPrograms, safeCurrentPageIndex]);
  const pageNumbers = useMemo(() => {
    const startPage = Math.max(0, safeCurrentPageIndex - 2);
    const endPage = Math.min(totalProgramPages, startPage + 5);

    return Array.from({ length: endPage - startPage }, (_, index) => startPage + index);
  }, [safeCurrentPageIndex, totalProgramPages]);
  const selectedProgram =
    requestedProgramId === null
      ? null
      : (programs.find((program) => program.id === requestedProgramId) ?? null);
  const selectedProgramId = selectedProgram?.id ?? null;
  const enrollmentsQuery = useAdminProgramEnrollmentsQuery(selectedProgramId);
  const enrollments = enrollmentsQuery.data ?? EMPTY_ENROLLMENTS;

  const handleProgramSelect = (programId: number) => {
    if (selectedProgramId === programId) {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ programId: String(programId) }, { replace: true });
  };

  const handlePageChange = (nextPageIndex: number) => {
    setCurrentPageIndex(nextPageIndex);
    setSearchParams({}, { replace: true });
  };

  const handleProgramSearchChange = (nextValue: string) => {
    setProgramSearchKeyword(nextValue);
    setCurrentPageIndex(0);
    setSearchParams({}, { replace: true });
  };

  const handleProgramSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPageIndex(0);
    setSearchParams({}, { replace: true });
  };

  return (
    <section className={styles['workspace']}>
      <section className={styles['panelWide']}>
        <div className={styles['panelToolbar']}>
          <div className={styles['cellStack']}>
            <h2 className={styles['panelTitle']}>프로그램 목록</h2>
          </div>
          <span className={styles['programEnrollmentTotalText']}>
            전체 {String(programs.length)}개
          </span>
        </div>

        {programsQuery.isPending ? (
          <p className={styles['helperText']}>프로그램 목록을 불러오는 중입니다.</p>
        ) : null}
        {programsQuery.isError ? (
          <p className={styles['helperText']}>
            {programsQuery.error instanceof Error
              ? programsQuery.error.message
              : '프로그램 목록을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!programsQuery.isPending && !programsQuery.isError ? (
          <>
            <div className={styles['programEnrollmentTableToolbar']}>
              <form
                aria-label='프로그램 검색'
                className={styles['programEnrollmentSearchField']}
                onSubmit={handleProgramSearchSubmit}
              >
                <input
                  aria-label='프로그램명 검색'
                  className={`${styles['searchInput']} ${styles['programEnrollmentSearchInput']}`}
                  onChange={(event) => {
                    handleProgramSearchChange(event.target.value);
                  }}
                  placeholder='프로그램명 검색'
                  type='search'
                  value={programSearchKeyword}
                />
                <button
                  aria-label='프로그램 검색'
                  className={styles['programEnrollmentSearchButton']}
                  type='submit'
                >
                  <img
                    alt=''
                    aria-hidden='true'
                    className={styles['programEnrollmentSearchIcon']}
                    src={searchIconSrc}
                  />
                </button>
              </form>
            </div>
            <ProgramBoardTable
              emptyMessage={
                programSearchKeyword.trim()
                  ? '검색 결과가 없습니다.'
                  : '등록된 프로그램이 없습니다.'
              }
              expandedContent={
                selectedProgram ? (
                  <ProgramEnrollmentDropdown
                    errorMessage={
                      enrollmentsQuery.error instanceof Error
                        ? enrollmentsQuery.error.message
                        : '수강생 목록을 불러오지 못했습니다.'
                    }
                    enrollments={enrollments}
                    isError={enrollmentsQuery.isError}
                    isPending={enrollmentsQuery.isPending}
                    key={selectedProgram.id}
                    selectedProgram={selectedProgram}
                  />
                ) : null
              }
              items={pagedPrograms}
              onSelect={handleProgramSelect}
              pageOffset={safeCurrentPageIndex * PROGRAMS_PAGE_SIZE}
              selectedProgramId={selectedProgramId}
            />
            <ProgramPagination
              currentPageIndex={safeCurrentPageIndex}
              pageNumbers={pageNumbers}
              totalPages={totalProgramPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : null}
      </section>
    </section>
  );
};

const ProgramPagination = ({
  currentPageIndex,
  onPageChange,
  pageNumbers,
  totalPages,
}: {
  currentPageIndex: number;
  onPageChange: (pageIndex: number) => void;
  pageNumbers: number[];
  totalPages: number;
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={styles['paginationBar']}>
      <div className={styles['paginationNumbers']}>
        <button
          className={styles['paginationArrowButton']}
          disabled={currentPageIndex === 0}
          onClick={() => {
            onPageChange(Math.max(0, currentPageIndex - 1));
          }}
          type='button'
        >
          이전
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            aria-current={pageNumber === currentPageIndex ? 'page' : undefined}
            className={
              pageNumber === currentPageIndex
                ? styles['paginationButtonActive']
                : styles['paginationButton']
            }
            key={pageNumber}
            onClick={() => {
              onPageChange(pageNumber);
            }}
            type='button'
          >
            {String(pageNumber + 1)}
          </button>
        ))}
        <button
          className={styles['paginationArrowButton']}
          disabled={currentPageIndex >= totalPages - 1}
          onClick={() => {
            onPageChange(Math.min(totalPages - 1, currentPageIndex + 1));
          }}
          type='button'
        >
          다음
        </button>
      </div>
    </div>
  );
};

const ProgramEnrollmentDropdown = ({
  enrollments,
  errorMessage,
  isError,
  isPending,
  selectedProgram,
}: {
  enrollments: AdminProgramEnrollmentItem[];
  errorMessage: string;
  isError: boolean;
  isPending: boolean;
  selectedProgram: AdminProgramListItem;
}) => {
  const [currentEnrollmentPageIndex, setCurrentEnrollmentPageIndex] = useState(0);
  const [selectedEnrollment, setSelectedEnrollment] = useState<AdminProgramEnrollmentItem | null>(
    null,
  );
  const visibleEnrollments = useMemo(() => {
    return enrollments.filter(
      (item) => !HIDDEN_ENROLLMENT_PAYMENT_STATUSES.has(item.paymentStatus),
    );
  }, [enrollments]);
  const totalEnrollmentPages = Math.max(
    1,
    Math.ceil(visibleEnrollments.length / ENROLLMENTS_PAGE_SIZE),
  );
  const safeEnrollmentPageIndex = Math.min(currentEnrollmentPageIndex, totalEnrollmentPages - 1);
  const pagedEnrollments = useMemo(() => {
    const startIndex = safeEnrollmentPageIndex * ENROLLMENTS_PAGE_SIZE;

    return visibleEnrollments.slice(startIndex, startIndex + ENROLLMENTS_PAGE_SIZE);
  }, [safeEnrollmentPageIndex, visibleEnrollments]);
  const enrollmentPageNumbers = useMemo(() => {
    const startPage = Math.max(0, safeEnrollmentPageIndex - 2);
    const endPage = Math.min(totalEnrollmentPages, startPage + 5);

    return Array.from({ length: endPage - startPage }, (_, index) => startPage + index);
  }, [safeEnrollmentPageIndex, totalEnrollmentPages]);

  return (
    <div className={styles['programEnrollmentDropdown']}>
      <div className={styles['programEnrollmentDropdownHeader']}>
        <div className={styles['cellInlineGroup']}>
          <strong className={styles['cellPrimary']}>회원 리스트</strong>
          <span className={styles['cellSecondary']}>{selectedProgram.title}</span>
        </div>
        <div className={styles['programEnrollmentSummaryGroup']}>
          <span className={styles['programEnrollmentSummaryText']}>
            전체 {String(visibleEnrollments.length)}명
          </span>
        </div>
      </div>

      {isPending ? <p className={styles['helperText']}>수강생 목록을 불러오는 중입니다.</p> : null}
      {isError ? <p className={styles['helperText']}>{errorMessage}</p> : null}

      {!isPending && !isError ? (
        <>
          <ProgramEnrollmentTable items={pagedEnrollments} onOpenDetail={setSelectedEnrollment} />
          <ProgramPagination
            currentPageIndex={safeEnrollmentPageIndex}
            pageNumbers={enrollmentPageNumbers}
            totalPages={totalEnrollmentPages}
            onPageChange={setCurrentEnrollmentPageIndex}
          />
        </>
      ) : null}

      {selectedEnrollment ? (
        <ProgramEnrollmentDetailModal
          enrollmentItem={selectedEnrollment}
          onClose={() => {
            setSelectedEnrollment(null);
          }}
          selectedProgram={selectedProgram}
        />
      ) : null}
    </div>
  );
};

const ProgramBoardTable = ({
  emptyMessage,
  expandedContent,
  items,
  onSelect,
  pageOffset,
  selectedProgramId,
}: {
  emptyMessage: string;
  expandedContent: ReactNode;
  items: AdminProgramListItem[];
  onSelect: (programId: number) => void;
  pageOffset: number;
  selectedProgramId: number | null;
}) => {
  return (
    <div className={styles['tableWrap']}>
      <table className={`${styles['table']} ${styles['programEnrollmentProgramTable']}`}>
        <thead>
          <tr>
            <th scope='col'>번호</th>
            <th scope='col'>프로그램명</th>
            <th scope='col'>유형</th>
            <th scope='col'>판매 상태</th>
            <th scope='col'>수강생</th>
            <th scope='col'>
              <span className={styles['srOnly']}>펼침</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((program, index) => {
              const isSelected = program.id === selectedProgramId;

              return (
                <Fragment key={program.id}>
                  <tr
                    aria-expanded={isSelected}
                    aria-selected={isSelected}
                    className={
                      isSelected
                        ? `${styles['clickableTableRow']} ${styles['selectedTableRow']}`
                        : styles['clickableTableRow']
                    }
                    onClick={() => {
                      onSelect(program.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return;
                      }

                      event.preventDefault();
                      onSelect(program.id);
                    }}
                    tabIndex={0}
                  >
                    <td>{String(pageOffset + index + 1)}</td>
                    <td>
                      <button
                        className={styles['boardTitleButton']}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(program.id);
                        }}
                        type='button'
                      >
                        <span className={styles['cellPrimary']}>{program.title}</span>
                      </button>
                    </td>
                    <td>{programTypeLabel[program.programType]}</td>
                    <td>
                      <span className={resolveCatalogStatusTextClassName(program.catalogStatus)}>
                        {catalogStatusLabel[program.catalogStatus]}
                      </span>
                    </td>
                    <td>{formatProgramStudentCount(program)}</td>
                    <td className={styles['programEnrollmentToggleCell']}>
                      <span
                        aria-hidden='true'
                        className={
                          isSelected
                            ? `${styles['programEnrollmentChevron']} ${styles['programEnrollmentChevronOpen']}`
                            : styles['programEnrollmentChevron']
                        }
                      >
                        <ChevronDownIcon />
                      </span>
                    </td>
                  </tr>
                  {isSelected && expandedContent ? (
                    <tr className={styles['programEnrollmentDropdownRow']}>
                      <td colSpan={6}>{expandedContent}</td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          ) : (
            <tr>
              <td className={styles['emptyTableCell']} colSpan={6}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const ProgramEnrollmentTable = ({
  items,
  onOpenDetail,
}: {
  items: AdminProgramEnrollmentItem[];
  onOpenDetail: (item: AdminProgramEnrollmentItem) => void;
}) => {
  return (
    <div className={styles['tableWrap']}>
      <table className={`${styles['table']} ${styles['programStudentEnrollmentTable']}`}>
        <thead>
          <tr>
            <th scope='col'>이름</th>
            <th scope='col'>아이디</th>
            <th scope='col'>연락처</th>
            <th scope='col'>수강 상태</th>
            <th scope='col'>결제</th>
            <th scope='col'>결제일</th>
            <th scope='col'>수강 기간</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item) => {
              const lifecycleStatus = resolveProgramEnrollmentLifecycleStatus(item);

              return (
                <tr
                  aria-label={`${item.userName} 수강 상세 보기`}
                  className={styles['programEnrollmentStudentRow']}
                  key={item.enrollmentId}
                  onClick={() => {
                    onOpenDetail(item);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                      return;
                    }

                    event.preventDefault();
                    onOpenDetail(item);
                  }}
                  role='button'
                  tabIndex={0}
                >
                  <td>
                    <strong className={styles['cellPrimary']}>{item.userName}</strong>
                  </td>
                  <td>
                    <span className={styles['cellSecondary']}>{item.loginId}</span>
                  </td>
                  <td>{item.phoneNumber || '-'}</td>
                  <td>
                    <span className={lifecycleStatus.className}>{lifecycleStatus.label}</span>
                  </td>
                  <td>
                    <span className={resolvePaymentStatusTextClassName(item.paymentStatus)}>
                      {resolvePaymentStatusLabel(item.paymentStatus)}
                    </span>
                  </td>
                  <td>{formatDate(item.paidAt)}</td>
                  <td>
                    <span className={`${styles['cellSecondary']} ${styles['cellNoWrap']}`}>
                      {formatDate(item.enrolledAt)} ~ {formatDate(item.expireAt)}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className={styles['emptyTableCell']} colSpan={7}>
                표시할 수강생이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const ProgramEnrollmentDetailModal = ({
  enrollmentItem,
  onClose,
  selectedProgram,
}: {
  enrollmentItem: AdminProgramEnrollmentItem;
  onClose: () => void;
  selectedProgram: AdminProgramListItem;
}) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const detailQuery = useQuery({
    queryFn: () => fetchAdminUserDetail(enrollmentItem.userId),
    queryKey: ['adminUserDetail', enrollmentItem.userId],
    staleTime: 15 * 1000,
  });
  const cancelPaymentMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: number; reason: string }) =>
      cancelAdminPayment(paymentId, { reason }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '결제 취소 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        detailQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: adminProgramEnrollmentsQueryKey(selectedProgram.id),
        }),
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
        queryClient.invalidateQueries({ queryKey: ['adminEnrollments'] }),
        queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
        queryClient.invalidateQueries({ queryKey: adminPaymentsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: adminPaymentDetailQueryKey(variables.paymentId),
        }),
      ]);
      showToast({
        message: '결제 취소를 반영했습니다.',
        variant: 'success',
      });
      onClose();
    },
  });
  const cancelEnrollmentMutation = useMutation({
    mutationFn: ({ enrollmentId, reason }: { enrollmentId: number; reason: string }) =>
      cancelAdminEnrollment(enrollmentId, { reason }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '수강권 회수에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        detailQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: adminProgramEnrollmentsQueryKey(selectedProgram.id),
        }),
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
        queryClient.invalidateQueries({ queryKey: ['adminEnrollments'] }),
        queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
      ]);
      showToast({
        message: '수강권을 회수했습니다.',
        variant: 'success',
      });
      onClose();
    },
  });
  const enrollmentDetail =
    detailQuery.data?.enrollments.find(
      (enrollment) => enrollment.enrollmentId === enrollmentItem.enrollmentId,
    ) ??
    detailQuery.data?.enrollments.find((enrollment) => {
      return enrollment.programId === selectedProgram.id;
    }) ??
    null;
  const handleCancelEnrollment = () => {
    const reason = window.prompt('수강권 회수 사유를 입력해 주세요.');
    if (!reason?.trim()) {
      return;
    }

    cancelEnrollmentMutation.mutate({
      enrollmentId: enrollmentItem.enrollmentId,
      reason: reason.trim(),
    });
  };
  const handleCancelPayment = () => {
    const paymentId = enrollmentItem.paymentId;
    if (paymentId === null) {
      return;
    }

    const reason = window.prompt('결제 취소 사유를 입력해 주세요.');
    if (!reason?.trim()) {
      return;
    }

    cancelPaymentMutation.mutate({
      paymentId,
      reason: reason.trim(),
    });
  };

  return (
    <Modal
      bodyClassName={styles['programEnrollmentDetailModalBody']}
      description={`${enrollmentItem.userName} · ${enrollmentItem.loginId}`}
      onClose={onClose}
      panelClassName={styles['programEnrollmentDetailModalPanel']}
      size='lg'
      title='수강 상세'
    >
      {detailQuery.isPending ? (
        <p className={styles['helperText']}>수강 상세를 불러오는 중입니다.</p>
      ) : null}
      {detailQuery.isError ? (
        <p className={styles['helperText']}>
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : '수강 상세를 불러오지 못했습니다.'}
        </p>
      ) : null}
      {!detailQuery.isPending && !detailQuery.isError ? (
        enrollmentDetail ? (
          <ProgramEnrollmentDetailContent
            cancelEnrollmentLoading={cancelEnrollmentMutation.isPending}
            cancelPaymentLoading={cancelPaymentMutation.isPending}
            enrollment={enrollmentDetail}
            enrollmentItem={enrollmentItem}
            onCancelEnrollment={handleCancelEnrollment}
            onCancelPayment={handleCancelPayment}
          />
        ) : (
          <p className={styles['helperText']}>해당 프로그램의 수강 상세가 없습니다.</p>
        )
      ) : null}
    </Modal>
  );
};

const ProgramEnrollmentDetailContent = ({
  cancelEnrollmentLoading,
  cancelPaymentLoading,
  enrollment,
  enrollmentItem,
  onCancelEnrollment,
  onCancelPayment,
}: {
  cancelEnrollmentLoading: boolean;
  cancelPaymentLoading: boolean;
  enrollment: AdminUserDetailEnrollmentItem;
  enrollmentItem: AdminProgramEnrollmentItem;
  onCancelEnrollment: () => void;
  onCancelPayment: () => void;
}) => {
  const paymentAmount = enrollment.payment
    ? formatCurrency(enrollment.payment.approvedAmount ?? enrollment.payment.amount)
    : '-';
  const paymentMeta = enrollment.payment
    ? [
        resolveUserDetailPaymentStatusLabel(enrollment.payment.paymentStatus),
        formatPaymentMethodLabel(enrollment.payment.paymentMethod),
        formatDate(enrollment.payment.paidAt ?? enrollment.payment.requestedAt),
      ].join(' · ')
    : '결제 정보 없음';
  const canCancelEnrollment =
    enrollmentItem.canCancelEnrollment &&
    enrollment.current &&
    enrollment.enrollmentStatus === 'ACTIVE';
  const canCancelPayment = enrollmentItem.canCancelPayment && enrollmentItem.paymentId !== null;
  const lifecycleStatus = resolveProgramEnrollmentLifecycleStatus(enrollmentItem);

  return (
    <div className={styles['programEnrollmentDetailContent']}>
      <section className={styles['programEnrollmentDetailMetrics']}>
        <div>
          <span>수강생</span>
          <strong>{enrollmentItem.userName}</strong>
          <small>{enrollmentItem.loginId}</small>
        </div>
        <div>
          <span>프로그램</span>
          <strong>{enrollment.programTitle}</strong>
          <small>
            {userDetailProgramTypeLabel[enrollment.programType] ?? enrollment.programType}
          </small>
        </div>
        <div>
          <span>진도율</span>
          <strong>{String(enrollment.completionRate)}%</strong>
          <small>
            {String(enrollment.completedLectureCount)} / {String(enrollment.totalLectureCount)}강
            완료
          </small>
        </div>
        <div>
          <span>문제</span>
          <strong>{String(enrollment.attemptedProblemLectureCount)}강 응시</strong>
          <small>전체 {String(enrollment.totalProblemLectureCount)}강</small>
        </div>
        <div>
          <span>수강 기간</span>
          <strong>{formatDate(enrollment.enrolledAt)}</strong>
          <small>만료 {formatDate(enrollment.expireAt)}</small>
        </div>
        <div>
          <span>학습 기록</span>
          <strong>{formatDateTime(enrollment.lastLearningAt)}</strong>
          <small>첫 학습 {formatDateTime(enrollment.firstLearningAt)}</small>
        </div>
        <div>
          <span>결제</span>
          <strong>{paymentAmount}</strong>
          <small>{paymentMeta}</small>
        </div>
        <div>
          <span>상태</span>
          <strong>{lifecycleStatus.label}</strong>
          <small>{lifecycleStatus.detail}</small>
        </div>
      </section>

      {canCancelEnrollment || canCancelPayment ? (
        <section className={styles['programEnrollmentDetailSection']}>
          <div className={styles['actionRow']}>
            {canCancelEnrollment ? (
              <Button
                disabled={cancelEnrollmentLoading || cancelPaymentLoading}
                onClick={onCancelEnrollment}
                size='sm'
                type='button'
                variant='danger'
              >
                {cancelEnrollmentLoading ? '회수 중...' : '수강권 회수'}
              </Button>
            ) : null}
            {canCancelPayment ? (
              <Button
                disabled={cancelEnrollmentLoading || cancelPaymentLoading}
                onClick={onCancelPayment}
                size='sm'
                type='button'
                variant='danger'
              >
                {cancelPaymentLoading ? '취소 처리 중...' : '결제 취소'}
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={styles['programEnrollmentDetailSection']}>
        <h3 className={styles['programEnrollmentDetailSectionTitle']}>강의별 학습 기록</h3>
        <div className={`${styles['tableWrap']} ${styles['programEnrollmentDetailTableWrap']}`}>
          <table className={`${styles['table']} ${styles['programEnrollmentDetailLectureTable']}`}>
            <thead>
              <tr>
                <th scope='col'>강의</th>
                <th scope='col'>형태</th>
                <th scope='col'>진도율</th>
                <th scope='col'>일정/예약</th>
                <th scope='col'>학습 기록</th>
                <th scope='col'>문제 결과</th>
              </tr>
            </thead>
            <tbody>
              {enrollment.lectures.length ? (
                enrollment.lectures.map((lecture) => (
                  <ProgramEnrollmentDetailLectureRow key={lecture.lectureId} lecture={lecture} />
                ))
              ) : (
                <tr>
                  <td className={styles['emptyTableCell']} colSpan={6}>
                    등록된 강의가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const ProgramEnrollmentDetailLectureRow = ({
  lecture,
}: {
  lecture: AdminUserDetailLectureItem;
}) => {
  const firstAttempt = getFirstProblemAttempt(lecture.problem);
  const problemResult = lecture.problem
    ? firstAttempt
      ? [
          `${String(firstAttempt.correctAnswerCount)} / ${String(firstAttempt.questionCount)} 정답`,
          `${String(firstAttempt.score)}점`,
        ].join(' · ')
      : `미응시 · ${String(lecture.problem.questionCount)}문항`
    : '-';
  const problemMeta =
    firstAttempt && lecture.problem
      ? [
          firstAttempt.passed ? '통과' : '미통과',
          `최초 제출 ${formatDateTime(firstAttempt.submittedAt)}`,
        ].join(' · ')
      : null;

  return (
    <tr>
      <td>
        <div className={styles['cellStack']}>
          <span className={styles['cellSecondary']}>{lecture.sectionTitle}</span>
          <strong className={styles['cellPrimary']}>{lecture.lectureTitle}</strong>
        </div>
      </td>
      <td>{lectureTypeLabel[lecture.lectureType] ?? lecture.lectureType}</td>
      <td>{String(lecture.progressRate)}%</td>
      <td>
        <ProgramEnrollmentLectureScheduleCell lecture={lecture} />
      </td>
      <td>
        <div className={styles['cellStack']}>
          <span className={styles['cellSecondary']}>
            {formatDurationMinutes(lecture.watchedSeconds)} /{' '}
            {formatDurationMinutes(lecture.durationSeconds)}
          </span>
          <span className={styles['cellSecondary']}>
            마지막 학습 {formatDateTime(lecture.lastWatchedAt)}
          </span>
        </div>
      </td>
      <td>
        <div className={styles['cellStack']}>
          <span className={styles['cellPrimary']}>{problemResult}</span>
          {problemMeta ? <span className={styles['cellSecondary']}>{problemMeta}</span> : null}
        </div>
      </td>
    </tr>
  );
};

const ProgramEnrollmentLectureScheduleCell = ({
  lecture,
}: {
  lecture: AdminUserDetailLectureItem;
}) => {
  const schedules = lecture.schedules ?? [];
  const practicumSchedules = schedules.filter((schedule) => schedule.scheduleKind === 'PRACTICUM');
  const offlineSchedule = getPrimaryOfflineSchedule(schedules);

  if (!schedules.length) {
    return <span className={styles['cellSecondary']}>-</span>;
  }

  if (offlineSchedule) {
    const attendanceStatus = offlineSchedule.status ?? 'UNCHECKED';
    const attendanceStatusClassName =
      offlineAttendanceStatusClassName[attendanceStatus] ?? 'statusTextMuted';

    return (
      <div className={styles['programEnrollmentScheduleStack']}>
        <span className={styles['cellPrimary']}>
          {formatScheduleWindow(offlineSchedule.startAt, offlineSchedule.endAt)}
        </span>
        <span className={`${styles['statusText']} ${styles[attendanceStatusClassName]}`}>
          {offlineAttendanceStatusLabel[attendanceStatus] ?? attendanceStatus}
          {offlineSchedule.location ? ` · ${offlineSchedule.location}` : ''}
        </span>
      </div>
    );
  }

  return (
    <div className={styles['cellStack']}>
      {practicumSchedules.map((schedule) => {
        const scheduleKey = `${schedule.scheduleKind}-${String(
          schedule.reservationId ?? schedule.offlineScheduleRuleId,
        )}-${schedule.startAt ?? 'none'}`;

        const capacityLabel =
          schedule.maxCapacity === null
            ? `${String(schedule.reservedCount ?? 0)}명 예약`
            : `${String(schedule.reservedCount ?? 0)} / ${String(schedule.maxCapacity)}명`;

        return (
          <div className={styles['programEnrollmentScheduleStack']} key={scheduleKey}>
            <span className={styles['cellPrimary']}>
              실습 {formatScheduleWindow(schedule.startAt, schedule.endAt)}
            </span>
            <span className={styles['cellSecondary']}>
              {practicumScheduleStatusLabel[schedule.status ?? ''] ?? schedule.status ?? '예약'} ·{' '}
              {capacityLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default AdminProgramEnrollmentsSection;
