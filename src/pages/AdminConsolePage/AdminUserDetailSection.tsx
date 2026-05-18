import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { createAdminEnrollment } from '@/api/adminEnrollments';
import { fetchAdminProblemAttemptReport } from '@/api/adminProblemAttempts';
import { cancelAdminEnrollment } from '@/api/adminProgramOperations';
import { fetchAdminUserDetail, resetAdminUserCertificateProfile } from '@/api/adminUsers';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import {
  adminProgramsLiveQueryKey,
  useAdminProgramsLiveQuery,
} from '@/query/useAdminProgramsLiveQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramListItem } from '@/types/adminProgramsLive';
import type { StudentProblemAttemptReport } from '@/types/studentProblems';

import styles from './AdminConsolePage.module.scss';
import AdminUserDetailView from './AdminUserDetailView';
import AdminUserProblemReportModal from './AdminUserProblemReportModal';

const AdminUserDetailSection = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const userId = Number(params['userId']);
  const isValidUserId = Number.isFinite(userId);

  const detailQuery = useQuery({
    enabled: isValidUserId,
    gcTime: 60 * 1000,
    queryFn: () => fetchAdminUserDetail(userId),
    queryKey: ['adminUserDetail', userId],
    staleTime: 15 * 1000,
  });

  const currentEnrollments = useMemo(() => {
    return (detailQuery.data?.enrollments ?? []).filter((enrollment) => enrollment.current);
  }, [detailQuery.data]);

  const [expandedProblemIds, setExpandedProblemIds] = useState<Set<number>>(() => new Set());
  const [expandedEnrollmentIds, setExpandedEnrollmentIds] = useState<Set<number>>(() => new Set());
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<number>>(() => new Set());
  const [problemReport, setProblemReport] = useState<StudentProblemAttemptReport | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedGrantProgramId, setSelectedGrantProgramId] = useState<string>('');

  const programsQuery = useAdminProgramsLiveQuery(isValidUserId);

  const currentProgramIds = useMemo(() => {
    return new Set(currentEnrollments.map((enrollment) => enrollment.programId));
  }, [currentEnrollments]);

  const reportMutation = useMutation({
    mutationFn: fetchAdminProblemAttemptReport,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 결과 리포트를 불러오지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (report) => {
      setProblemReport(report);
    },
  });

  const certificateResetMutation = useMutation({
    mutationFn: ({ reason, targetUserId }: { reason: string; targetUserId: number }) =>
      resetAdminUserCertificateProfile(targetUserId, reason),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '수료증 이름을 초기화하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await detailQuery.refetch();
      showToast({
        message: '수료증 이름을 초기화했습니다.',
        variant: 'success',
      });
    },
  });

  const grantEnrollmentMutation = useMutation({
    mutationFn: ({ programId, targetUserId }: { programId: number; targetUserId: number }) =>
      createAdminEnrollment({
        programId,
        userId: targetUserId,
      }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '수강권 지급에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setGrantModalOpen(false);
      setSelectedGrantProgramId('');
      await Promise.all([
        detailQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
        queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
      ]);
      showToast({
        message: '수강권을 지급했습니다.',
        variant: 'success',
      });
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
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
        queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
      ]);
      showToast({
        message: '수강권을 회수했습니다.',
        variant: 'success',
      });
    },
  });

  const handleToggleProblem = (lectureId: number) => {
    setExpandedProblemIds((current) => {
      const next = new Set(current);
      if (next.has(lectureId)) {
        next.delete(lectureId);
      } else {
        next.add(lectureId);
      }
      return next;
    });
  };

  const handleToggleEnrollment = (enrollmentId: number) => {
    setExpandedEnrollmentIds((current) => {
      const next = new Set(current);
      if (next.has(enrollmentId)) {
        next.delete(enrollmentId);
      } else {
        next.add(enrollmentId);
        window.setTimeout(() => {
          const target = document.querySelector<HTMLElement>(
            `[data-user-enrollment-id="${String(enrollmentId)}"]`,
          );
          if (target && 'scrollIntoView' in target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          target?.focus({ preventScroll: true });
        }, 0);
      }
      return next;
    });
  };

  const handleToggleQuestion = (questionId: number) => {
    setExpandedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  if (!isValidUserId) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>회원 상세</h1>
        <p className={styles['stateDescription']}>잘못된 회원 경로입니다.</p>
      </section>
    );
  }

  return (
    <section className={styles['workspace']}>
      <div className={styles['detailActionBar']}>
        <Link className={styles['detailBackButton']} to={routePaths.adminEnrollments}>
          목록으로
        </Link>
      </div>

      {detailQuery.isPending ? (
        <section className={styles['stateSection']}>
          <p className={styles['stateDescription']}>회원 상세 정보를 불러오는 중입니다.</p>
        </section>
      ) : null}
      {detailQuery.isError ? (
        <section className={styles['stateSection']}>
          <p className={styles['stateDescription']}>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : '회원 상세 정보를 불러오지 못했습니다.'}
          </p>
        </section>
      ) : null}
      {detailQuery.data ? (
        <AdminUserDetailView
          currentEnrollments={currentEnrollments}
          expandedEnrollmentIds={expandedEnrollmentIds}
          expandedProblemIds={expandedProblemIds}
          expandedQuestionIds={expandedQuestionIds}
          onOpenReport={(attemptId) => {
            reportMutation.mutate(attemptId);
          }}
          onOpenGrantEnrollment={() => {
            setGrantModalOpen(true);
          }}
          onResetCertificateProfile={() => {
            const reason = window.prompt('수료증 이름 초기화 사유를 입력해 주세요.');
            if (!reason?.trim()) {
              return;
            }
            certificateResetMutation.mutate({
              reason: reason.trim(),
              targetUserId: userId,
            });
          }}
          onCancelEnrollment={(enrollmentId) => {
            const reason = window.prompt('수강권 회수 사유를 입력해 주세요.');
            if (!reason?.trim()) {
              return;
            }
            cancelEnrollmentMutation.mutate({
              enrollmentId,
              reason: reason.trim(),
            });
          }}
          onToggleEnrollment={handleToggleEnrollment}
          onToggleProblem={handleToggleProblem}
          onToggleQuestion={handleToggleQuestion}
          reportLoading={reportMutation.isPending}
          cancelEnrollmentLoading={cancelEnrollmentMutation.isPending}
          resetCertificateProfileLoading={certificateResetMutation.isPending}
          user={detailQuery.data}
        />
      ) : null}
      <AdminUserProblemReportModal
        onClose={() => {
          setProblemReport(null);
        }}
        report={problemReport}
      />
      {detailQuery.data && grantModalOpen ? (
        <EnrollmentGrantModal
          currentProgramIds={currentProgramIds}
          loading={grantEnrollmentMutation.isPending}
          onClose={() => {
            setGrantModalOpen(false);
            setSelectedGrantProgramId('');
          }}
          onSubmit={() => {
            const programId = Number(selectedGrantProgramId);
            if (!Number.isFinite(programId)) {
              showToast({
                message: '지급할 프로그램을 선택해 주세요.',
                variant: 'error',
              });
              return;
            }
            grantEnrollmentMutation.mutate({
              programId,
              targetUserId: detailQuery.data.id,
            });
          }}
          programs={programsQuery.data ?? []}
          programsError={
            programsQuery.isError
              ? programsQuery.error instanceof Error
                ? programsQuery.error.message
                : '프로그램 목록을 불러오지 못했습니다.'
              : null
          }
          programsLoading={programsQuery.isPending}
          selectedProgramId={selectedGrantProgramId}
          userName={detailQuery.data.displayName}
          onProgramChange={setSelectedGrantProgramId}
        />
      ) : null}
    </section>
  );
};

