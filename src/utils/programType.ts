import type { CouponAppliesTo, ProgramType } from '@/types/mypage';

export const isOnlineProgramType = (programType: ProgramType): boolean => {
  return programType === 'ONLINE' || programType === 'HYBRID';
};

export const getProgramTypeLabel = (programType: ProgramType): string => {
  return isOnlineProgramType(programType) ? '온라인' : '오프라인';
};

export const matchesProgramTypeFilter = (
  programType: ProgramType,
  filter: Exclude<CouponAppliesTo, 'ALL'>,
): boolean => {
  if (filter === 'ONLINE') {
    return isOnlineProgramType(programType);
  }

  return programType === 'OFFLINE';
};
