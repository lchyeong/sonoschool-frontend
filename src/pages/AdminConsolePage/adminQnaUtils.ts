import type { QuestionItem, QuestionScope } from '@/types/qna';

export type ScopeFilterValue = 'ALL' | QuestionScope;
export type AnsweredFilterValue = 'ALL' | 'ANSWERED' | 'WAITING';

export const QNA_PAGE_SIZE = 6;

export const QNA_SCOPE_LABELS: Record<QuestionScope, string> = {
  GLOBAL: '운영 Q&A',
  PROGRAM: '프로그램 Q&A',
};

export const ANSWERED_FILTER_OPTIONS: Array<{ label: string; value: AnsweredFilterValue }> = [
  { label: '전체', value: 'ALL' },
  { label: '답변 대기', value: 'WAITING' },
  { label: '답변 완료', value: 'ANSWERED' },
];

export const SCOPE_FILTER_OPTIONS: Array<{ label: string; value: ScopeFilterValue }> = [
  { label: '전체', value: 'ALL' },
  { label: '운영', value: 'GLOBAL' },
  { label: '프로그램', value: 'PROGRAM' },
];

export interface QnaSummary {
  answeredCount: number;
  globalCount: number;
  pendingCount: number;
  programCount: number;
}

const getNoticeSortOrder = (question: QuestionItem): number => {
  return question.noticeSortOrder ?? 0;
};

export const sortNoticeQuestions = (questions: readonly QuestionItem[]): QuestionItem[] => {
  return [...questions].sort((left, right) => {
    const orderDiff = getNoticeSortOrder(left) - getNoticeSortOrder(right);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
};

export const formatQnaDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

export const summarizeQna = (questions: readonly QuestionItem[]): QnaSummary => {
  return {
    answeredCount: questions.filter((question) => question.answered).length,
    globalCount: questions.filter((question) => question.scope === 'GLOBAL').length,
    pendingCount: questions.filter((question) => !question.answered).length,
    programCount: questions.filter((question) => question.scope === 'PROGRAM').length,
  };
};

export const buildQuestionLocationLabel = (
  scope: QuestionScope,
  programTitle: string | null,
): string => {
  if (scope === 'PROGRAM') {
    return programTitle ? `${QNA_SCOPE_LABELS[scope]} · ${programTitle}` : QNA_SCOPE_LABELS[scope];
  }

  return QNA_SCOPE_LABELS[scope];
};

export const paginateQuestions = (
  questions: readonly QuestionItem[],
  currentPage: number,
): QuestionItem[] => {
  return questions.slice((currentPage - 1) * QNA_PAGE_SIZE, currentPage * QNA_PAGE_SIZE);
};
