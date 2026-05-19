import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosGetMock, axiosPostMock, httpGetMock } = vi.hoisted(() => {
  return {
    axiosGetMock: vi.fn(),
    axiosPostMock: vi.fn(),
    httpGetMock: vi.fn(),
  };
});

vi.mock('@/api/axiosInstance', () => {
  return {
    default: {
      get: axiosGetMock,
      post: axiosPostMock,
    },
  };
});

vi.mock('@/api/http', () => {
  return {
    http: {
      get: httpGetMock,
    },
  };
});

import { addMyCartItem, fetchMyCart } from '@/api/mypage';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CartSummary } from '@/types/mypage';

const s3ThumbnailUrl =
  's3://sonoschool-prod-media/uploads/videos/assets/programs/thumbnails/a345472c-cdaf-49f5-97cb-aa6aba6fe1de/sample.png';
const signedThumbnailUrl =
  'https://media.newzest.xyz/uploads/videos/assets/programs/thumbnails/a345472c-cdaf-49f5-97cb-aa6aba6fe1de/sample.png';
const expiredSignedThumbnailUrl =
  'https://sonoschool-prod-media.s3.amazonaws.com/uploads/videos/assets/programs/thumbnails/a345472c-cdaf-49f5-97cb-aa6aba6fe1de/sample.png?X-Amz-Date=20260504T072345Z&X-Amz-Expires=900&X-Amz-Signature=expired';

const createCartSummary = (thumbnailUrl: string | null): CartSummary => ({
  itemCount: 1,
  items: [
    {
      addedAt: '2026-04-28T00:00:00.000Z',
      detailPath: '/programs/general-course/abdomen/abdomen-basic-6-weeks/advance-6',
      id: 501,
      instructorName: '장은희',
      originalPrice: 100000,
      payablePrice: 90000,
      programId: 24,
      programType: 'ONLINE',
      saleEndAt: null,
      salePrice: 90000,
      saleStartAt: null,
      thumbnailUrl,
      title: '복부 Advance 스캔 6주',
    },
  ],
  totalOriginalPrice: 100000,
  totalPayablePrice: 90000,
});

describe('mypage cart thumbnails', () => {
  beforeEach(() => {
    axiosGetMock.mockReset();
    axiosPostMock.mockReset();
    httpGetMock.mockReset();
    useAuthStore.setState({
      accessToken: 'token',
      displayName: '홍길동',
      expiresAt: '2026-06-30T00:00:00Z',
      isAuthenticated: true,
      loginId: 'student01',
      role: 'ROLE_STUDENT',
      tokenType: 'Bearer',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces cart s3 thumbnail URLs with catalog public thumbnail URLs', async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        data: createCartSummary(s3ThumbnailUrl),
      },
    });
    httpGetMock.mockResolvedValueOnce({
      items: [
        {
          categoryLabel: '복부 Basic 스캔 6주',
          description: '복부 초음파 과정',
          id: 'lecture-24',
          scope: 'lecture',
          thumbnailAlt: '복부 Advance 스캔 6주 썸네일',
          thumbnailCropOffsetX: 24,
          thumbnailCropOffsetY: -18,
          thumbnailCropZoom: 1.35,
          thumbnailSrc: signedThumbnailUrl,
          title: '복부 Advance 스캔 6주',
          to: '/programs/general-course/abdomen/abdomen-basic-6-weeks/advance-6',
        },
      ],
    });

    const cart = await fetchMyCart();

    expect(cart.items[0]?.thumbnailUrl).toBe(signedThumbnailUrl);
    expect(cart.items[0]?.thumbnailCropOffsetX).toBe(24);
    expect(cart.items[0]?.thumbnailCropOffsetY).toBe(-18);
    expect(cart.items[0]?.thumbnailCropZoom).toBe(1.35);
  });

  it('replaces expired cart presigned thumbnail URLs with fresh catalog thumbnail URLs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T09:52:26.000Z'));

    axiosGetMock.mockResolvedValueOnce({
      data: {
        data: createCartSummary(expiredSignedThumbnailUrl),
      },
    });
    httpGetMock.mockResolvedValueOnce({
      items: [
        {
          categoryLabel: '복부 Basic 스캔 6주',
          description: '복부 초음파 과정',
          id: 'lecture-24',
          scope: 'lecture',
          thumbnailAlt: '복부 Advance 스캔 6주 썸네일',
          thumbnailSrc: signedThumbnailUrl,
          title: '복부 Advance 스캔 6주',
          to: '/programs/general-course/abdomen/abdomen-basic-6-weeks/advance-6',
        },
      ],
    });

    const cart = await fetchMyCart();

    expect(cart.items[0]?.thumbnailUrl).toBe(signedThumbnailUrl);
  });

  it('keeps the current catalog thumbnail after adding a cart item', async () => {
    axiosPostMock.mockResolvedValueOnce({
      data: {
        data: createCartSummary(s3ThumbnailUrl),
      },
    });

    const cart = await addMyCartItem({
      instructorName: '장은희',
      originalPrice: 100000,
      payablePrice: 90000,
      programId: 24,
      programType: 'ONLINE',
      salePrice: 90000,
      sourcePath: '/programs/general-course/abdomen/abdomen-basic-6-weeks/advance-6',
      thumbnailCropOffsetX: -10,
      thumbnailCropOffsetY: 12,
      thumbnailCropZoom: 1.2,
      thumbnailUrl: signedThumbnailUrl,
      title: '복부 Advance 스캔 6주',
    });

    expect(cart.items[0]?.thumbnailUrl).toBe(signedThumbnailUrl);
    expect(cart.items[0]?.thumbnailCropOffsetX).toBe(-10);
    expect(cart.items[0]?.thumbnailCropOffsetY).toBe(12);
    expect(cart.items[0]?.thumbnailCropZoom).toBe(1.2);
    expect(httpGetMock).not.toHaveBeenCalled();
  });

  it('does not keep an expired catalog thumbnail override after adding a cart item', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T09:52:26.000Z'));

    axiosPostMock.mockResolvedValueOnce({
      data: {
        data: createCartSummary(s3ThumbnailUrl),
      },
    });
    httpGetMock.mockResolvedValueOnce({
      items: [
        {
          categoryLabel: '복부 Basic 스캔 6주',
          description: '복부 초음파 과정',
          id: 'lecture-24',
          scope: 'lecture',
          thumbnailAlt: '복부 Advance 스캔 6주 썸네일',
          thumbnailSrc: signedThumbnailUrl,
          title: '복부 Advance 스캔 6주',
          to: '/programs/general-course/abdomen/abdomen-basic-6-weeks/advance-6',
        },
      ],
    });

    const cart = await addMyCartItem({
      instructorName: '장은희',
      originalPrice: 100000,
      payablePrice: 90000,
      programId: 24,
      programType: 'ONLINE',
      salePrice: 90000,
      sourcePath: '/programs/general-course/abdomen/abdomen-basic-6-weeks/advance-6',
      thumbnailUrl: expiredSignedThumbnailUrl,
      title: '복부 Advance 스캔 6주',
    });

    expect(cart.items[0]?.thumbnailUrl).toBe(signedThumbnailUrl);
  });
});
