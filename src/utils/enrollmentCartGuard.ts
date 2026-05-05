import type { EnrollmentSummary } from '@/types/mypage';

type EnrollmentCartState = Pick<EnrollmentSummary, 'learningStatus' | 'status'>;

export const blocksProgramCartAction = (enrollment: EnrollmentCartState) => {
  return enrollment.status !== 'CANCELLED' && enrollment.learningStatus !== 'CANCELLED';
};
