import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mergeMyCartItemsMock } = vi.hoisted(() => {
  return {
    mergeMyCartItemsMock: vi.fn(),
  };
});

vi.mock('@/api/mypage', () => {
  return {
    mergeMyCartItems: mergeMyCartItemsMock,
  };
});

import { addGuestCartItem, clearGuestCart, getGuestCart } from '@/api/guestCart';
import { resetCartSelectionState, useCartSelectionStore } from '@/stores/useCartSelectionStore';
import type { CartSummary } from '@/types/mypage';
import { mergeGuestCartIntoServer } from '@/utils/mergeGuestCartIntoServer';

const serverCart: CartSummary = {
  itemCount: 1,
  items: [
    {
      addedAt: '2026-05-04T00:00:00.000Z',
      detailPath: '/programs/general-course/abdomen/basic',
      id: 501,
      instructorName: '장은희',
      originalPrice: 120000,
      payablePrice: 99000,
      programId: 24,
      programType: 'ONLINE',
      saleEndAt: null,
      salePrice: 99000,
      saleStartAt: null,
      thumbnailUrl: '/images/abdomen.png',
      title: '복부 초음파 Basic',
    },
  ],
  totalOriginalPrice: 120000,
  totalPayablePrice: 99000,
};

describe('mergeGuestCartIntoServer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearGuestCart();
    resetCartSelectionState();
    mergeMyCartItemsMock.mockReset();
  });

  it('moves guest cart items to the server cart and remaps selected item ids', async () => {
    const guestCart = addGuestCartItem({
      instructorName: '장은희',
      originalPrice: 120000,
      payablePrice: 99000,
      programId: 24,
      programType: 'ONLINE',
      salePrice: 99000,
      sourcePath: '/programs/general-course/abdomen/basic',
      thumbnailUrl: '/images/abdomen.png',
      title: '복부 초음파 Basic',
    });
    const guestItemId = guestCart.items[0].id;

    useCartSelectionStore.getState().replaceSelection([guestItemId]);
    mergeMyCartItemsMock.mockResolvedValueOnce({
      cart: serverCart,
      failedCount: 0,
      mergedCount: 1,
      skippedCount: 0,
      skippedProgramIds: [],
    });

    const result = await mergeGuestCartIntoServer();

    expect(mergeMyCartItemsMock).toHaveBeenCalledWith([24]);
    expect(result.serverCart).toEqual(serverCart);
    expect(result.failedCount).toBe(0);
    expect(getGuestCart().items).toHaveLength(0);
    expect(useCartSelectionStore.getState().selectedItemIds).toEqual([501]);
  });
});
