const OPTION_LABEL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const formatQuizOptionLabel = (optionIndex: number): string => {
  if (optionIndex >= 0 && optionIndex < OPTION_LABEL_ALPHABET.length) {
    return OPTION_LABEL_ALPHABET[optionIndex] ?? String(optionIndex + 1);
  }

  return String(optionIndex + 1);
};
