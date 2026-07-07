import { describe, expect, it } from 'vitest';

import {
  formatIntegerInputValue,
  isIntegerInputValue,
  normalizeIntegerInputValue,
} from '@/utils/integerInputFormat';

describe('integerInputFormat', () => {
  it('formats integer input values with Korean thousands separators', () => {
    expect(formatIntegerInputValue('1234567')).toBe('1,234,567');
    expect(formatIntegerInputValue(220000)).toBe('220,000');
    expect(formatIntegerInputValue('9007199254740993')).toBe('9,007,199,254,740,993');
  });

  it('normalizes comma-formatted values for validation and payload conversion', () => {
    expect(normalizeIntegerInputValue(' 1,234,567 ')).toBe('1234567');
    expect(isIntegerInputValue('1,234,567')).toBe(true);
  });

  it('keeps invalid input visible so field validation can show an error', () => {
    expect(formatIntegerInputValue('12a34')).toBe('12a34');
    expect(isIntegerInputValue('12a34')).toBe(false);
  });
});
