import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  updateAdminProgramReservationInquiryStatus,
  type AdminProgramReservationInquiry,
  type ProgramReservationInquiryStatus,
} from '@/api/programReservationInquiries';
import Pagination from '@/components/ui/Pagination/Pagination';
import {
  adminProgramReservationInquiriesQueryKey,
  useAdminProgramReservationInquiriesQuery,
} from '@/query/useProgramReservationInquiriesQuery';
import { useToastStore } from '@/stores/useToastStore';

import styles from './AdminConsolePage.module.scss';

const RESERVATION_INQUIRIES_PAGE_SIZE = 10;

const statusLabels: Record<ProgramReservationInquiryStatus, string> = {
  CLOSED: '종료',
  CONTACTED: '연락완료',
  NEW: '신규',
};

const statusClassNames: Record<ProgramReservationInquiryStatus, string> = {
  CLOSED: 'badge',
  CONTACTED: 'badgeSuccess',
  NEW: 'badgeAccent',
};

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

const getNextStatus = (
  status: ProgramReservationInquiryStatus,
): ProgramReservationInquiryStatus | null => {
  switch (status) {
    case 'NEW':
      return 'CONTACTED';
    case 'CONTACTED':
      return 'CLOSED';
    case 'CLOSED':
      return null;
  }
};

const getStatusActionLabel = (status: ProgramReservationInquiryStatus): string | null => {
  switch (status) {
    case 'NEW':
      return '연락완료';
    case 'CONTACTED':
      return '종료처리';
    case 'CLOSED':
      return null;
  }
};

const ProgramReservationRow = ({
  inquiry,
  isUpdating,
  onUpdateStatus,
}: {
  inquiry: AdminProgramReservationInquiry;
  isUpdating: boolean;
  onUpdateStatus: (inquiryId: number, nextStatus: ProgramReservationInquiryStatus) => void;
}) => {
  const nextStatus = getNextStatus(inquiry.status);
  const actionLabel = getStatusActionLabel(inquiry.status);

  return (
    <tr>
      <td>
        <strong className={styles['adminReservationProgramTitle']}>{inquiry.programTitle}</strong>
      </td>
      <td>
        <div className={styles['stackListCompact']}>
          <strong>{inquiry.applicantName}</strong>
        </div>
      </td>
      <td>{inquiry.phoneNumber}</td>
      <td>{inquiry.specialty?.trim() || '-'}</td>
      <td>{formatDateTime(inquiry.submittedAt)}</td>
      <td>
        <span className={styles[statusClassNames[inquiry.status]]}>
          {statusLabels[inquiry.status]}
        </span>
      </td>
      <td>
        {nextStatus && actionLabel ? (
          <button
            className={styles['tableActionButton']}
            disabled={isUpdating}
            onClick={() => {
              onUpdateStatus(inquiry.id, nextStatus);
            }}
            type='button'
          >
            {isUpdating ? '처리 중' : actionLabel}
          </button>
        ) : (
          <span className={styles['adminReservationNoAction']}>완료</span>
        )}
      </td>
    </tr>
  );
};

const AdminProgramReservationsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [currentPage, setCurrentPage] = useState(1);
  const inquiriesQuery = useAdminProgramReservationInquiriesQuery();
  const updateStatusMutation = useMutation({
    mutationFn: ({
      inquiryId,
      status,
    }: {
      inquiryId: number;
      status: ProgramReservationInquiryStatus;
    }) => updateAdminProgramReservationInquiryStatus(inquiryId, status),
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '예약 문의 상태를 변경하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminProgramReservationInquiriesQueryKey(),
      });
      showToast({
        message: '예약 문의 상태를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  if (inquiriesQuery.isLoading) {
    return <p className={styles['helperText']}>예약 문의 목록을 불러오는 중입니다.</p>;
  }

  if (inquiriesQuery.isError) {
    return (
      <p className={styles['errorText']}>
        {inquiriesQuery.error instanceof Error
          ? inquiriesQuery.error.message
          : '예약 문의 목록을 불러오지 못했습니다.'}
      </p>
    );
  }

  const inquiries = inquiriesQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(inquiries.length / RESERVATION_INQUIRIES_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * RESERVATION_INQUIRIES_PAGE_SIZE;
  const pagedInquiries = inquiries.slice(startIndex, startIndex + RESERVATION_INQUIRIES_PAGE_SIZE);

  return (
    <section>
      <div className={styles['tableWrap']}>
        <table className={`${styles['table']} ${styles['programReservationTable']}`}>
          <thead>
            <tr>
              <th>강의</th>
              <th>신청자</th>
              <th>연락처</th>
              <th>전공분야</th>
              <th>접수일</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {pagedInquiries.length ? (
              pagedInquiries.map((inquiry) => {
                return (
                  <ProgramReservationRow
                    inquiry={inquiry}
                    isUpdating={
                      updateStatusMutation.isPending &&
                      updateStatusMutation.variables.inquiryId === inquiry.id
                    }
                    key={inquiry.id}
                    onUpdateStatus={(inquiryId, status) => {
                      updateStatusMutation.mutate({ inquiryId, status });
                    }}
                  />
                );
              })
            ) : (
              <tr>
                <td className={styles['emptyTableCell']} colSpan={7}>
                  접수된 예약 문의가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inquiries.length > RESERVATION_INQUIRIES_PAGE_SIZE ? (
        <div className={styles['qnaPagination']}>
          <Pagination
            ariaLabel='예약 문의 페이지 이동'
            currentPage={safeCurrentPage}
            onChange={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      ) : null}
    </section>
  );
};

export default AdminProgramReservationsSection;
