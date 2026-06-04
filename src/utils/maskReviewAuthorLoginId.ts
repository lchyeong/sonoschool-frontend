const MASK_CHARACTER = '*';
const MASKED_TRAILING_CHARACTER_COUNT = 3;
const FALLBACK_REVIEW_AUTHOR_LABEL = '작성자';

export const maskReviewAuthorLoginId = (loginId: string | null | undefined): string => {
  const normalizedLoginId = loginId?.trim() ?? '';

  if (!normalizedLoginId) {
    return FALLBACK_REVIEW_AUTHOR_LABEL;
  }

  const loginIdCharacters = Array.from(normalizedLoginId);
  const visibleCharacterCount = Math.max(
    loginIdCharacters.length - MASKED_TRAILING_CHARACTER_COUNT,
    0,
  );

  return [
    ...loginIdCharacters.slice(0, visibleCharacterCount),
    ...Array.from({
      length: Math.min(MASKED_TRAILING_CHARACTER_COUNT, loginIdCharacters.length),
    }).map(() => MASK_CHARACTER),
  ].join('');
};
