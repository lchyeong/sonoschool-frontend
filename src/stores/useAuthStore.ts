import { create } from 'zustand';

const AUTH_STORAGE_KEY = 'mock_auth_state';

const getInitialAuthenticatedState = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'authenticated';
};

const persistAuthenticatedState = (isAuthenticated: boolean) => {
  if (typeof window === 'undefined') return;

  if (isAuthenticated) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

interface AuthState {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  toggleAuthentication: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: getInitialAuthenticatedState(),
  login: () => {
    persistAuthenticatedState(true);
    set({ isAuthenticated: true });
  },
  logout: () => {
    persistAuthenticatedState(false);
    set({ isAuthenticated: false });
  },
  toggleAuthentication: () => {
    set((state) => {
      const nextIsAuthenticated = !state.isAuthenticated;
      persistAuthenticatedState(nextIsAuthenticated);

      return { isAuthenticated: nextIsAuthenticated };
    });
  },
}));
