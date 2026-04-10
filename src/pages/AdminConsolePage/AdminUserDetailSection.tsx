import { useMemo } from 'react';

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
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return '-';
  }

  return `${amount.toLocaleString('ko-KR')}원`;
};

interface CurrentLectureRow {
  enrollmentId: number;
  lastWatchedAt: string | null;
  lecture: AdminUserDetailLectureItem;
  programTitle: string;
}

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

  const currentLectures = useMemo<CurrentLectureRow[]>(() => {
    return currentEnrollments
      .flatMap((enrollment) =>
        enrollment.lectures
          .filter((lecture) => lecture.progressRate > 0 || lecture.problem?.attempted)
          .map((lecture) => ({
            enrollmentId: enrollment.enrollmentId,
            lastWatchedAt: lecture.lastWatchedAt,
            lecture,
            programTitle: enrollment.programTitle,
          })),
      )
      .sort((left, right) => {
        if (!left.lastWatchedAt && !right.lastWatchedAt) {
          return left.lecture.lectureSortOrder - right.lecture.lectureSortOrder;
        }
        if (!left.lastWatchedAt) {
          return 1;
        }
        if (!right.lastWatchedAt) {
          return -1;
        }
        return new Date(right.lastWatchedAt).getTime() - new Date(left.lastWatchedAt).getTime();
      });
  }, [currentEnrollments]);

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
      <div className={styles['pageHeader']}>
        <p className={styles['pageDescription']}>
          <Link to={routePaths.adminEnrollments}>회원 목록으로 돌아가기</Link>
        </p>
        <h1 className={styles['pageTitle']}>회원 상세</h1>
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
        ? renderUserDetail(detailQuery.data, currentEnrollments, currentLectures)
        : null}
    </section>
  );
};

