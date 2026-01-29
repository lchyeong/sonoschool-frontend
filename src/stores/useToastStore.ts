import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ShowToastInput {
  message: string;
  variant?: ToastVariant;
  durationMs?: number | null;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (input: ShowToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

const createToastId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `toast_${String(Date.now())}_${Math.random().toString(16).slice(2)}`;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  showToast: (input) => {
    const id = createToastId();
    const toast: ToastItem = {
      id,
      message: input.message,
      variant: input.variant ?? 'info',
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    const durationMs = input.durationMs === undefined ? 4000 : input.durationMs;
    if (durationMs !== null) {
      window.setTimeout(() => {
        get().dismissToast(id);
      }, durationMs);
    }

    return id;
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
  clearToasts: () => {
    set({ toasts: [] });
  },
}));
