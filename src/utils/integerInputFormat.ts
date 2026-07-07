const integerInputFormatter = new Intl.NumberFormat('ko-KR');

export const normalizeIntegerInputValue = (value: string): string => {
  return value.replace(/,/g, '').trim();
};

export const isIntegerInputValue = (value: string): boolean => {
  const normalizedValue = normalizeIntegerInputValue(value);
  return normalizedValue.length > 0 && /^\d+$/.test(normalizedValue);
};

export const formatIntegerInputValue = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = typeof value === 'number' ? String(value) : value;
  const normalizedValue = normalizeIntegerInputValue(stringValue);

  if (!normalizedValue) {
    return '';
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return stringValue;
  }

  return integerInputFormatter.format(BigInt(normalizedValue));
};
