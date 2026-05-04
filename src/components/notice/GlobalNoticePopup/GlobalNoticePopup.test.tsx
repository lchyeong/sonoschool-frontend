import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import type { PopupItem } from '@/types/popup';

import GlobalNoticePopup from './GlobalNoticePopup';

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

class MockImage {
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  set src(_value: string) {
    window.setTimeout(() => {
      this.onload?.();
    }, 0);
  }
}

beforeEach(() => {
  vi.stubGlobal('Image', MockImage);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('GlobalNoticePopup', () => {
  it('renders the image URL from the active popup API response', async () => {
    const popup: PopupItem = {
      altText: '커스텀 팝업 이미지',
      createdAt: '2026-05-04T00:00:00Z',
      id: 9001,
      imageAssetId: 7001,
      imageUrl: 'https://cdn.example.com/popups/custom-popup.webp',
      published: true,
      sortOrder: 0,
      updatedAt: '2026-05-04T00:00:00Z',
      visibleEndAt: null,
      visibleStartAt: null,
    };

    server.use(
      http.get('*/api/v1/popups', () => {
        return HttpResponse.json({
          data: [popup],
          timestamp: '2026-05-04T00:00:00Z',
        });
      }),
    );

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <GlobalNoticePopup />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('img', { name: '커스텀 팝업 이미지' })).toHaveAttribute(
      'src',
      popup.imageUrl,
    );
  });
});
