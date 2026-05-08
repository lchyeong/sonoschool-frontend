import { useEffect, useRef } from 'react';

import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/stores/useAuthStore';

const SESSION_CHECK_THROTTLE_MS = 10_000;

const AuthSessionMonitor = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isCheckingRef = useRef(false);
  const lastCheckedAtRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      return undefined;
    }

    const checkSession = async (force = false) => {
      const now = Date.now();
      if (
        isCheckingRef.current ||
        (!force && now - lastCheckedAtRef.current < SESSION_CHECK_THROTTLE_MS)
      ) {
        return;
      }

      isCheckingRef.current = true;
      lastCheckedAtRef.current = now;

      try {
        await axiosInstance.get('/api/v1/users/me');
      } catch {
        // Global axios interceptors own logout, toast, and redirect behavior.
      } finally {
        isCheckingRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkSession(true);
      }
    };

    const handleFocus = () => {
      void checkSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    void checkSession(true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  return null;
};

export default AuthSessionMonitor;
