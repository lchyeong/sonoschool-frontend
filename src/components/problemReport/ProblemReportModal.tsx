import type { CSSProperties } from 'react';

import iconPrinter from '@/assets/icons/lucide_printer.svg';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import type { StudentProblemAttemptReport } from '@/types/studentProblems';

import styles from './ProblemReportModal.module.scss';
import { resolveProblemTargetScore } from './problemReportUtils';

interface ProblemReportModalProps {
  onClose: () => void;
  report: StudentProblemAttemptReport | null;
}

type ProblemReportIconStyle = CSSProperties & {
  '--problem-report-icon'?: string;
};

const printerIconStyle: ProblemReportIconStyle = {
  '--problem-report-icon': `url("${iconPrinter}")`,
};

const escapeReportText = (value: string | number | null | undefined): string => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const formatReportDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const openProblemReportPrintWindow = (report: StudentProblemAttemptReport): void => {
  const targetScore = resolveProblemTargetScore(
    report.passScore,
    report.passCorrectCount,
    report.totalQuestionCount,
  );
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
          @page {
            size: A4;
            margin: 18mm 14mm;
          }
          * { box-sizing: border-box; }
          html {
            background: #ffffff;
          }
          body {
            margin: 18mm 14mm;
            color: #111827;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 16px;
            font-weight: 650;
          }
          @media print {
            @page {
              size: A4;
              margin: 18mm 14mm;
            }

            body {
              margin: 0;
            }
          }
          h1 {
            margin: 0 0 30px;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 0;
          }
          h2 {
            margin: 0 0 14px;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0;
          }
          .section {
            margin: 0 0 30px;
            break-inside: avoid;
          }
          .tableBox,
          .summary,
          .verdict {
            overflow: hidden;
            border: 1px solid #d1d5db;
            border-radius: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th,
          td {
            min-height: 48px;
            padding: 13px 15px;
            border-right: 1px solid #d1d5db;
            border-bottom: 1px solid #d1d5db;
            color: #111827;
            font-size: 16px;
            font-weight: 650;
            line-height: 1.35;
            text-align: left;
          }
          th {
            width: 14.5%;
            background: #f3f4f6;
          }
          td {
            width: 35.5%;
            background: #ffffff;
          }
          tr:last-child th,
          tr:last-child td {
            border-bottom: 0;
          }
          th:last-child,
          td:last-child {
            border-right: 0;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            min-height: 88px;
            align-items: center;
            text-align: center;
          }
          .summary div {
            display: grid;
            gap: 17px;
            padding: 17px 16px;
            border-right: 1px solid #d1d5db;
          }
          .summary div:last-child {
            border-right: 0;
          }
          .summary strong {
            font-size: 21px;
            font-weight: 800;
          }
          .verdict {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            min-height: 82px;
            align-items: center;
            background: #f9fafb;
          }
          .verdictResult {
            display: flex;
            justify-content: center;
            gap: 28px;
            padding: 22px 16px;
            border-right: 1px solid #d1d5db;
            font-size: 20px;
            font-weight: 800;
          }
          .verdictScores {
            display: grid;
            gap: 14px;
            padding: 18px 32px;
          }
          .verdictScores div {
            display: grid;
            grid-template-columns: 92px minmax(0, 1fr);
            gap: 16px;
          }
          .result {
            color: ${report.passed ? '#34b29f' : '#dd383e'};
            font-size: 22px;
            font-weight: 800;
          }
          .analysis th,
          .analysis td,
          .overall th,
          .overall td {
            width: auto;
          }
          .analysis th,
          .overall th {
            color: #4b5563;
          }
          .overall th,
          .overall td {
            width: 33.333%;
          }
        </style>
      </head>
      <body>
        <h1>문제 결과 리포트</h1>
        <section class="section">
          <h2>기본 정보</h2>
          <div class="tableBox">
            <table>
              <tbody>
                <tr>
                  <th>응시자</th>
                  <td>${escapeReportText(report.applicantName)}</td>
                  <th>시험명</th>
                  <td>${escapeReportText(report.examName)}</td>
                </tr>
                <tr>
                  <th>응시일</th>
                  <td>${escapeReportText(formatReportDate(report.submittedAt))}</td>
                  <th>총 문항 수</th>
                  <td>${String(report.totalQuestionCount)}문항</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <h2>결과 요약</h2>
          <div class="summary">
            <div>정답 수<strong>${String(report.correctCount)}문항</strong></div>
            <div>오답 수<strong>${String(report.wrongCount)}문항</strong></div>
            <div>정답률<strong>${String(report.correctRate)}%</strong></div>
          </div>
        </section>

        <section class="section">
          <h2>최종 판정</h2>
          <div class="verdict">
            <div class="verdictResult"><span>결과</span><span class="result">${report.passed ? 'PASS' : 'FAIL'}</span></div>
            <div class="verdictScores">
              <div>기준 점수&nbsp;&nbsp; ${String(targetScore)}점 이상 취득 시 합격</div>
              <div>현재 점수&nbsp;&nbsp; ${String(report.score)}점</div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2>오답 분석</h2>
          <div class="tableBox">
            <table class="analysis">
              <thead><tr><th>영역</th><th>틀린 개수 / 총 문제 수</th></tr></thead>
              <tbody>${areaRows}</tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <h2>전체 결과</h2>
          <div class="tableBox">
            <table class="overall">
              <thead><tr><th>문항</th><th>결과</th><th>문제영역</th></tr></thead>
              <tbody>${questionRows}</tbody>
            </table>
          </div>
        </section>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;
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

const ProblemReportModal = ({ onClose, report }: ProblemReportModalProps) => {
  if (!report) {
    return null;
  }

  const reportTargetScore = resolveProblemTargetScore(
    report.passScore,
    report.passCorrectCount,
    report.totalQuestionCount,
  );

  return (
    <Modal
      bodyClassName={styles['modalBody']}
      closeButtonClassName={styles['modalClose']}
      closeButtonContent={<span aria-hidden='true'>×</span>}
      onClose={onClose}
      panelClassName={styles['modal']}
      size='lg'
      title='문제 결과 리포트'
      titleClassName={styles['modalTitle']}
    >
      <div className={styles['content']}>
        <section className={styles['section']}>
          <h3 className={styles['sectionTitle']}>기본 정보</h3>
          <dl className={styles['infoGrid']}>
            <div className={styles['infoCell']}>
              <dt>응시자</dt>
              <dd>{report.applicantName}</dd>
            </div>
            <div className={styles['infoCell']}>
              <dt>시험명</dt>
              <dd>{report.examName}</dd>
            </div>
            <div className={styles['infoCell']}>
              <dt>응시일</dt>
              <dd>{formatReportDate(report.submittedAt)}</dd>
            </div>
            <div className={styles['infoCell']}>
              <dt>총 문항 수</dt>
              <dd>{String(report.totalQuestionCount)}문항</dd>
            </div>
          </dl>
        </section>

        <section className={styles['section']}>
          <h3 className={styles['sectionTitle']}>결과 요약</h3>
          <dl className={styles['metricGrid']}>
            <div>
              <dt>정답 수</dt>
              <dd>{String(report.correctCount)}문항</dd>
            </div>
            <div>
              <dt>오답 수</dt>
              <dd>{String(report.wrongCount)}문항</dd>
            </div>
            <div>
              <dt>정답률</dt>
              <dd>{String(report.correctRate)}%</dd>
            </div>
          </dl>
        </section>

        <section className={styles['section']}>
          <h3 className={styles['sectionTitle']}>최종 판정</h3>
          <div className={styles['verdictBox']}>
            <div className={styles['verdictResult']}>
              <span>결과</span>
              <strong className={styles['finalResult']} data-passed={report.passed}>
                {report.passed ? 'PASS' : 'FAIL'}
              </strong>
            </div>
            <dl className={styles['verdictScoreList']}>
              <div>
                <dt>기준 점수</dt>
                <dd>{String(reportTargetScore)}점 이상 취득 시 합격</dd>
              </div>
              <div>
                <dt>현재 점수</dt>
                <dd>{String(report.score)}점</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={styles['section']}>
          <h3 className={styles['sectionTitle']}>오답 분석</h3>
          <div className={styles['tableWrap']}>
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th scope='col'>영역</th>
                  <th scope='col'>틀린 개수 / 총문제수</th>
                </tr>
              </thead>
              <tbody>
                {report.areaStats.length ? (
                  report.areaStats.map((area) => (
                    <tr key={area.problemAreaId}>
                      <td>{area.problemAreaName}</td>
                      <td>
                        {String(area.wrongCount)} / {String(area.totalCount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>영역별 결과가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles['section']}>
          <h3 className={styles['sectionTitle']}>전체 결과</h3>
          <div className={styles['tableWrap']}>
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th scope='col'>문항</th>
                  <th scope='col'>결과</th>
                  <th scope='col'>문제영역</th>
                </tr>
              </thead>
              <tbody>
                {report.questionResults.map((result, index) => (
                  <tr key={result.questionId}>
                    <td>{String(index + 1)}문제</td>
                    <td>
                      <strong className={styles['questionResult']} data-correct={result.correct}>
                        {result.correct ? 'O' : 'X'}
                      </strong>
                    </td>
                    <td>{result.problemAreaName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className={styles['actions']}>
        <Button
          className={styles['printButton']}
          onClick={() => {
            openProblemReportPrintWindow(report);
          }}
          type='button'
          variant='primary'
        >
          <span>인쇄하기</span>
          <span aria-hidden='true' className={styles['printIcon']} style={printerIconStyle} />
        </Button>
        <Button
          className={styles['closeButton']}
          onClick={onClose}
          type='button'
          variant='secondary'
        >
          닫기
        </Button>
      </div>
    </Modal>
  );
};

export default ProblemReportModal;
