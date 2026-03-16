import type { ReactElement } from 'react';

import { createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import AdminConsoleLayout from '@/pages/AdminConsoleLayout/AdminConsoleLayout';
import AdminConsolePage from '@/pages/AdminConsolePage/AdminConsolePage';
import AdminProgramEditorSection from '@/pages/AdminConsolePage/AdminProgramEditorSection';
import AdminLayout from '@/pages/AdminLayout/AdminLayout';
import AdminLoginPage from '@/pages/AdminLoginPage/AdminLoginPage';
import CartPage from '@/pages/CartPage/CartPage';
import ContactPage from '@/pages/ContactPage/ContactPage';
import HomePage from '@/pages/HomePage/HomePage';
import LoginPage from '@/pages/LoginPage/LoginPage';
import MyPagePage from '@/pages/MyPagePage/MyPagePage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import NoticesPage from '@/pages/NoticesPage/NoticesPage';
import ProgramPage from '@/pages/ProgramPage/ProgramPage';
import ProgramsPage from '@/pages/ProgramsPage/ProgramsPage';
import QnaPage from '@/pages/QnaPage/QnaPage';
import ResourcesPage from '@/pages/ResourcesPage/ResourcesPage';
import ReviewsPage from '@/pages/ReviewsPage/ReviewsPage';
import RootLayout from '@/pages/RootLayout/RootLayout';
import RouteErrorPage from '@/pages/RouteErrorPage/RouteErrorPage';
import SearchPage from '@/pages/SearchPage/SearchPage';
import SignupPage from '@/pages/SignupPage/SignupPage';
import { appRouteRegistry, createAppRouteHandle, type AppRouteKey } from '@/routes/routeRegistry';

const appRouteElements: Record<AppRouteKey, ReactElement> = {
  home: <HomePage />,
  login: <LoginPage />,
  adminLogin: <AdminLoginPage />,
  admin: <AdminConsolePage section='dashboard' />,
  adminNotices: <AdminConsolePage section='notices' />,
  adminQna: <AdminConsolePage section='qna' />,
  adminResources: <AdminConsolePage section='resources' />,
  adminReviews: <AdminConsolePage section='reviews' />,
  adminPrograms: <AdminConsolePage section='programs' />,
  adminProgramCreate: <AdminProgramEditorSection mode='create' />,
  adminProgramEdit: <AdminProgramEditorSection mode='edit' />,
  adminProgramDuplicate: <AdminProgramEditorSection mode='duplicate' />,
  adminProgramMenus: <AdminConsolePage section='programMenus' />,
  adminSales: <AdminConsolePage section='sales' />,
  signup: <SignupPage />,
  mypage: <MyPagePage />,
  cart: <CartPage />,
  notices: <NoticesPage />,
  reviews: <ReviewsPage />,
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
  'adminSales',
] as const satisfies readonly AppRouteKey[];
const adminRouteKeySet = new Set<AppRouteKey>([...adminAuthRouteKeys, ...adminConsoleRouteKeys]);

const createAppRouteObject = (routeKey: AppRouteKey): RouteObject => {
  const definition = appRouteRegistry.routes[routeKey];

  switch (definition.kind) {
    case 'index':
      return {
        index: true,
        element: appRouteElements[routeKey],
        handle: createAppRouteHandle(routeKey),
      };
    case 'static':
    case 'dynamic':
    case 'catch-all':
      return {
        path: definition.routePath,
        element: appRouteElements[routeKey],
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
