import { useMemo, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { fetchAdminProblemAttemptReport } from '@/api/adminProblemAttempts';
import { fetchAdminUserDetail } from '@/api/adminUsers';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { StudentProblemAttemptReport } from '@/types/studentProblems';

import styles from './AdminConsolePage.module.scss';
import AdminUserDetailView from './AdminUserDetailView';
import AdminUserProblemReportModal from './AdminUserProblemReportModal';

const AdminUserDetailSection = () => {
  const params = useParams();
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
          onToggleEnrollment={handleToggleEnrollment}
          onToggleProblem={handleToggleProblem}
          onToggleQuestion={handleToggleQuestion}
          reportLoading={reportMutation.isPending}
          user={detailQuery.data}
        />
      ) : null}
      <AdminUserProblemReportModal
        onClose={() => {
          setProblemReport(null);
        }}
        report={problemReport}
      />
    </section>
  );
};

export default AdminUserDetailSection;
