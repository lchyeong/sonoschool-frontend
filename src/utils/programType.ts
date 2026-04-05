import type { ProgramType } from '@/types/mypage';

export const isOnlineProgramType = (programType: ProgramType): boolean => {
  return programType === 'ONLINE' || programType === 'HYBRID' || programType === 'PROBLEM_SOLVING';
};

export const getProgramTypeLabel = (programType: ProgramType): string => {
  switch (programType) {
    case 'ONLINE':
      return '온라인';
    case 'OFFLINE':
      return '오프라인';
    case 'HYBRID':
      return '하이브리드';
    case 'PROBLEM_SOLVING':
      return '문제풀이';
  }
};
