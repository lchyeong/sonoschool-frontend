import { create } from 'zustand';

import type { CartSummary, UserCoupon } from '@/types/mypage';
import { evaluateCouponForItems } from '@/utils/cartPricing';

const CART_SELECTION_STORAGE_KEY = 'cart_selection_state';

interface PersistedCartSelectionState {
  selectedCouponId: number | null;
  selectedItemIds: number[];
}

interface CartSelectionState extends PersistedCartSelectionState {
  hydrate: (cart: CartSummary | null | undefined, coupons: UserCoupon[]) => void;
  reset: () => void;
  setSelectedCouponId: (couponId: number | null) => void;
  toggleAllItems: (itemIds: number[]) => void;
  toggleItem: (itemId: number) => void;
}

const getDefaultState = (): PersistedCartSelectionState => ({
  selectedCouponId: null,
  selectedItemIds: [],
});

const parsePersistedState = (): PersistedCartSelectionState => {
  if (typeof window === 'undefined') {
    return getDefaultState();
  }

  const storedValue = window.localStorage.getItem(CART_SELECTION_STORAGE_KEY);

  if (!storedValue) {
    return getDefaultState();
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<PersistedCartSelectionState>;

    return {
      selectedCouponId:
        typeof parsed.selectedCouponId === 'number' ? parsed.selectedCouponId : null,
      selectedItemIds: Array.isArray(parsed.selectedItemIds)
        ? parsed.selectedItemIds.filter((itemId): itemId is number => typeof itemId === 'number')
        : [],
    };
  } catch {
    return getDefaultState();
  }
};

const persistState = (state: PersistedCartSelectionState) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CART_SELECTION_STORAGE_KEY, JSON.stringify(state));
};

const sanitizeSelection = (
  currentState: PersistedCartSelectionState,
  cart: CartSummary | null | undefined,
  coupons: UserCoupon[],
): PersistedCartSelectionState => {
  const cartItems = cart?.items ?? [];
  const availableItemIds = cartItems.map((item) => item.id);
  const selectedItemIds = currentState.selectedItemIds.filter((itemId) =>
    availableItemIds.includes(itemId),
  );
  const normalizedSelectedItemIds =
    selectedItemIds.length || !availableItemIds.length ? selectedItemIds : availableItemIds;
  const selectedItems = cartItems.filter((item) => normalizedSelectedItemIds.includes(item.id));
  const preferredCouponId = currentState.selectedCouponId ?? cart?.appliedCoupon?.id ?? null;
  const preferredCoupon = coupons.find((coupon) => coupon.id === preferredCouponId) ?? null;

  const hasApplicablePreferredCoupon =
    preferredCoupon !== null && evaluateCouponForItems(preferredCoupon, selectedItems).isApplicable;

  return {
    selectedCouponId: hasApplicablePreferredCoupon ? preferredCouponId : null,
    selectedItemIds: normalizedSelectedItemIds,
  };
};

export const useCartSelectionStore = create<CartSelectionState>((set, get) => {
  const initialState = parsePersistedState();

  return {
    ...initialState,
    hydrate: (cart, coupons) => {
      const nextState = sanitizeSelection(
        {
          selectedCouponId: get().selectedCouponId,
          selectedItemIds: get().selectedItemIds,
        },
        cart,
        coupons,
      );

      persistState(nextState);
      set(nextState);
    },
    reset: () => {
      const nextState = getDefaultState();
      persistState(nextState);
      set(nextState);
    },
    setSelectedCouponId: (couponId) => {
      const nextState = {
        selectedCouponId: couponId,
        selectedItemIds: get().selectedItemIds,
      };

      persistState(nextState);
      set(nextState);
    },
    toggleAllItems: (itemIds) => {
      const currentSelection = get().selectedItemIds;
      const areAllSelected =
        itemIds.length > 0 && itemIds.every((itemId) => currentSelection.includes(itemId));
      const nextState = {
        selectedCouponId: get().selectedCouponId,
        selectedItemIds: areAllSelected ? [] : itemIds,
      };

      persistState(nextState);
      set(nextState);
    },
    toggleItem: (itemId) => {
      const currentSelection = get().selectedItemIds;
      const selectedItemIds = currentSelection.includes(itemId)
        ? currentSelection.filter((selectedId) => selectedId !== itemId)
        : [...currentSelection, itemId];
      const nextState = {
        selectedCouponId: get().selectedCouponId,
        selectedItemIds,
      };

      persistState(nextState);
      set(nextState);
    },
  };
});

export const resetCartSelectionState = () => {
  useCartSelectionStore.getState().reset();
};
