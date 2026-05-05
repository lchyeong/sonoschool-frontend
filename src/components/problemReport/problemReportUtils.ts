const calculateTargetScore = (passCorrectCount: number, totalQuestionCount: number): number => {
  if (totalQuestionCount <= 0) {
    return 0;
  }

  return Math.ceil((passCorrectCount / totalQuestionCount) * 100);
};

export const resolveProblemTargetScore = (
  passScore: number | null | undefined,
  passCorrectCount: number,
  totalQuestionCount: number,
): number => {
  return typeof passScore === 'number'
    ? Math.max(0, Math.min(100, passScore))
    : calculateTargetScore(passCorrectCount, totalQuestionCount);
};
