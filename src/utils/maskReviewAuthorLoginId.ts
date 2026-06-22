const MASK_CHARACTER = '*';
const FALLBACK_REVIEW_AUTHOR_LABEL = '작성자';

export const maskReviewAuthorLoginId = (loginId: string | null | undefined): string => {
  const normalizedLoginId = loginId?.trim() ?? '';

  if (!normalizedLoginId) {
    return FALLBACK_REVIEW_AUTHOR_LABEL;
  }

  const loginIdCharacters = Array.from(normalizedLoginId);
  const [visibleCharacter, ...maskedCharacters] = loginIdCharacters;

  return [visibleCharacter, ...maskedCharacters.map(() => MASK_CHARACTER)].join('');
};
