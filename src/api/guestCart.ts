import type { AddToCartPayload, CartItem, CartSummary } from '@/types/mypage';

const GUEST_CART_STORAGE_KEY = 'guest_cart_state';

interface PersistedGuestCartState {
  items: CartItem[];
}

const getDefaultState = (): PersistedGuestCartState => ({
  items: [],
});

const clone = <T,>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const parsePersistedState = (): PersistedGuestCartState => {
  if (typeof window === 'undefined') {
    return getDefaultState();
  }

  const storedValue = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);

  if (!storedValue) {
    return getDefaultState();
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<PersistedGuestCartState>;

    return {
      items: Array.isArray(parsed.items)
        ? parsed.items.filter((item): item is CartItem => {
            return (
              typeof item === 'object' &&
              item !== null &&
              typeof item.id === 'number' &&
              typeof item.programId === 'number' &&
              typeof item.title === 'string' &&
              typeof item.detailPath === 'string' &&
              typeof item.programType === 'string' &&
              typeof item.originalPrice === 'number' &&
              typeof item.payablePrice === 'number' &&
              typeof item.addedAt === 'string'
            );
          })
        : [],
    };
  } catch {
    return getDefaultState();
  }
};

const persistState = (state: PersistedGuestCartState) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(state));
};

const buildCartSummary = (items: CartItem[]): CartSummary => {
  const totalOriginalPrice = items.reduce((sum, item) => sum + item.originalPrice, 0);
  const totalPayablePrice = items.reduce((sum, item) => sum + item.payablePrice, 0);

  return {
    items: clone(items),
    itemCount: items.length,
    totalDiscountAmount: totalOriginalPrice - totalPayablePrice,
    totalOriginalPrice,
    totalPayablePrice,
    appliedCoupon: null,
  };
};

const getNextGuestCartItemId = (items: readonly CartItem[]): number => {
  const minId = items.reduce((currentMin, item) => Math.min(currentMin, item.id), 0);

  return minId <= 0 ? minId - 1 : -1;
};

const toGuestCartItem = (payload: AddToCartPayload, nextId: number): CartItem => {
  return {
    addedAt: new Date().toISOString(),
    detailPath: payload.sourcePath,
    id: nextId,
    instructorName: payload.instructorName,
    originalPrice: payload.originalPrice,
    payablePrice: payload.payablePrice,
    programId: payload.programId,
    programType: payload.programType,
    saleEndAt: null,
    salePrice: payload.salePrice,
    saleStartAt: null,
    thumbnailUrl: payload.thumbnailUrl,
    title: payload.title,
  };
};

export const getGuestCart = (): CartSummary => {
  return buildCartSummary(parsePersistedState().items);
};

export const addGuestCartItem = (payload: AddToCartPayload): CartSummary => {
  const state = parsePersistedState();

  if (state.items.some((item) => item.programId === payload.programId)) {
    throw new Error('이미 장바구니에 담긴 강의입니다.');
  }

  const nextState: PersistedGuestCartState = {
    items: [...state.items, toGuestCartItem(payload, getNextGuestCartItemId(state.items))],
  };

  persistState(nextState);

  return buildCartSummary(nextState.items);
};

export const removeGuestCartItem = (cartItemId: number): CartSummary => {
  const state = parsePersistedState();
  const nextItems = state.items.filter((item) => item.id !== cartItemId);

  if (nextItems.length === state.items.length) {
    throw new Error('장바구니 항목을 찾지 못했습니다.');
  }

  const nextState: PersistedGuestCartState = {
    items: nextItems,
  };

  persistState(nextState);

  return buildCartSummary(nextItems);
};

export const clearGuestCart = () => {
  persistState(getDefaultState());
};

export const retainGuestCartPrograms = (programIds: readonly number[]) => {
  const state = parsePersistedState();
  const retainedProgramIdSet = new Set(programIds);
  const nextState: PersistedGuestCartState = {
    items: state.items.filter((item) => retainedProgramIdSet.has(item.programId)),
  };

  persistState(nextState);
};
