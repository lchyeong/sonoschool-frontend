import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import type { StudentProblemAttemptReport } from '@/types/studentProblems';

import styles from './AdminConsolePage.module.scss';
import { escapeReportText, formatDateTime } from './adminUserDetailUtils';

interface AdminUserProblemReportModalProps {
  onClose: () => void;
  report: StudentProblemAttemptReport | null;
}

const openProblemReportPrintWindow = (report: StudentProblemAttemptReport): void => {
  const areaRows = report.areaStats
    .map(
      (area) => `
        <tr>
          <td>${escapeReportText(area.problemAreaName)}</td>
          <td>${String(area.wrongCount)} / ${String(area.totalCount)}</td>
        </tr>
      `,
    )
    .join('');
  const questionRows = report.questionResults
    .map(
      (result, index) => `
        <tr>
          <td>${String(index + 1)}문제</td>
          <td>${result.correct ? 'O' : 'X'}</td>
          <td>${escapeReportText(result.problemAreaName ?? '-')}</td>
        </tr>
      `,
    )
    .join('');

  const reportHtml = `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${escapeReportText(report.examName)} 결과 리포트</title>
        <style>
          body { margin: 0; padding: 40px; color: #111827; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          h1 { margin: 0 0 28px; font-size: 28px; }
          h2 { margin: 28px 0 12px; font-size: 20px; }
          ul { margin: 0; padding-left: 22px; line-height: 1.9; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #d1d5db; text-align: left; }
          th { color: #4b5563; font-size: 13px; }
          .result { font-size: 22px; font-weight: 800; }
          @media print { body { padding: 24px; } }
        </style>
      </head>
      <body>
        <h1>문제 결과 리포트</h1>
        <h2>■ 기본 정보</h2>
        <ul>
          <li>응시자: ${escapeReportText(report.applicantName)}</li>
          <li>시험명: ${escapeReportText(report.examName)}</li>
          <li>응시일: ${escapeReportText(formatDateTime(report.submittedAt))}</li>
          <li>총 문항 수: ${String(report.totalQuestionCount)}문항</li>
        </ul>
        <h2>■ 결과 요약</h2>
        <ul>
          <li>정답 수: ${String(report.correctCount)}문항</li>
          <li>오답 수: ${String(report.wrongCount)}문항</li>
          <li>정답률: ${String(report.correctRate)}%</li>
        </ul>
        <h2>■ 최종 판정</h2>
        <ul>
          <li class="result">결과: ${report.passed ? 'PASS' : 'FAIL'}</li>
          <li>기준 점수: ${String(report.passCorrectCount)}개 이상 정답 = 합격</li>
          <li>현재 점수: ${String(report.score)}점</li>
        </ul>
        <h2>■ 오답 분석</h2>
        <table>
          <thead><tr><th>영역</th><th>틀린 개수 / 총문제수</th></tr></thead>
          <tbody>${areaRows}</tbody>
        </table>
        <h2>■ 전체 결과</h2>
        <table>
          <thead><tr><th>문항</th><th>결과</th><th>문제 영역</th></tr></thead>
          <tbody>${questionRows}</tbody>
        </table>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;
  // Blob URL keeps the printable report isolated without using deprecated document.write.
  const reportUrl = URL.createObjectURL(new Blob([reportHtml], { type: 'text/html' }));
  const popup = window.open(reportUrl, '_blank', 'width=840,height=1120');
  if (!popup) {
    URL.revokeObjectURL(reportUrl);
    return;
  }
  window.setTimeout(() => {
    URL.revokeObjectURL(reportUrl);
  }, 60_000);
};

const AdminUserProblemReportModal = ({ onClose, report }: AdminUserProblemReportModalProps) => {
  if (!report) {
    return null;
  }

  return (
    <Modal
      bodyClassName={styles['adminProblemReportModalBody']}
      onClose={onClose}
      panelClassName={styles['adminProblemReportModal']}
      size='lg'
      title='문제 결과 리포트'
    >
      <div className={styles['stackList']}>
        <section className={styles['panel']}>
          <h3 className={styles['itemTitle']}>기본 정보</h3>
          <div className={styles['paymentDetailGrid']}>
            <div className={styles['paymentDetailField']}>
              <span className={styles['paymentDetailLabel']}>응시자</span>
              <strong className={styles['paymentDetailValue']}>{report.applicantName}</strong>
            </div>
            <div className={styles['paymentDetailField']}>
              <span className={styles['paymentDetailLabel']}>시험명</span>
              <strong className={styles['paymentDetailValue']}>{report.examName}</strong>
            </div>
            <div className={styles['paymentDetailField']}>
              <span className={styles['paymentDetailLabel']}>응시일</span>
              <strong className={styles['paymentDetailValue']}>
                {formatDateTime(report.submittedAt)}
              </strong>
            </div>
            <div className={styles['paymentDetailField']}>
              <span className={styles['paymentDetailLabel']}>총 문항 수</span>
              <strong className={styles['paymentDetailValue']}>
                {String(report.totalQuestionCount)}문항
              </strong>
            </div>
          </div>
        </section>

        <section className={styles['panel']}>
          <h3 className={styles['itemTitle']}>결과 요약</h3>
          <div className={styles['summaryGrid']}>
            <article className={styles['summaryCard']} data-tone='brand'>
              <p className={styles['summaryLabel']}>정답 수</p>
              <strong className={styles['summaryValue']}>{String(report.correctCount)}문항</strong>
            </article>
            <article className={styles['summaryCard']} data-tone='accent'>
              <p className={styles['summaryLabel']}>오답 수</p>
              <strong className={styles['summaryValue']}>{String(report.wrongCount)}문항</strong>
            </article>
            <article className={styles['summaryCard']} data-tone='brand'>
              <p className={styles['summaryLabel']}>정답률</p>
              <strong className={styles['summaryValue']}>{String(report.correctRate)}%</strong>
            </article>
            <article className={styles['summaryCard']} data-tone='accent'>
              <p className={styles['summaryLabel']}>최종 판정</p>
              <strong className={styles['summaryValue']}>{report.passed ? 'PASS' : 'FAIL'}</strong>
            </article>
          </div>
          <p className={styles['helperText']}>
            기준 점수: {String(report.passCorrectCount)}개 이상 정답 = 합격 · 현재 점수:{' '}
            {String(report.score)}점
          </p>
        </section>

        <section className={styles['panel']}>
          <h3 className={styles['itemTitle']}>오답 분석</h3>
          <div className={styles['tableWrap']}>
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th scope='col'>영역</th>
                  <th scope='col'>틀린 개수 / 총문제수</th>
                </tr>
              </thead>
              <tbody>
                {report.areaStats.map((area) => (
                  <tr key={area.problemAreaId}>
                    <td>{area.problemAreaName}</td>
                    <td>
                      {String(area.wrongCount)} / {String(area.totalCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles['panel']}>
          <h3 className={styles['itemTitle']}>전체 결과</h3>
          <div className={styles['tableWrap']}>
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th scope='col'>문항</th>
                  <th scope='col'>결과</th>
                  <th scope='col'>문제 영역</th>
                </tr>
              </thead>
              <tbody>
                {report.questionResults.map((result, index) => (
                  <tr key={result.questionId}>
                    <td>{String(index + 1)}문제</td>
                    <td>{result.correct ? 'O' : 'X'}</td>
                    <td>{result.problemAreaName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className={styles['actionRow']}>
          <Button
            onClick={() => {
              openProblemReportPrintWindow(report);
            }}
            type='button'
          >
            인쇄
          </Button>
          <Button onClick={onClose} type='button' variant='secondary'>
            닫기
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminUserProblemReportModal;
