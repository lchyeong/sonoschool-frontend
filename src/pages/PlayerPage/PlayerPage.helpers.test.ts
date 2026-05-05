import { describe, expect, it } from 'vitest';

import { formatPlaybackWatermarkText } from './PlayerPage.helpers';

describe('formatPlaybackWatermarkText', () => {
  it('removes masked phone markers from playback watermark text', () => {
    expect(formatPlaybackWatermarkText('테스트회원 · ****1234')).toBe('테스트회원1234');
  });

  it('preserves already normalized playback watermark text', () => {
    expect(formatPlaybackWatermarkText('테스트회원1234')).toBe('테스트회원1234');
  });
});
