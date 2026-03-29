import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { routePaths } from '@/routes/routeRegistry';
import { isExpiredSession } from '@/stores/sessionExpiry';
import { useAuthStore } from '@/stores/useAuthStore';

const RouteAccessBoundary = ({
  access,
  children,
}: {
  access: 'admin' | 'authenticated' | 'guest-only' | 'public';
  children: ReactElement;
}) => {
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const isSessionExpired = isAuthenticated && isExpiredSession(expiresAt);

  useEffect(() => {
    if (!isSessionExpired) {
      return;
    }

    logout();
  }, [isSessionExpired, logout]);

  if (access === 'authenticated' && (!isAuthenticated || isSessionExpired)) {
    return <Navigate replace state={{ from: location }} to={routePaths.login} />;
  }

  if (access === 'guest-only' && isAuthenticated && !isSessionExpired) {
    return <Navigate replace to={routePaths.mypage} />;
  }

  return children;
};

export default RouteAccessBoundary;
