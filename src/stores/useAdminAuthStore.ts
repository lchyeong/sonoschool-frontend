import { create } from 'zustand';

const ADMIN_AUTH_STORAGE_KEY = 'mock_admin_auth_state';

interface AdminAuthSnapshot {
  adminDisplayName: string | null;
  isAuthenticated: boolean;
}

const getInitialAdminAuthState = (): AdminAuthSnapshot => {
  if (typeof window === 'undefined') {
    return { adminDisplayName: null, isAuthenticated: false };
  }

  const storedValue = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  if (!storedValue) {
    return { adminDisplayName: null, isAuthenticated: false };
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<AdminAuthSnapshot>;

    return {
      adminDisplayName:
        typeof parsed.adminDisplayName === 'string' ? parsed.adminDisplayName : null,
      isAuthenticated: parsed.isAuthenticated === true,
    };
  } catch {
    return { adminDisplayName: null, isAuthenticated: false };
  }
};

const persistAdminAuthState = (snapshot: AdminAuthSnapshot) => {
  if (typeof window === 'undefined') return;

  if (!snapshot.isAuthenticated) {
    window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(snapshot));
};

interface AdminAuthState extends AdminAuthSnapshot {
  login: (adminDisplayName: string) => void;
  logout: () => void;
}

const initialState = getInitialAdminAuthState();

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  ...initialState,
  login: (adminDisplayName) => {
    const nextState: AdminAuthSnapshot = {
      adminDisplayName,
      isAuthenticated: true,
    };

    persistAdminAuthState(nextState);
    set(nextState);
  },
  logout: () => {
    const nextState: AdminAuthSnapshot = {
      adminDisplayName: null,
      isAuthenticated: false,
    };

    persistAdminAuthState(nextState);
    set(nextState);
  },
}));
