import { type ReactElement, useEffect } from 'react';

import { createBrowserRouter } from 'react-router-dom';
import { Navigate, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import AccountRecoveryPage from '@/pages/AccountRecoveryPage/AccountRecoveryPage';
import AdminConsoleLayout from '@/pages/AdminConsoleLayout/AdminConsoleLayout';
import AdminConsolePage from '@/pages/AdminConsolePage/AdminConsolePage';
import AdminProgramEditorSection from '@/pages/AdminConsolePage/AdminProgramEditorSection';
import AdminLayout from '@/pages/AdminLayout/AdminLayout';
import AdminLoginPage from '@/pages/AdminLoginPage/AdminLoginPage';
import AdminVideoUploadPage from '@/pages/AdminVideoUploadPage/AdminVideoUploadPage';
import CartPage from '@/pages/CartPage/CartPage';
import CheckoutPage from '@/pages/CheckoutPage/CheckoutPage';
import ContactPage from '@/pages/ContactPage/ContactPage';
import HomePage from '@/pages/HomePage/HomePage';
import LearningPage from '@/pages/LearningPage/LearningPage';
import LoginPage from '@/pages/LoginPage/LoginPage';
import MyPagePage from '@/pages/MyPagePage/MyPagePage';
import NoticeDetailPage from '@/pages/NoticeDetailPage/NoticeDetailPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import NoticesPage from '@/pages/NoticesPage/NoticesPage';
import PaymentResultPage from '@/pages/PaymentResultPage/PaymentResultPage';
import PlayerPage from '@/pages/PlayerPage/PlayerPage';
import ProgramPage from '@/pages/ProgramPage/ProgramPage';
import ProgramsPage from '@/pages/ProgramsPage/ProgramsPage';
import QnaPage from '@/pages/QnaPage/QnaPage';
import ResourcesPage from '@/pages/ResourcesPage/ResourcesPage';
import RootLayout from '@/pages/RootLayout/RootLayout';
import RouteErrorPage from '@/pages/RouteErrorPage/RouteErrorPage';
import SearchPage from '@/pages/SearchPage/SearchPage';
import SignupPage from '@/pages/SignupPage/SignupPage';
import {
  appRouteRegistry,
  createAppRouteHandle,
  routePaths,
  type AppRouteKey,
} from '@/routes/routeRegistry';
import { isExpiredSession } from '@/stores/sessionExpiry';
import { useAuthStore } from '@/stores/useAuthStore';

const appRouteElements: Record<AppRouteKey, ReactElement> = {
  home: <HomePage />,
  login: <LoginPage />,
  adminLogin: <AdminLoginPage />,
  admin: <Navigate replace to={routePaths.adminPrograms} />,
  adminNotices: <AdminConsolePage section='notices' />,
  adminQna: <AdminConsolePage section='qna' />,
  adminResources: <AdminConsolePage section='resources' />,
  adminReviews: <AdminConsolePage section='reviews' />,
  adminPrograms: <AdminConsolePage section='programs' />,
  adminProgramCreate: <AdminProgramEditorSection mode='create' />,
  adminProgramEdit: <AdminProgramEditorSection mode='edit' />,
  adminProgramDuplicate: <AdminProgramEditorSection mode='duplicate' />,
  adminProgramMenus: <AdminConsolePage section='programMenus' />,
  adminVideos: <AdminVideoUploadPage />,
  adminPayments: <AdminConsolePage section='payments' />,
  signup: <SignupPage />,
  accountRecovery: <AccountRecoveryPage />,
  mypage: <MyPagePage />,
  learningPlayer: <LearningPage />,
  learningLesson: <PlayerPage />,
  cart: <CartPage />,
  checkout: <CheckoutPage />,
  paymentResult: <PaymentResultPage />,
  notices: <NoticesPage />,
  noticeDetail: <NoticeDetailPage />,
  reviews: <Navigate replace to={routePaths.programs} />,
  qna: <QnaPage />,
  resources: <ResourcesPage />,
  programs: <ProgramsPage />,
  search: <SearchPage />,
  program: <ProgramPage />,
  programSection: <ProgramPage />,
  programCatalogDeep: <ProgramPage />,
  contact: <ContactPage />,
  notFound: <NotFoundPage />,
};

const adminAuthRouteKeys = ['adminLogin'] as const satisfies readonly AppRouteKey[];
const adminConsoleRouteKeys = [
  'admin',
  'adminNotices',
  'adminQna',
  'adminResources',
  'adminReviews',
  'adminPrograms',
  'adminProgramCreate',
  'adminProgramEdit',
  'adminProgramDuplicate',
  'adminProgramMenus',
  'adminVideos',
  'adminPayments',
] as const satisfies readonly AppRouteKey[];
const adminRouteKeySet = new Set<AppRouteKey>([...adminAuthRouteKeys, ...adminConsoleRouteKeys]);

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

const createAppRouteObject = (routeKey: AppRouteKey): RouteObject => {
  const definition = appRouteRegistry.routes[routeKey];
  const element = (
    <RouteAccessBoundary access={definition.access}>
      {appRouteElements[routeKey]}
    </RouteAccessBoundary>
  );

  switch (definition.kind) {
    case 'index':
      return {
        index: true,
        element,
        handle: createAppRouteHandle(routeKey),
      };
    case 'static':
    case 'dynamic':
    case 'catch-all':
      return {
        path: definition.routePath,
        element,
        handle: createAppRouteHandle(routeKey),
      };
  }
};

export const appRouteTree: RouteObject = {
  path: appRouteRegistry.root.path,
  element: <RootLayout />,
  errorElement: <RouteErrorPage />,
  children: appRouteRegistry.root.childRouteKeys
    .filter((routeKey) => !adminRouteKeySet.has(routeKey))
    .map((routeKey) => createAppRouteObject(routeKey)),
};

export const adminAuthRouteTree: RouteObject = {
  path: appRouteRegistry.root.path,
  element: <AdminLayout />,
  errorElement: <RouteErrorPage />,
  children: adminAuthRouteKeys.map((routeKey) => createAppRouteObject(routeKey)),
};

export const adminConsoleRouteTree: RouteObject = {
  path: appRouteRegistry.root.path,
  element: <AdminConsoleLayout />,
  errorElement: <RouteErrorPage />,
  children: adminConsoleRouteKeys.map((routeKey) => createAppRouteObject(routeKey)),
};

export const router = createBrowserRouter([
  adminAuthRouteTree,
  adminConsoleRouteTree,
  appRouteTree,
]);
