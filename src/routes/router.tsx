import type { ReactElement } from 'react';

import { createBrowserRouter } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import { LoadingSpinner } from '@/components/feedback/Loading/LoadingSpinner';
import AdminConsoleLayout from '@/pages/AdminConsoleLayout/AdminConsoleLayout';
import AdminLayout from '@/pages/AdminLayout/AdminLayout';
import RootLayout from '@/pages/RootLayout/RootLayout';
import RouteErrorPage from '@/pages/RouteErrorPage/RouteErrorPage';
import RouteAccessBoundary from '@/routes/RouteAccessBoundary';
import {
  appRouteRegistry,
  createAppRouteHandle,
  routePaths,
  type AppRouteKey,
} from '@/routes/routeRegistry';
import { reloadOnceForDynamicImportFailure } from '@/utils/dynamicImportRecovery';

type AppRouteLazy = () => Promise<{ element: ReactElement }>;

const createLazyRoute = (loadElement: () => Promise<ReactElement>): AppRouteLazy => {
  return async () => {
    try {
      return {
        element: await loadElement(),
      };
    } catch (error) {
      if (reloadOnceForDynamicImportFailure(error)) {
        await new Promise<never>(() => {});
      }

      throw error;
    }
  };
};

const createStaticElementRoute = (element: ReactElement): AppRouteLazy => {
  return () =>
    Promise.resolve({
      element,
    });
};

