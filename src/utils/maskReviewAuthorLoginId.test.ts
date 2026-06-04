import { describe, expect, it } from 'vitest';

import { maskReviewAuthorLoginId } from './maskReviewAuthorLoginId';

describe('maskReviewAuthorLoginId', () => {
  it('아이디 뒤 3자리를 마스킹한다', () => {
    expect(maskReviewAuthorLoginId('student01')).toBe('studen***');
  });

  it('3자 이하 아이디는 전체 마스킹한다', () => {
    expect(maskReviewAuthorLoginId('abc')).toBe('***');
    expect(maskReviewAuthorLoginId('ab')).toBe('**');
    expect(maskReviewAuthorLoginId('a')).toBe('*');
  });

  it('공백을 제거한 아이디 기준으로 마스킹한다', () => {
    expect(maskReviewAuthorLoginId(' user2026 ')).toBe('user2***');
  });

  it('아이디가 없으면 이름 대신 기본 작성자 라벨을 반환한다', () => {
    expect(maskReviewAuthorLoginId('')).toBe('작성자');
    expect(maskReviewAuthorLoginId(null)).toBe('작성자');
  });
});
