import type { PopupItem } from '@/types/popup';

const initialPopups: PopupItem[] = [
  {
    id: 1,
    imageAssetId: 101,
    imageUrl:
      'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80',
    altText: '2026 상반기 교육 일정 팝업',
    published: true,
    visibleStartAt: '2026-03-01T00:00:00Z',
    visibleEndAt: null,
    sortOrder: 0,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z',
  },
];

let popups = initialPopups.map((popup) => ({ ...popup }));

const sortPopups = (items: PopupItem[]): PopupItem[] => {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
};

export const getMockPublishedGlobalPopups = (): PopupItem[] => {
  return sortPopups(popups.filter((popup) => popup.published));
};

export const getMockAdminPopups = (): PopupItem[] => {
  return sortPopups(popups);
};

export const getMockPopupById = (popupId: number): PopupItem | null => {
  return popups.find((popup) => popup.id === popupId) ?? null;
};

export const createMockPopup = (
  payload: Omit<PopupItem, 'id' | 'createdAt' | 'updatedAt'>,
): PopupItem => {
  const nextId = Math.max(...popups.map((popup) => popup.id), 0) + 1;
  const now = new Date().toISOString();
  const popup: PopupItem = {
    ...payload,
    createdAt: now,
    id: nextId,
    updatedAt: now,
  };

  popups = sortPopups([popup, ...popups]);
  return popup;
};

export const updateMockPopup = (
  popupId: number,
  payload: Partial<Omit<PopupItem, 'id' | 'createdAt'>>,
): PopupItem | null => {
  const currentPopup = getMockPopupById(popupId);

  if (!currentPopup) {
    return null;
  }

  const nextPopup: PopupItem = {
    ...currentPopup,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  popups = sortPopups(popups.map((popup) => (popup.id === popupId ? nextPopup : popup)));
  return nextPopup;
};

export const deleteMockPopup = (popupId: number): boolean => {
  const nextItems = popups.filter((popup) => popup.id !== popupId);

  if (nextItems.length === popups.length) {
    return false;
  }

  popups = nextItems;
  return true;
};
