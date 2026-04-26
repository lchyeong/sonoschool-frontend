import { Fragment, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { fetchAdminUserDetail } from '@/api/adminUsers';
import { routePaths } from '@/routes/routeRegistry';
import type {
  AdminUserDetail,
  AdminUserDetailEnrollmentItem,
  AdminUserDetailLectureItem,
  AdminUserDetailPaymentItem,
  AdminUserDetailProblemAttemptItem,
  AdminUserDetailQuestionItem,
  AdminUserDetailQuestionResultItem,
} from '@/types/adminUsers';

import styles from './AdminConsolePage.module.scss';

const enrollmentStatusLabel: Record<string, string> = {
  ACTIVE: '수강중',
  CANCELLED: '취소',
  EXPIRED: '만료',
};

const lectureTypeLabel: Record<string, string> = {
  OFFLINE: '오프라인',
  PRACTICUM: '실습',
  PROBLEM: '문제',
  RESOURCE: '첨부자료',
  VIDEO: '영상',
};

const paymentStatusLabel: Record<string, string> = {
  CANCELLED: '취소',
  COMPLETED: '결제완료',
  FAILED: '실패',
  PENDING: '대기',
  REGISTERED: '등록',
};

const programTypeLabel: Record<string, string> = {
  HYBRID: '하이브리드',
  OFFLINE: '오프라인',
  ONLINE: '온라인',
};

const qnaScopeLabel: Record<string, string> = {
  GLOBAL: '운영 Q&A',
  PROGRAM: '강좌 Q&A',
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return '-';
  }

  return `${amount.toLocaleString('ko-KR')}원`;
};

const formatDurationMinutes = (durationSeconds: number | null): string => {
  if (durationSeconds === null) {
    return '-';
  }

  return `${String(Math.ceil(durationSeconds / 60))}분`;
};

const getFirstProblemAttempt = (
  problem: AdminUserDetailLectureItem['problem'],
): AdminUserDetailProblemAttemptItem | null => {
  if (!problem?.attempts.length) {
    return null;
  }

  return [...problem.attempts].sort((left, right) => {
    if (!left.submittedAt && !right.submittedAt) {
      return left.attemptId - right.attemptId;
    }
    if (!left.submittedAt) {
      return 1;
    }
    if (!right.submittedAt) {
      return -1;
    }
    return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
  })[0];
};

const AdminUserDetailSection = () => {
  const params = useParams();
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
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      {detailQuery.data
        ? renderUserDetail(
            detailQuery.data,
            currentEnrollments,
            expandedProblemIds,
            handleToggleProblem,
            expandedEnrollmentIds,
            handleToggleEnrollment,
            expandedQuestionIds,
            handleToggleQuestion,
          )
        : null}
    </section>
  );
};

