import { create } from 'zustand';

export type ModalType = 'login' | null;

interface OpenLoginModalOptions {
  restoreFocusElement?: HTMLElement | null;
}

interface ModalState {
  openedModalType: ModalType;
  restoreFocusElement: HTMLElement | null;
  openLoginModal: (options?: OpenLoginModalOptions) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  openedModalType: null,
  restoreFocusElement: null,
  openLoginModal: (options) => {
    set({
      openedModalType: 'login',
      restoreFocusElement: options?.restoreFocusElement ?? null,
    });
  },
  closeModal: () => {
    set({
      openedModalType: null,
      restoreFocusElement: null,
    });
  },
}));
