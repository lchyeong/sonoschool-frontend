import { create } from 'zustand';

import type { CartSummary } from '@/types/mypage';

const CART_SELECTION_STORAGE_KEY = 'cart_selection_state';

interface PersistedCartSelectionState {
  selectedItemIds: number[];
}

interface CartSelectionState extends PersistedCartSelectionState {
  hydrate: (cart: CartSummary | null | undefined) => void;
  replaceSelection: (selectedItemIds: number[]) => void;
  reset: () => void;
  selectSingleItem: (itemId: number) => void;
  toggleAllItems: (itemIds: number[]) => void;
  toggleItem: (itemId: number) => void;
}

const getDefaultState = (): PersistedCartSelectionState => ({
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
): PersistedCartSelectionState => {
  const cartItems = cart?.items ?? [];
  const availableItemIds = cartItems.map((item) => item.id);
  const selectedItemIds = currentState.selectedItemIds.filter((itemId) =>
    availableItemIds.includes(itemId),
  );
  const normalizedSelectedItemIds =
    selectedItemIds.length || !availableItemIds.length ? selectedItemIds : availableItemIds;

  return {
    selectedItemIds: normalizedSelectedItemIds,
  };
};

export const useCartSelectionStore = create<CartSelectionState>((set, get) => {
  const initialState = parsePersistedState();

  return {
    ...initialState,
    hydrate: (cart) => {
      const nextState = sanitizeSelection(
        {
          selectedItemIds: get().selectedItemIds,
        },
        cart,
      );

      persistState(nextState);
      set(nextState);
    },
    reset: () => {
      const nextState = getDefaultState();
      persistState(nextState);
      set(nextState);
    },
    replaceSelection: (selectedItemIds) => {
      const nextState = {
        selectedItemIds,
      };

      persistState(nextState);
      set(nextState);
    },
    selectSingleItem: (itemId) => {
      const nextState = {
        selectedItemIds: [itemId],
      };

      persistState(nextState);
      set(nextState);
    },
    toggleAllItems: (itemIds) => {
      const currentSelection = get().selectedItemIds;
      const areAllSelected =
        itemIds.length > 0 && itemIds.every((itemId) => currentSelection.includes(itemId));
      const nextState = {
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
