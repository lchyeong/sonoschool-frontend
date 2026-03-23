import { create } from 'zustand';

import type { StudentSession, StudentSessionSnapshot } from '@/types/auth';

import { isExpiredSession } from './sessionExpiry';

const AUTH_STORAGE_KEY = 'student_auth_session';

const createEmptyStudentSessionSnapshot = (): StudentSessionSnapshot => {
  return {
    accessToken: '',
    tokenType: '',
    expiresAt: '',
    loginId: '',
    displayName: '',
    role: '',
    isAuthenticated: false,
  };
};

const parsePersistedSnapshot = (): StudentSessionSnapshot => {
  if (typeof window === 'undefined') {
    return createEmptyStudentSessionSnapshot();
  }

  const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedValue) {
    return createEmptyStudentSessionSnapshot();
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<StudentSessionSnapshot>;
    const nextSnapshot: StudentSessionSnapshot = {
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : '',
      tokenType: typeof parsed.tokenType === 'string' ? parsed.tokenType : '',
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : '',
      loginId: typeof parsed.loginId === 'string' ? parsed.loginId : '',
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
      role: typeof parsed.role === 'string' ? parsed.role : '',
      isAuthenticated: parsed.isAuthenticated === true,
    };

    return nextSnapshot.isAuthenticated && isExpiredSession(nextSnapshot.expiresAt)
      ? createEmptyStudentSessionSnapshot()
      : nextSnapshot;
  } catch {
    return createEmptyStudentSessionSnapshot();
  }
};

const persistSnapshot = (snapshot: StudentSessionSnapshot) => {
  if (typeof window === 'undefined') return;

  if (snapshot.isAuthenticated) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

interface AuthState {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  loginId: string;
  displayName: string;
  role: string;
  isAuthenticated: boolean;
  setSession: (session: StudentSession) => void;
  syncProfileSnapshot: (profile: Pick<StudentSession, 'displayName' | 'loginId' | 'role'>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const initialState = parsePersistedSnapshot();

  return {
    ...initialState,
    setSession: (session) => {
      const snapshot: StudentSessionSnapshot = {
        ...session,
        isAuthenticated: true,
      };
      persistSnapshot(snapshot);
      set(snapshot);
    },
    syncProfileSnapshot: (profile) => {
      set((currentState) => {
        if (!currentState.isAuthenticated) {
          return currentState;
        }

        const nextState: StudentSessionSnapshot = {
          ...currentState,
          displayName: profile.displayName,
          loginId: profile.loginId,
          role: profile.role,
          isAuthenticated: true,
        };

        persistSnapshot(nextState);
        return nextState;
      });
    },
    logout: () => {
      const resetState = createEmptyStudentSessionSnapshot();
      persistSnapshot(resetState);
      set(resetState);
    },
  };
});

export const getStudentAccessToken = (): string => {
  const currentState = useAuthStore.getState();

  if (!currentState.isAuthenticated || isExpiredSession(currentState.expiresAt)) {
    useAuthStore.getState().logout();
    return '';
  }

  return currentState.accessToken;
};

export const setStudentSession = (session: StudentSession) => {
  useAuthStore.getState().setSession(session);
};

export const syncStudentProfileSnapshot = (
  profile: Pick<StudentSession, 'displayName' | 'loginId' | 'role'>,
) => {
  useAuthStore.getState().syncProfileSnapshot(profile);
};

export const clearStudentSession = () => {
  useAuthStore.getState().logout();
};

export const isStudentAuthenticated = (): boolean => {
  const currentState = useAuthStore.getState();

  if (!currentState.isAuthenticated || isExpiredSession(currentState.expiresAt)) {
    useAuthStore.getState().logout();
    return false;
  }

  return true;
};