interface EnrollmentGrantModalProps {
  currentProgramIds: Set<number>;
  loading: boolean;
  onClose: () => void;
  onProgramChange: (programId: string) => void;
  onSubmit: () => void;
  programs: AdminProgramListItem[];
  programsError: string | null;
  programsLoading: boolean;
  selectedProgramId: string;
  userName: string;
}

const EnrollmentGrantModal = ({
  currentProgramIds,
  loading,
  onClose,
  onProgramChange,
  onSubmit,
  programs,
  programsError,
  programsLoading,
  selectedProgramId,
  userName,
}: EnrollmentGrantModalProps) => {
  const grantablePrograms = programs.filter((program) =>
    isGrantableProgram(program, currentProgramIds),
  );

  return (
    <Modal onClose={onClose} size='md' title='수강권 지급'>
      <div className={styles['paymentDetailModalBody']}>
        <div className={styles['paymentDetailSection']}>
          <strong className={styles['cellPrimary']}>{userName}</strong>
          <span className={styles['cellSecondary']}>관리자 수동 지급</span>
        </div>

        {programsLoading ? (
          <p className={styles['helperText']}>프로그램 목록을 불러오는 중입니다.</p>
        ) : null}
        {programsError ? <p className={styles['helperText']}>{programsError}</p> : null}

        <label className={styles['selectField']}>
          <span className={styles['selectLabel']}>프로그램</span>
          <span className={styles['selectWrap']}>
            <select
              className={styles['select']}
              disabled={loading || programsLoading || grantablePrograms.length === 0}
              onChange={(event) => {
                onProgramChange(event.target.value);
              }}
              value={selectedProgramId}
            >
              <option value=''>선택</option>
              {programs.map((program) => {
                const grantable = isGrantableProgram(program, currentProgramIds);
                return (
                  <option disabled={!grantable} key={program.id} value={program.id}>
                    {formatProgramOption(program, currentProgramIds)}
                  </option>
                );
              })}
            </select>
          </span>
        </label>

        {grantablePrograms.length === 0 && !programsLoading ? (
          <p className={styles['helperText']}>지급 가능한 프로그램이 없습니다.</p>
        ) : null}

        <div className={styles['actionRow']}>
          <Button disabled={loading} onClick={onClose} type='button' variant='secondary'>
            취소
          </Button>
          <Button
            disabled={loading || !selectedProgramId || grantablePrograms.length === 0}
            onClick={onSubmit}
            type='button'
            variant='primary'
          >
            {loading ? '지급 중...' : '지급'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const isGrantableProgram = (
  program: AdminProgramListItem,
  currentProgramIds: Set<number>,
): boolean => {
  return (
    program.published &&
    !program.full &&
    program.operationStatus !== 'CLOSURE_CONFIRMED' &&
    !currentProgramIds.has(program.id)
  );
};

const formatProgramOption = (
  program: AdminProgramListItem,
  currentProgramIds: Set<number>,
): string => {
  const labels: string[] = [];
  if (!program.published) labels.push('미공개');
  if (program.full) labels.push('정원 마감');
  if (program.operationStatus === 'CLOSURE_CONFIRMED') labels.push('폐강');
  if (currentProgramIds.has(program.id)) labels.push('수강중');
  return labels.length ? `${program.title} (${labels.join(', ')})` : program.title;
};

export default AdminUserDetailSection;
