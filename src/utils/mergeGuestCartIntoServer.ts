import { clearGuestCart, getGuestCart, retainGuestCartPrograms } from '@/api/guestCart';
import { mergeMyCartItems } from '@/api/mypage';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import type { CartSummary } from '@/types/mypage';

interface MergeGuestCartIntoServerResult {
  failedCount: number;
  serverCart: CartSummary | null;
}

export const mergeGuestCartIntoServer = async (): Promise<MergeGuestCartIntoServerResult> => {
  const guestCart = getGuestCart();

  if (!guestCart.items.length) {
    return { failedCount: 0, serverCart: null };
  }

  const currentSelection = useCartSelectionStore.getState().selectedItemIds;
  const selectedProgramIds = new Set(
    guestCart.items
      .filter((item) => currentSelection.includes(item.id))
      .map((item) => item.programId),
  );
  const mergeResult = await mergeMyCartItems(guestCart.items.map((item) => item.programId));
  const serverCart = mergeResult.cart;
  const mergedProgramIds = new Set(serverCart.items.map((item) => item.programId));
  const failedProgramIds = new Set(
    guestCart.items
      .map((item) => item.programId)
      .filter((programId) => !mergedProgramIds.has(programId)),
  );
  const selectedItemIds = serverCart.items
    .filter((item) => selectedProgramIds.has(item.programId))
    .map((item) => item.id);

  useCartSelectionStore.getState().replaceSelection(selectedItemIds);

  if (failedProgramIds.size > 0) {
    retainGuestCartPrograms([...failedProgramIds]);
  } else {
    clearGuestCart();
  }

  return {
    failedCount: failedProgramIds.size,
    serverCart,
  };
};