const renderUserDetail = (
  user: AdminUserDetail,
  currentEnrollments: AdminUserDetailEnrollmentItem[],
  currentLectures: CurrentLectureRow[],
) => {
  return (
    <>
      <section className={styles['panelWide']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h2 className={styles['panelTitle']}>{user.displayName}</h2>
            <p className={styles['metaText']}>
              아이디 {user.loginId} · 가입일 {formatDate(user.joinedAt)}
            </p>
          </div>
          {user.active ? (
            <span className={styles['badgeSuccess']}>활성 회원</span>
          ) : (
            <span className={styles['badgeDanger']}>비활성 회원</span>
          )}
        </div>

        <div className={styles['contentGrid']}>
          <article className={styles['stackItem']}>
            <span className={styles['badgeAccent']}>회원 정보</span>
            <strong className={styles['itemTitle']}>{user.phoneNumber}</strong>
            <p className={styles['metaText']}>
              이메일 {user.email}
              {user.phoneVerifiedAt ? ` · 본인인증 ${formatDateTime(user.phoneVerifiedAt)}` : ''}
            </p>
          </article>
          <article className={styles['stackItem']}>
            <span className={styles['badgeSuccess']}>수강중 프로그램</span>
            <strong className={styles['itemTitle']}>{String(currentEnrollments.length)}개</strong>
            <p className={styles['metaText']}>
              현재 수강중 {String(user.activeEnrollmentCount)}건 · 예정 실습{' '}
              {String(user.upcomingPracticumCount)}건
            </p>
          </article>
          <article className={styles['stackItem']}>
            <span className={styles['badgeAccent']}>결제 금액</span>
            <strong className={styles['itemTitle']}>
              {formatCurrency(user.paymentSummary.totalPaidAmount)}
            </strong>
            <p className={styles['metaText']}>
              취소 {formatCurrency(user.paymentSummary.totalCancelledAmount)} · 마지막 결제{' '}
              {formatDateTime(user.paymentSummary.lastPaidAt)}
            </p>
          </article>
          <article className={styles['stackItem']}>
            <span className={styles['badge']}>마케팅 동의</span>
            <strong className={styles['itemTitle']}>
              {user.marketingConsent.agreed ? '동의' : '미동의'}
            </strong>
            <p className={styles['metaText']}>
              {user.marketingConsent.agreedAt
                ? `동의 ${formatDateTime(user.marketingConsent.agreedAt)}`
                : '동의 이력 없음'}
              {user.marketingConsent.termVersion
                ? ` · 버전 ${user.marketingConsent.termVersion}`
                : ''}
            </p>
          </article>
        </div>
      </section>

      <section className={styles['panelWide']}>
        <div className={styles['panelHeader']}>
          <h2 className={styles['panelTitle']}>현재 수강 및 학습</h2>
          <p className={styles['metaText']}>
            현재 수강중인 프로그램과 최근 학습 강의를 우선 확인합니다.
          </p>
        </div>

        <div className={styles['stackList']}>
          {currentEnrollments.length ? (
            currentEnrollments.map((enrollment) => (
              <article
                className={styles['stackItem']}
                key={`current-${String(enrollment.enrollmentId)}`}
              >
                <div className={styles['metaRow']}>
                  <span className={styles['badgeSuccess']}>수강중</span>
                  <span className={styles['badgeAccent']}>
                    {programTypeLabel[enrollment.programType] ?? enrollment.programType}
                  </span>
                </div>
                <strong className={styles['itemTitle']}>{enrollment.programTitle}</strong>
                <p className={styles['metaText']}>
                  진도율 {String(enrollment.completionRate)}% · 첫 학습{' '}
                  {formatDateTime(enrollment.firstLearningAt)} · 마지막 학습{' '}
                  {formatDateTime(enrollment.lastLearningAt)}
                </p>
              </article>
            ))
          ) : (
            <div className={styles['metaNotice']}>
              <p className={styles['metaNoticeLabel']}>현재 수강 없음</p>
              <p className={styles['metaNoticeText']}>진행 중인 프로그램이 없습니다.</p>
            </div>
          )}
        </div>

        <div className={styles['tableWrap']}>
          <table className={styles['table']}>
            <thead>
              <tr>
                <th scope='col'>현재 듣는 강의</th>
                <th scope='col'>강좌</th>
                <th scope='col'>형태</th>
                <th scope='col'>진도율</th>
                <th scope='col'>마지막 학습</th>
              </tr>
            </thead>
            <tbody>
              {currentLectures.length ? (
                currentLectures.map((row) => (
                  <tr key={`${String(row.enrollmentId)}-${String(row.lecture.lectureId)}`}>
                    <td>
                      <div className={styles['cellStack']}>
                        <strong className={styles['cellPrimary']}>
                          {row.lecture.lectureTitle}
                        </strong>
                        <span className={styles['cellSecondary']}>{row.lecture.sectionTitle}</span>
                      </div>
                    </td>
                    <td>{row.programTitle}</td>
                    <td>{lectureTypeLabel[row.lecture.lectureType] ?? row.lecture.lectureType}</td>
                    <td>
                      {row.lecture.problem
                        ? `${String(row.lecture.problem.latestCorrectAnswerCount ?? 0)} / ${String(
                            row.lecture.problem.questionCount,
                          )} 정답`
                        : `${String(row.lecture.progressRate)}%`}
                    </td>
                    <td>{formatDateTime(row.lecture.lastWatchedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={styles['cellSecondary']} colSpan={5}>
                    최근 학습 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles['panelWide']}>
        <div className={styles['panelHeader']}>
          <h2 className={styles['panelTitle']}>결제 이력</h2>
          <p className={styles['metaText']}>
            완료 {String(user.paymentSummary.completedPaymentCount)}건 · 취소{' '}
            {String(user.paymentSummary.cancelledPaymentCount)}건
          </p>
        </div>

        <div className={styles['tableWrap']}>
          <table className={styles['table']}>
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

      <section className={styles['panelWide']}>
        <div className={styles['panelHeader']}>
          <h2 className={styles['panelTitle']}>Q&amp;A 이력</h2>
          <p className={styles['metaText']}>
            운영 Q&amp;A인지 강좌 Q&amp;A인지, 어느 강좌/강의에서 남긴 질문인지 함께 봅니다.
          </p>
        </div>

        <div className={styles['tableWrap']}>
          <table className={styles['table']}>
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
                user.questions.map((question) => renderQuestionRow(question))
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

      <section className={styles['panelWide']}>
        <div className={styles['panelHeader']}>
          <h2 className={styles['panelTitle']}>프로그램별 수강 상세</h2>
          <p className={styles['metaText']}>
            프로그램별 진도율, 첫/마지막 학습 시각, 문제 강의 답안 이력을 함께 확인합니다.
          </p>
        </div>

        <div className={styles['stackList']}>
          {user.enrollments.length ? (
            user.enrollments.map((enrollment) => renderEnrollmentCard(enrollment))
          ) : (
            <div className={styles['metaNotice']}>
              <p className={styles['metaNoticeLabel']}>수강 이력 없음</p>
              <p className={styles['metaNoticeText']}>등록된 프로그램 수강 이력이 없습니다.</p>
            </div>
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
      <td>
        {'CANCELLED' === payment.paymentStatus ? (
          <span className={styles['badgeDanger']}>
            {paymentStatusLabel[payment.paymentStatus] ?? payment.paymentStatus}
          </span>
        ) : (
          <span className={styles['badgeSuccess']}>
            {paymentStatusLabel[payment.paymentStatus] ?? payment.paymentStatus}
          </span>
        )}
      </td>
      <td>{payment.paymentMethod}</td>
      <td>{formatCurrency(payment.approvedAmount ?? payment.amount)}</td>
      <td>{formatDateTime(payment.paidAt ?? payment.requestedAt)}</td>
      <td>{formatDateTime(payment.cancelledAt)}</td>
    </tr>
  );
};

const renderQuestionRow = (question: AdminUserDetailQuestionItem) => {
  const locationText = question.scope === 'GLOBAL' ? '운영 Q&A' : question.programTitle || '-';

  return (
    <tr key={question.questionId}>
      <td>{qnaScopeLabel[question.scope] ?? question.scope}</td>
      <td>
        <div className={styles['cellStack']}>
          <strong className={styles['cellPrimary']}>{question.title}</strong>
          <span className={styles['cellSecondary']}>{question.content}</span>
        </div>
      </td>
      <td>{locationText}</td>
      <td>
        <div className={styles['cellStack']}>
          {question.answered ? (
            <span className={styles['badgeSuccess']}>답변 완료</span>
          ) : (
            <span className={styles['badge']}>답변 대기</span>
          )}
          <span className={styles['cellSecondary']}>
            답변 {String(question.replyCount)}개 {'·'} 최근 답변{' '}
            {formatDateTime(question.latestReplyAt)}
          </span>
        </div>
      </td>
      <td>{formatDateTime(question.createdAt)}</td>
    </tr>
  );
};

const renderEnrollmentCard = (enrollment: AdminUserDetailEnrollmentItem) => {
  return (
    <article className={styles['panel']} key={enrollment.enrollmentId}>
      <div className={styles['panelToolbar']}>
        <div>
          <h3 className={styles['panelTitle']}>{enrollment.programTitle}</h3>
          <p className={styles['metaText']}>
            {programTypeLabel[enrollment.programType] ?? enrollment.programType} · 등록{' '}
            {formatDateTime(enrollment.enrolledAt)} · 만료 {formatDateTime(enrollment.expireAt)}
          </p>
        </div>
        <div className={styles['metaRow']}>
          {enrollment.current ? (
            <span className={styles['badgeSuccess']}>수강중</span>
          ) : (
            <span className={styles['badge']}>과거 이력</span>
          )}
          <span className={styles['badgeAccent']}>
            {enrollmentStatusLabel[enrollment.enrollmentStatus] ?? enrollment.enrollmentStatus}
          </span>
        </div>
      </div>

      <div className={styles['contentGrid']}>
        <article className={styles['stackItem']}>
          <span className={styles['badgeAccent']}>진도율</span>
          <strong className={styles['itemTitle']}>{String(enrollment.completionRate)}%</strong>
          <p className={styles['metaText']}>
            {String(enrollment.completedLectureCount)} / {String(enrollment.totalLectureCount)}강
            완료
          </p>
        </article>
        <article className={styles['stackItem']}>
          <span className={styles['badge']}>학습 시각</span>
          <strong className={styles['itemTitle']}>
            {formatDateTime(enrollment.lastLearningAt)}
          </strong>
          <p className={styles['metaText']}>첫 학습 {formatDateTime(enrollment.firstLearningAt)}</p>
        </article>
        <article className={styles['stackItem']}>
          <span className={styles['badgeAccent']}>문제 강의</span>
          <strong className={styles['itemTitle']}>
            {String(enrollment.attemptedProblemLectureCount)} /{' '}
            {String(enrollment.totalProblemLectureCount)}강
          </strong>
          <p className={styles['metaText']}>문제 풀이 이력이 있는 강의 수</p>
        </article>
        <article className={styles['stackItem']}>
          <span className={styles['badge']}>결제</span>
          <strong className={styles['itemTitle']}>
            {enrollment.payment
              ? formatCurrency(enrollment.payment.approvedAmount ?? enrollment.payment.amount)
              : '-'}
          </strong>
          <p className={styles['metaText']}>
            {enrollment.payment
              ? `${paymentStatusLabel[enrollment.payment.paymentStatus] ?? enrollment.payment.paymentStatus} · ${formatDateTime(enrollment.payment.paidAt)}`
              : '결제 정보 없음'}
          </p>
        </article>
      </div>

      <div className={styles['tableWrap']}>
        <table className={styles['table']}>
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
            {enrollment.lectures.map((lecture) => (
              <tr key={lecture.lectureId}>
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
                      {String(lecture.watchedSeconds)}초 /{' '}
                      {lecture.durationSeconds === null
                        ? '-'
                        : `${String(lecture.durationSeconds)}초`}
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
                        {String(lecture.problem.latestCorrectAnswerCount ?? 0)} /{' '}
                        {String(lecture.problem.questionCount)} 정답
                      </span>
                      <span className={styles['cellSecondary']}>
                        {String(lecture.problem.attemptCount)}회 응시 · 최고{' '}
                        {lecture.problem.bestScore === null
                          ? '-'
                          : `${String(lecture.problem.bestScore)}점`}
                      </span>
                    </div>
                  ) : (
                    <span className={styles['cellSecondary']}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enrollment.lectures
        .filter((lecture) => lecture.problem)
        .map((lecture) => renderProblemHistory(lecture))}
    </article>
  );
};

const renderProblemHistory = (lecture: AdminUserDetailLectureItem) => {
  if (!lecture.problem) {
    return null;
  }

  return (
    <section className={styles['metaNotice']} key={`problem-${String(lecture.lectureId)}`}>
      <p className={styles['metaNoticeLabel']}>{lecture.lectureTitle} 문제 풀이 이력</p>
      <p className={styles['metaNoticeText']}>
        {lecture.problem.title} · 최근 제출{' '}
        {formatDateTime(lecture.problem.lastSubmittedAt)} · 기준 점수{' '}
        {String(lecture.problem.passScore)}점
      </p>

      {lecture.problem.attempts.length ? (
        <div className={styles['stackList']}>
          {lecture.problem.attempts.map((attempt) => renderProblemAttempt(attempt))}
        </div>
      ) : (
        <p className={styles['metaNoticeText']}>아직 제출 이력이 없습니다.</p>
      )}
    </section>
  );
};

const renderProblemAttempt = (attempt: AdminUserDetailProblemAttemptItem) => {
  return (
    <article className={styles['stackItem']} key={attempt.attemptId}>
      <div className={styles['metaRow']}>
        {attempt.passed ? (
          <span className={styles['badgeSuccess']}>통과</span>
        ) : (
          <span className={styles['badgeDanger']}>미통과</span>
        )}
        <span className={styles['badgeAccent']}>
          {formatDateTime(attempt.submittedAt)} · {String(attempt.correctAnswerCount)} /{' '}
          {String(attempt.questionCount)} 정답 · {String(attempt.score)}점
        </span>
      </div>

      <div className={styles['tableWrap']}>
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope='col'>문항</th>
              <th scope='col'>제출 답안</th>
              <th scope='col'>정답</th>
              <th scope='col'>채점</th>
              <th scope='col'>해설</th>
            </tr>
          </thead>
          <tbody>{attempt.questionResults.map((result) => renderQuestionResult(result))}</tbody>
        </table>
      </div>
    </article>
  );
};

const renderQuestionResult = (result: AdminUserDetailQuestionResultItem) => {
  const submitted = result.submittedOptions.length
    ? result.submittedOptions.map((option) => option.optionText).join(', ')
    : '미제출';
  const correct = result.correctOptions.length
    ? result.correctOptions.map((option) => option.optionText).join(', ')
    : '-';

  return (
    <tr key={result.questionId}>
      <td>
        <div className={styles['cellStack']}>
          <strong className={styles['cellPrimary']}>{result.questionText}</strong>
          <span className={styles['cellSecondary']}>{result.questionType}</span>
        </div>
      </td>
      <td>{submitted}</td>
      <td>{correct}</td>
      <td>
        {result.correct ? (
          <span className={styles['badgeSuccess']}>정답</span>
        ) : (
          <span className={styles['badgeDanger']}>오답</span>
        )}
      </td>
      <td>{result.explanation ?? '-'}</td>
    </tr>
  );
};

export default AdminUserDetailSection;