const appRouteLazies: Record<AppRouteKey, AppRouteLazy> = {
  home: createLazyRoute(async () => {
    const { default: HomePage } = await import('@/pages/HomePage/HomePage');
    return <HomePage />;
  }),
  login: createLazyRoute(async () => {
    const { default: LoginPage } = await import('@/pages/LoginPage/LoginPage');
    return <LoginPage />;
  }),
  adminLogin: createLazyRoute(async () => {
    const { default: AdminLoginPage } = await import('@/pages/AdminLoginPage/AdminLoginPage');
    return <AdminLoginPage />;
  }),
  admin: createStaticElementRoute(<Navigate replace to={routePaths.adminPrograms} />),
  adminNotices: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='notices' />;
  }),
  adminNoticeCreate: createLazyRoute(async () => {
    const { default: AdminNoticeWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminNoticeWorkspace'
    );
    return <AdminNoticeWorkspace mode='create' />;
  }),
  adminNoticeEdit: createLazyRoute(async () => {
    const { default: AdminNoticeWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminNoticeWorkspace'
    );
    return <AdminNoticeWorkspace mode='edit' />;
  }),
  adminPopups: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='popups' />;
  }),
  adminQna: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='qna' />;
  }),
  adminQnaNoticeCreate: createLazyRoute(async () => {
    const { default: AdminQnaNoticeWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminQnaNoticeWorkspace'
    );
    return <AdminQnaNoticeWorkspace />;
  }),
  adminResources: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='resources' />;
  }),
  adminResourceCreate: createLazyRoute(async () => {
    const { default: AdminResourceWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminResourceWorkspace'
    );
    return <AdminResourceWorkspace mode='create' />;
  }),
  adminResourceEdit: createLazyRoute(async () => {
    const { default: AdminResourceWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminResourceWorkspace'
    );
    return <AdminResourceWorkspace mode='edit' />;
  }),
  adminEnrollments: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='enrollments' />;
  }),
  adminUserDetail: createLazyRoute(async () => {
    const { default: AdminUserDetailSection } = await import(
      '@/pages/AdminConsolePage/AdminUserDetailSection'
    );
    return <AdminUserDetailSection />;
  }),
  adminPracticum: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='practicum' />;
  }),
  adminProgramReservations: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='programReservations' />;
  }),
  adminReviews: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='reviews' />;
  }),
  adminPrograms: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='programs' />;
  }),
  adminProgramEnrollments: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='programEnrollments' />;
  }),
  adminProgramCreate: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace />;
  }),
  adminProgramCreateCurriculum: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace view='curriculum' />;
  }),
  adminProgramCreateProblems: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace view='problems' />;
  }),
  adminProgramCreateResources: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace view='resources' />;
  }),
  adminProgramEdit: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace mode='edit' />;
  }),
  adminProgramCurriculum: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace mode='edit' view='curriculum' />;
  }),
  adminProgramProblems: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace mode='edit' view='problems' />;
  }),
  adminProgramResources: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace mode='edit' view='resources' />;
  }),
  adminProgramDuplicate: createLazyRoute(async () => {
    const { default: AdminProgramCreateWorkspace } = await import(
      '@/pages/AdminConsolePage/AdminProgramCreateWorkspace'
    );
    return <AdminProgramCreateWorkspace mode='duplicate' />;
  }),
  adminProgramMenus: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='programMenus' />;
  }),
  adminProblemAreas: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='problemAreas' />;
  }),
  adminPayments: createLazyRoute(async () => {
    const { default: AdminConsolePage } = await import('@/pages/AdminConsolePage/AdminConsolePage');
    return <AdminConsolePage section='payments' />;
  }),
  signup: createLazyRoute(async () => {
    const { default: SignupPage } = await import('@/pages/SignupPage/SignupPage');
    return <SignupPage />;
  }),
  accountRecovery: createLazyRoute(async () => {
    const { default: AccountRecoveryPage } = await import(
      '@/pages/AccountRecoveryPage/AccountRecoveryPage'
    );
    return <AccountRecoveryPage />;
  }),
  mypage: createLazyRoute(async () => {
    const { default: MyPagePage } = await import('@/pages/MyPagePage/MyPagePage');
    return <MyPagePage />;
  }),
  learningPlayer: createLazyRoute(async () => {
    const { default: PlayerPage } = await import('@/pages/PlayerPage/PlayerPage');
    return <PlayerPage />;
  }),
  learningLesson: createLazyRoute(async () => {
    const { default: PlayerPage } = await import('@/pages/PlayerPage/PlayerPage');
    return <PlayerPage />;
  }),
  myEnrollmentPracticum: createLazyRoute(async () => {
    const { default: MyEnrollmentPracticumPage } = await import(
      '@/pages/MyEnrollmentPracticumPage/MyEnrollmentPracticumPage'
    );
    return <MyEnrollmentPracticumPage />;
  }),
  cart: createLazyRoute(async () => {
    const { default: CartPage } = await import('@/pages/CartPage/CartPage');
    return <CartPage />;
  }),
  checkout: createLazyRoute(async () => {
    const { default: CheckoutPage } = await import('@/pages/CheckoutPage/CheckoutPage');
    return <CheckoutPage />;
  }),
  paymentResult: createLazyRoute(async () => {
    const { default: PaymentResultPage } = await import(
      '@/pages/PaymentResultPage/PaymentResultPage'
    );
    return <PaymentResultPage />;
  }),
  notices: createLazyRoute(async () => {
    const { default: NoticesPage } = await import('@/pages/NoticesPage/NoticesPage');
    return <NoticesPage />;
  }),
  noticeDetail: createLazyRoute(async () => {
    const { default: NoticeDetailPage } = await import('@/pages/NoticeDetailPage/NoticeDetailPage');
    return <NoticeDetailPage />;
  }),
  qna: createLazyRoute(async () => {
    const { default: QnaPage } = await import('@/pages/QnaPage/QnaPage');
    return <QnaPage />;
  }),
  resources: createLazyRoute(async () => {
    const { default: ResourcesPage } = await import('@/pages/ResourcesPage/ResourcesPage');
    return <ResourcesPage />;
  }),
  resourceDetail: createLazyRoute(async () => {
    const { default: ResourceDetailPage } = await import(
      '@/pages/ResourceDetailPage/ResourceDetailPage'
    );
    return <ResourceDetailPage />;
  }),
  programs: createStaticElementRoute(<Navigate replace to={routePaths.homeFeaturedCourses} />),
  search: createLazyRoute(async () => {
    const { default: SearchPage } = await import('@/pages/SearchPage/SearchPage');
    return <SearchPage />;
  }),
  program: createLazyRoute(async () => {
    const { default: ProgramPage } = await import('@/pages/ProgramPage/ProgramPage');
    return <ProgramPage />;
  }),
  programSection: createLazyRoute(async () => {
    const { default: ProgramPage } = await import('@/pages/ProgramPage/ProgramPage');
    return <ProgramPage />;
  }),
  programCatalogDeep: createLazyRoute(async () => {
    const { default: ProgramPage } = await import('@/pages/ProgramPage/ProgramPage');
    return <ProgramPage />;
  }),
  notFound: createLazyRoute(async () => {
    const { default: NotFoundPage } = await import('@/pages/NotFoundPage/NotFoundPage');
    return <NotFoundPage />;
  }),
};

