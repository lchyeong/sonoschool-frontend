import { describe, expect, it } from 'vitest';

import {
  isUnsafeStorageAssetUrl,
  sanitizePublicAssetUrl,
  sanitizeRequiredPublicAssetUrl,
} from './publicAssetUrl';

describe('publicAssetUrl', () => {
  it('blocks S3 storage scheme URLs from renderable asset fields', () => {
    expect(
      sanitizePublicAssetUrl(
        's3://sonoschool-prod-media/assets/programs/thumbnails/uuid/image_79.png',
      ),
    ).toBeNull();
  });

  it('blocks direct S3 HTTP URLs from renderable asset fields', () => {
    expect(
      isUnsafeStorageAssetUrl(
        'https://sonoschool-prod-media.s3.amazonaws.com/assets/programs/thumbnails/uuid/image_79.png',
      ),
    ).toBe(true);
    expect(
      isUnsafeStorageAssetUrl(
        'https://s3.ap-northeast-2.amazonaws.com/sonoschool-prod-media/assets/programs/thumbnails/uuid/image_79.png',
      ),
    ).toBe(true);
  });

  it('keeps public CDN and local asset URLs', () => {
    expect(sanitizePublicAssetUrl(' https://media.newzest.xyz/assets/image.png ')).toBe(
      'https://media.newzest.xyz/assets/image.png',
    );
    expect(sanitizeRequiredPublicAssetUrl('/SRDMS_OG.png', '/fallback.png')).toBe('/SRDMS_OG.png');
  });

  it('falls back when the required asset URL is unsafe', () => {
    expect(sanitizeRequiredPublicAssetUrl('s3://bucket/key.png', '/SRDMS_OG.png')).toBe(
      '/SRDMS_OG.png',
    );
  });
});
