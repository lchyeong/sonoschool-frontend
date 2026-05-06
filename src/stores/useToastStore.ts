import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastItem {
  durationMs: number | null;
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

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (input) => {
    const id = createToastId();
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          durationMs: input.durationMs === undefined ? 3200 : input.durationMs,
          id,
          message: input.message,
          variant: input.variant ?? 'info',
        },
      ],
    }));
    return id;
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
  clearToasts: () => {
    set({ toasts: [] });
  },
}));
