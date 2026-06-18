import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StudentProblemAttemptReport } from '@/types/studentProblems';

import ProblemReportModal from './ProblemReportModal';

const createReport = (
  overrides: Partial<StudentProblemAttemptReport> = {},
): StudentProblemAttemptReport => ({
  applicantName: '김민지',
  areaStats: [
    {
      correctCount: 2,
      problemAreaId: 101,
      problemAreaName: '기준 단면',
      totalCount: 3,
      wrongCount: 1,
      wrongAnswerShareRate: 11,
    },
    {
      correctCount: 2,
      problemAreaId: 102,
      problemAreaName: '프로브 조작',
      totalCount: 2,
      wrongCount: 0,
      wrongAnswerShareRate: 0,
    },
  ],
  attemptId: 9001,
  correctCount: 4,
  correctRate: 80,
  examName: '복부 초음파 문제',
  lectureId: 9101,
  passCorrectCount: 4,
  passed: true,
  problemId: 8801,
  questionResults: [
    {
      correct: false,
      correctOptionIds: [1],
      explanation: '기준 단면 해설입니다.',
      problemAreaId: 101,
      problemAreaName: '기준 단면',
      questionId: 5001,
      questionText: '간문맥 기준 단면은?',
      submittedOptionIds: [2],
    },
  ],
  score: 80,
  submittedAt: '2026-06-18T09:00:00Z',
  totalQuestionCount: 5,
  wrongCount: 1,
  ...overrides,
});

afterEach(() => {
  cleanup();
});

describe('ProblemReportModal', () => {
  it('renders each wrong problem area with its wrong rate below the area name', () => {
    render(
      <ProblemReportModal
        onClose={vi.fn()}
        report={createReport({
          areaStats: [
            {
              correctCount: 2,
              problemAreaId: 101,
              problemAreaName: '기준 단면',
              totalCount: 3,
              wrongCount: 1,
              wrongAnswerShareRate: 32,
            },
            {
              correctCount: 8,
              problemAreaId: 102,
              problemAreaName: '프로브 조작',
              totalCount: 9,
              wrongCount: 1,
              wrongAnswerShareRate: 11,
            },
            {
              correctCount: 19,
              problemAreaId: 103,
              problemAreaName: '초음파 물리',
              totalCount: 20,
              wrongCount: 1,
              wrongAnswerShareRate: 5,
            },
          ],
        })}
      />,
    );

    const wrongRateRegion = screen.getByRole('region', {
      name: '문제 영역별 오답 비율',
    });

    expect(within(wrongRateRegion).getByText('기준 단면')).toBeInTheDocument();
    expect(within(wrongRateRegion).getByText('32%')).toBeInTheDocument();
    expect(within(wrongRateRegion).getByText('프로브 조작')).toBeInTheDocument();
    expect(within(wrongRateRegion).getByText('11%')).toBeInTheDocument();
    expect(within(wrongRateRegion).getByText('초음파 물리')).toBeInTheDocument();
    expect(within(wrongRateRegion).getByText('5%')).toBeInTheDocument();
  });

  it('renders wrong rate summary only for wrong problem areas and fills empty columns', () => {
    render(<ProblemReportModal onClose={vi.fn()} report={createReport()} />);

    const wrongRateRegion = screen.getByRole('region', {
      name: '문제 영역별 오답 비율',
    });

    expect(within(wrongRateRegion).getByText('기준 단면')).toBeInTheDocument();
    expect(within(wrongRateRegion).getByText('11%')).toBeInTheDocument();
    expect(within(wrongRateRegion).queryByText('프로브 조작')).not.toBeInTheDocument();
    expect(wrongRateRegion.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('falls back to wrong count share when the API does not include wrongAnswerShareRate yet', () => {
    render(
      <ProblemReportModal
        onClose={vi.fn()}
        report={createReport({
          areaStats: [
            {
              correctCount: 0,
              problemAreaId: 101,
              problemAreaName: '123',
              totalCount: 1,
              wrongCount: 1,
            },
          ],
          correctCount: 0,
          correctRate: 0,
          score: 0,
          totalQuestionCount: 1,
          wrongCount: 1,
        })}
      />,
    );

    const wrongRateRegion = screen.getByRole('region', {
      name: '문제 영역별 오답 비율',
    });

    expect(within(wrongRateRegion).getByText('123')).toBeInTheDocument();
    expect(within(wrongRateRegion).getByText('100%')).toBeInTheDocument();
  });

  it('hides wrong rate summary when all answers are correct', () => {
    render(
      <ProblemReportModal
        onClose={vi.fn()}
        report={createReport({
          areaStats: [
            {
              correctCount: 3,
              problemAreaId: 101,
              problemAreaName: '기준 단면',
              totalCount: 3,
              wrongCount: 0,
              wrongAnswerShareRate: 0,
            },
          ],
          correctCount: 3,
          correctRate: 100,
          score: 100,
          totalQuestionCount: 3,
          wrongCount: 0,
        })}
      />,
    );

    expect(
      screen.queryByRole('region', {
        name: '문제 영역별 오답 비율',
      }),
    ).not.toBeInTheDocument();
  });
});