const adminAuthRouteKeys = ['adminLogin'] as const satisfies readonly AppRouteKey[];
const adminConsoleRouteKeys = [
  'admin',
  'adminNotices',
  'adminNoticeCreate',
  'adminNoticeEdit',
  'adminPopups',
  'adminQna',
  'adminQnaNoticeCreate',
  'adminResources',
  'adminResourceCreate',
  'adminResourceEdit',
  'adminEnrollments',
  'adminUserDetail',
  'adminPracticum',
  'adminProgramReservations',
  'adminReviews',
  'adminPrograms',
  'adminProgramEnrollments',
  'adminProgramCreate',
  'adminProgramCreateCurriculum',
  'adminProgramCreateProblems',
  'adminProgramCreateResources',
  'adminProgramEdit',
  'adminProgramCurriculum',
  'adminProgramProblems',
  'adminProgramResources',
  'adminProgramDuplicate',
  'adminProgramMenus',
  'adminProblemAreas',
  'adminPayments',
] as const satisfies readonly AppRouteKey[];
const adminRouteKeySet = new Set<AppRouteKey>([...adminAuthRouteKeys, ...adminConsoleRouteKeys]);

const createAppRouteObject = (routeKey: AppRouteKey): RouteObject => {
  const definition = appRouteRegistry.routes[routeKey];
  const lazy = async () => {
    const routeModule = await appRouteLazies[routeKey]();

    return {
      ...routeModule,
      element: (
        <RouteAccessBoundary access={definition.access}>{routeModule.element}</RouteAccessBoundary>
      ),
    };
  };

  switch (definition.kind) {
    case 'index':
      return {
        index: true,
        lazy,
        handle: createAppRouteHandle(routeKey),
      };
    case 'static':
    case 'dynamic':
    case 'catch-all':
      return {
        path: definition.routePath,
        lazy,
        handle: createAppRouteHandle(routeKey),
      };
  }
};

export const appRouteTree: RouteObject = {
  path: appRouteRegistry.root.path,
  element: <RootLayout />,
  errorElement: <RouteErrorPage />,
  hydrateFallbackElement: <LoadingSpinner />,
  children: appRouteRegistry.root.childRouteKeys
    .filter((routeKey) => !adminRouteKeySet.has(routeKey))
    .map((routeKey) => createAppRouteObject(routeKey)),
};

export const adminAuthRouteTree: RouteObject = {
  path: appRouteRegistry.root.path,
  element: <AdminLayout />,
  errorElement: <RouteErrorPage />,
  hydrateFallbackElement: <LoadingSpinner />,
  children: adminAuthRouteKeys.map((routeKey) => createAppRouteObject(routeKey)),
};

export const adminConsoleRouteTree: RouteObject = {
  path: appRouteRegistry.root.path,
  element: <AdminConsoleLayout />,
  errorElement: <RouteErrorPage />,
  hydrateFallbackElement: <LoadingSpinner />,
  children: adminConsoleRouteKeys.map((routeKey) => createAppRouteObject(routeKey)),
};

export const router = createBrowserRouter([
  adminAuthRouteTree,
  adminConsoleRouteTree,
  appRouteTree,
]);
