import { describe, expect, it } from 'vitest';

import { maskReviewAuthorLoginId } from './maskReviewAuthorLoginId';

describe('maskReviewAuthorLoginId', () => {
  it('아이디 첫 글자만 남기고 나머지를 마스킹한다', () => {
    expect(maskReviewAuthorLoginId('student01')).toBe('s********');
  });

  it('짧은 아이디도 첫 글자만 보여준다', () => {
    expect(maskReviewAuthorLoginId('abc')).toBe('a**');
    expect(maskReviewAuthorLoginId('ab')).toBe('a*');
    expect(maskReviewAuthorLoginId('a')).toBe('a');
  });

  it('공백을 제거한 아이디 기준으로 마스킹한다', () => {
    expect(maskReviewAuthorLoginId(' user2026 ')).toBe('u*******');
  });

  it('한글 아이디도 글자 단위로 마스킹한다', () => {
    expect(maskReviewAuthorLoginId('김학생')).toBe('김**');
  });

  it('아이디가 없으면 이름 대신 기본 작성자 라벨을 반환한다', () => {
    expect(maskReviewAuthorLoginId('')).toBe('작성자');
    expect(maskReviewAuthorLoginId(null)).toBe('작성자');
  });
});
