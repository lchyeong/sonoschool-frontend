import type {
  AdminUserDetailLectureItem,
  AdminUserDetailProblemAttemptItem,
} from '@/types/adminUsers';

export const enrollmentStatusLabel: Record<string, string> = {
  ACTIVE: '수강중',
  CANCELLED: '취소',
  EXPIRED: '만료',
};

export const lectureTypeLabel: Record<string, string> = {
  OFFLINE: '오프라인',
  PRACTICUM: '실습',
  PROBLEM: '문제',
  RESOURCE: '첨부자료',
  VIDEO: '영상',
};

export const paymentStatusLabel: Record<string, string> = {
  CANCELLED: '취소',
  COMPLETED: '결제완료',
  FAILED: '실패',
  PENDING: '대기',
  REGISTERED: '등록',
};

export const programTypeLabel: Record<string, string> = {
  HYBRID: '하이브리드',
  OFFLINE: '오프라인',
  ONLINE: '온라인',
};

export const qnaScopeLabel: Record<string, string> = {
  GLOBAL: '운영 Q&A',
  PROGRAM: '강좌 Q&A',
};

export const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

export const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return '-';
  }

  return `${amount.toLocaleString('ko-KR')}원`;
};

export const formatDurationMinutes = (durationSeconds: number | null): string => {
  if (durationSeconds === null) {
    return '-';
  }

  return `${String(Math.ceil(durationSeconds / 60))}분`;
};

export const escapeReportText = (value: string | number | null | undefined): string => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

export const getFirstProblemAttempt = (
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
