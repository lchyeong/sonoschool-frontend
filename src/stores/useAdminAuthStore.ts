import { create } from 'zustand';

import type { AdminLoginResponse } from '@/types/adminConsole';

import { isExpiredSession } from './sessionExpiry';

const ADMIN_AUTH_STORAGE_KEY = 'admin_auth_session';

interface AdminAuthSnapshot {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  loginId: string;
  adminDisplayName: string;
  role: string;
  isAuthenticated: boolean;
}

const createEmptyAdminAuthSnapshot = (): AdminAuthSnapshot => {
  return {
    accessToken: '',
    tokenType: '',
    expiresAt: '',
    loginId: '',
    adminDisplayName: '',
    role: '',
    isAuthenticated: false,
  };
};

const parsePersistedSnapshot = (): AdminAuthSnapshot => {
  if (typeof window === 'undefined') {
    return createEmptyAdminAuthSnapshot();
  }

  const storedValue = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  if (!storedValue) {
    return createEmptyAdminAuthSnapshot();
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<AdminAuthSnapshot>;
    const nextSnapshot: AdminAuthSnapshot = {
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : '',
      tokenType: typeof parsed.tokenType === 'string' ? parsed.tokenType : '',
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : '',
      loginId: typeof parsed.loginId === 'string' ? parsed.loginId : '',
      adminDisplayName: typeof parsed.adminDisplayName === 'string' ? parsed.adminDisplayName : '',
      role: typeof parsed.role === 'string' ? parsed.role : '',
      isAuthenticated: parsed.isAuthenticated === true,
    };

    return nextSnapshot.isAuthenticated && isExpiredSession(nextSnapshot.expiresAt)
      ? createEmptyAdminAuthSnapshot()
      : nextSnapshot;
  } catch {
    return createEmptyAdminAuthSnapshot();
  }
};

const persistAdminAuthState = (snapshot: AdminAuthSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!snapshot.isAuthenticated) {
    window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(snapshot));
};

interface AdminAuthState extends AdminAuthSnapshot {
  login: (session: AdminLoginResponse) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  ...parsePersistedSnapshot(),
  login: (session) => {
    const nextState: AdminAuthSnapshot = {
      accessToken: session.accessToken,
      tokenType: session.tokenType,
      expiresAt: session.expiresAt,
      loginId: session.loginId,
      adminDisplayName: session.adminDisplayName,
      role: session.role,
      isAuthenticated: true,
    };

    persistAdminAuthState(nextState);
    set(nextState);
  },
  logout: () => {
    const nextState = createEmptyAdminAuthSnapshot();
    persistAdminAuthState(nextState);
    set(nextState);
  },
}));

export const getAdminAccessToken = (): string => {
  const currentState = useAdminAuthStore.getState();

  if (!currentState.isAuthenticated || isExpiredSession(currentState.expiresAt)) {
    useAdminAuthStore.getState().logout();
    return '';
  }

  return currentState.accessToken;
};

export const clearAdminSession = () => {
  useAdminAuthStore.getState().logout();
};

export const isAdminAuthenticated = (): boolean => {
  const currentState = useAdminAuthStore.getState();

  if (!currentState.isAuthenticated || isExpiredSession(currentState.expiresAt)) {
    useAdminAuthStore.getState().logout();
    return false;
  }

  return true;
};