const renderUserDetail = (
  user: AdminUserDetail,
  currentEnrollments: AdminUserDetailEnrollmentItem[],
  expandedProblemIds: Set<number>,
  onToggleProblem: (lectureId: number) => void,
  expandedEnrollmentIds: Set<number>,
  onToggleEnrollment: (enrollmentId: number) => void,
  expandedQuestionIds: Set<number>,
  onToggleQuestion: (questionId: number) => void,
) => {
  return (
    <>
      <section className={styles['userDetailSection']}>
        <div className={styles['userDetailSummaryHeader']}>
          <div>
            <h2 className={styles['panelTitle']}>{user.displayName}</h2>
            <p className={styles['metaText']}>
              아이디 {user.loginId} · 가입일 {formatDate(user.joinedAt)}
            </p>
          </div>
        </div>

        <div className={`${styles['tableWrap']} ${styles['userDetailTableWrap']}`}>
          <table className={`${styles['table']} ${styles['userInfoTable']}`}>
            <tbody>
              <tr>
                <th scope='row'>연락처</th>
                <td>{user.phoneNumber}</td>
                <th scope='row'>이메일</th>
                <td>
                  <div className={styles['cellStack']}>
                    <span>{user.email}</span>
                    <span className={styles['cellSecondary']}>
                      본인인증 {formatDateTime(user.phoneVerifiedAt)}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <th scope='row'>수강/실습</th>
                <td>
                  수강중 {String(currentEnrollments.length)}개 · 전체 진행{' '}
                  {String(user.activeEnrollmentCount)}건 · 예정 실습{' '}
                  {String(user.upcomingPracticumCount)}건
                </td>
                <th scope='row'>마케팅 동의</th>
                <td>
                  {user.marketingConsent.agreed ? '동의' : '미동의'}
                  {user.marketingConsent.agreedAt
                    ? ` · ${formatDateTime(user.marketingConsent.agreedAt)}`
                    : ''}
                  {user.marketingConsent.termVersion
                    ? ` · 버전 ${user.marketingConsent.termVersion}`
                    : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles['userDetailSection']}>
        <div className={styles['userDetailSectionHeader']}>
          <h2 className={styles['panelTitle']}>결제 이력</h2>
          <p className={styles['userDetailHeaderMeta']}>
            완료 {String(user.paymentSummary.completedPaymentCount)}건 · 취소{' '}
            {String(user.paymentSummary.cancelledPaymentCount)}건
          </p>
        </div>

        <div className={`${styles['tableWrap']} ${styles['userDetailTableWrap']}`}>
          <table className={`${styles['table']} ${styles['userPaymentTable']}`}>
            <thead>
              <tr>
                <th scope='col'>프로그램</th>
                <th scope='col'>결제 상태</th>
                <th scope='col'>수단</th>
                <th scope='col'>금액</th>
                <th scope='col'>결제일</th>
                <th scope='col'>취소일</th>
              </tr>
            </thead>
            <tbody>
              {user.payments.length ? (
                user.payments.map((payment) => renderPaymentRow(payment))
              ) : (
                <tr>
                  <td className={styles['cellSecondary']} colSpan={6}>
                    결제 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles['userDetailSection']}>
        <div className={styles['userDetailSectionHeader']}>
          <h2 className={styles['panelTitle']}>Q&amp;A 이력</h2>
        </div>

        <div className={`${styles['tableWrap']} ${styles['userDetailTableWrap']}`}>
          <table className={`${styles['table']} ${styles['userQnaTable']}`}>
            <thead>
              <tr>
                <th scope='col'>구분</th>
                <th scope='col'>질문</th>
                <th scope='col'>연결 위치</th>
                <th scope='col'>답변 상태</th>
                <th scope='col'>등록일</th>
              </tr>
            </thead>
            <tbody>
              {user.questions.length ? (
                user.questions.map((question) =>
                  renderQuestionRow(
                    question,
                    expandedQuestionIds.has(question.questionId),
                    onToggleQuestion,
                  ),
                )
              ) : (
                <tr>
                  <td className={styles['cellSecondary']} colSpan={5}>
                    Q&amp;A 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles['userDetailSection']}>
        <div className={styles['userDetailSectionHeader']}>
          <h2 className={styles['panelTitle']}>프로그램별 수강 상세</h2>
        </div>

        <div className={styles['userEnrollmentList']}>
          {user.enrollments.length ? (
            user.enrollments.map((enrollment) =>
              renderEnrollmentCard(
                enrollment,
                expandedProblemIds,
                onToggleProblem,
                expandedEnrollmentIds.has(enrollment.enrollmentId),
                onToggleEnrollment,
              ),
            )
          ) : (
            <p className={styles['userDetailEmptyText']}>등록된 프로그램 수강 이력이 없습니다.</p>
          )}
        </div>
      </section>
    </>
  );
};

const renderPaymentRow = (payment: AdminUserDetailPaymentItem) => {
  return (
    <tr key={payment.paymentId}>
      <td>{payment.programTitle ?? '-'}</td>
      <td>{paymentStatusLabel[payment.paymentStatus] ?? payment.paymentStatus}</td>
      <td>{payment.paymentMethod}</td>
      <td>{formatCurrency(payment.approvedAmount ?? payment.amount)}</td>
      <td>{formatDateTime(payment.paidAt ?? payment.requestedAt)}</td>
      <td>{formatDateTime(payment.cancelledAt)}</td>
    </tr>
  );
};

const renderQuestionRow = (
  question: AdminUserDetailQuestionItem,
  expanded: boolean,
  onToggleQuestion: (questionId: number) => void,
) => {
  const locationText = question.scope === 'GLOBAL' ? '운영 Q&A' : question.programTitle || '-';

  return (
    <Fragment key={`qna-${String(question.questionId)}`}>
      <tr>
        <td>{qnaScopeLabel[question.scope] ?? question.scope}</td>
        <td>
          <button
            className={styles['userQnaTitleButton']}
            onClick={() => {
              onToggleQuestion(question.questionId);
            }}
            type='button'
          >
            {question.title}
          </button>
        </td>
        <td>{locationText}</td>
        <td>{question.answered ? '답변 완료' : '답변 대기'}</td>
        <td>{formatDateTime(question.createdAt)}</td>
      </tr>
      {expanded ? (
        <tr>
          <td className={styles['userQnaDetailCell']} colSpan={5}>
            <div className={styles['userQnaDetail']}>
              <div>
                <strong className={styles['cellPrimary']}>질문 내용</strong>
                <p className={styles['userQnaDetailText']}>{question.content}</p>
              </div>
              <div className={styles['userQnaDetailMeta']}>
                답변 {String(question.replyCount)}개 · 최근 답변{' '}
                {formatDateTime(question.latestReplyAt)}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
};

const renderEnrollmentCard = (
  enrollment: AdminUserDetailEnrollmentItem,
  expandedProblemIds: Set<number>,
  onToggleProblem: (lectureId: number) => void,
  expanded: boolean,
  onToggleEnrollment: (enrollmentId: number) => void,
) => {
  return (
    <article
      className={styles['userEnrollmentItem']}
      data-user-enrollment-id={String(enrollment.enrollmentId)}
      key={enrollment.enrollmentId}
      tabIndex={-1}
    >
      <button
        aria-expanded={expanded}
        className={styles['userEnrollmentToggle']}
        onClick={() => {
          onToggleEnrollment(enrollment.enrollmentId);
        }}
        type='button'
      >
        <div className={styles['userEnrollmentTitleBlock']}>
          <strong className={styles['userEnrollmentTitle']}>{enrollment.programTitle}</strong>
          <span className={styles['metaText']}>
            {enrollment.current ? '수강중' : '과거 이력'} ·{' '}
            {enrollmentStatusLabel[enrollment.enrollmentStatus] ?? enrollment.enrollmentStatus} ·{' '}
            {programTypeLabel[enrollment.programType] ?? enrollment.programType}
          </span>
        </div>
        <div className={styles['userEnrollmentSummary']}>
          <span>{String(enrollment.completionRate)}%</span>
          <span>
            {String(enrollment.completedLectureCount)} / {String(enrollment.totalLectureCount)}강
          </span>
          <span>문제 {String(enrollment.attemptedProblemLectureCount)}강</span>
          <span className={styles['userDropdownArrow']} data-expanded={expanded} />
        </div>
      </button>

      {expanded ? (
        <div className={styles['userEnrollmentBody']}>
          <div className={styles['userEnrollmentMetrics']}>
            <div>
              <span>진도율</span>
              <strong>{String(enrollment.completionRate)}%</strong>
              <small>
                {String(enrollment.completedLectureCount)} / {String(enrollment.totalLectureCount)}
                강 완료
              </small>
            </div>
            <div>
              <span>학습</span>
              <strong>{formatDateTime(enrollment.lastLearningAt)}</strong>
              <small>첫 학습 {formatDateTime(enrollment.firstLearningAt)}</small>
            </div>
            <div>
              <span>기간</span>
              <strong>{formatDateTime(enrollment.enrolledAt)}</strong>
              <small>만료 {formatDateTime(enrollment.expireAt)}</small>
            </div>
            <div>
              <span>결제</span>
              <strong>
                {enrollment.payment
                  ? formatCurrency(enrollment.payment.approvedAmount ?? enrollment.payment.amount)
                  : '-'}
              </strong>
              <small>
                {enrollment.payment
                  ? `${paymentStatusLabel[enrollment.payment.paymentStatus] ?? enrollment.payment.paymentStatus} · ${formatDateTime(enrollment.payment.paidAt)}`
                  : '결제 정보 없음'}
              </small>
            </div>
          </div>

          <div className={`${styles['tableWrap']} ${styles['userDetailTableWrap']}`}>
            <table className={`${styles['table']} ${styles['userEnrollmentLectureTable']}`}>
              <thead>
                <tr>
                  <th scope='col'>강의</th>
                  <th scope='col'>형태</th>
                  <th scope='col'>진도율</th>
                  <th scope='col'>학습 기록</th>
                  <th scope='col'>문제 결과</th>
                </tr>
              </thead>
              <tbody>
                {enrollment.lectures.map((lecture) =>
                  renderEnrollmentLectureRow(
                    lecture,
                    expandedProblemIds.has(lecture.lectureId),
                    onToggleProblem,
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </article>
  );
};

const renderEnrollmentLectureRow = (
  lecture: AdminUserDetailLectureItem,
  problemExpanded: boolean,
  onToggleProblem: (lectureId: number) => void,
) => {
  const firstAttempt = getFirstProblemAttempt(lecture.problem);
  const isProblemLecture = Boolean(lecture.problem);

  return (
    <Fragment key={lecture.lectureId}>
      <tr
        className={isProblemLecture ? styles['userProblemLectureRow'] : undefined}
        onClick={() => {
          if (isProblemLecture) {
            onToggleProblem(lecture.lectureId);
          }
        }}
        onKeyDown={(event) => {
          if (isProblemLecture && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onToggleProblem(lecture.lectureId);
          }
        }}
        role={isProblemLecture ? 'button' : undefined}
        tabIndex={isProblemLecture ? 0 : undefined}
      >
        <td>
          <div className={styles['cellStack']}>
            <strong className={styles['cellPrimary']}>{lecture.lectureTitle}</strong>
            <span className={styles['cellSecondary']}>{lecture.sectionTitle}</span>
          </div>
        </td>
        <td>{lectureTypeLabel[lecture.lectureType] ?? lecture.lectureType}</td>
        <td>{String(lecture.progressRate)}%</td>
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
          {lecture.problem ? (
            <div className={styles['cellStack']}>
              <span className={styles['cellPrimary']}>
                {firstAttempt
                  ? `${String(firstAttempt.correctAnswerCount)} / ${String(firstAttempt.questionCount)} 정답`
                  : '미응시'}
              </span>
              <span className={styles['cellSecondary']}>
                {firstAttempt
                  ? `최초 제출 ${formatDateTime(firstAttempt.submittedAt)}`
                  : `${String(lecture.problem.questionCount)}문항`}
              </span>
            </div>
          ) : (
            <span className={styles['cellSecondary']}>-</span>
          )}
        </td>
      </tr>
      {lecture.problem && problemExpanded ? (
        <tr key={`problem-detail-${String(lecture.lectureId)}`}>
          <td className={styles['userProblemDetailCell']} colSpan={5}>
            {firstAttempt ? (
              renderProblemAttempt(lecture.problem, firstAttempt)
            ) : (
              <p className={styles['userDetailEmptyText']}>아직 제출 이력이 없습니다.</p>
            )}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
};

const renderProblemAttempt = (
  problem: NonNullable<AdminUserDetailLectureItem['problem']>,
  attempt: AdminUserDetailProblemAttemptItem,
) => {
  return (
    <article className={styles['userProblemAttempt']} key={attempt.attemptId}>
      <div className={styles['userProblemResultHeader']}>
        <div>
          <strong className={styles['cellPrimary']}>{problem.title}</strong>
          <span className={styles['cellSecondary']}>
            최초 제출 {formatDateTime(attempt.submittedAt)}
          </span>
        </div>
        <div className={styles['userProblemResultMetrics']}>
          <span>{attempt.passed ? '통과' : '미통과'}</span>
          <span>{String(attempt.score)}점</span>
          <span>
            {String(attempt.correctAnswerCount)} / {String(attempt.questionCount)} 정답
          </span>
        </div>
      </div>

      <div className={`${styles['tableWrap']} ${styles['userDetailTableWrap']}`}>
        <table className={`${styles['table']} ${styles['userProblemQuestionTable']}`}>
          <thead>
            <tr>
              <th scope='col'>번호</th>
              <th scope='col'>문항</th>
              <th scope='col'>결과</th>
            </tr>
          </thead>
          <tbody>
            {attempt.questionResults.map((result, index) => renderQuestionResult(result, index))}
          </tbody>
        </table>
      </div>
    </article>
  );
};

const renderQuestionResult = (result: AdminUserDetailQuestionResultItem, index: number) => {
  return (
    <tr key={result.questionId}>
      <td>{String(index + 1)}</td>
      <td>
        <strong className={styles['cellPrimary']}>{result.questionText}</strong>
      </td>
      <td>
        <span className={result.correct ? styles['resultMarkCorrect'] : styles['resultMarkWrong']}>
          {result.correct ? 'O' : 'X'}
        </span>
      </td>
    </tr>
  );
};

export default AdminUserDetailSection;
