import { generatePath } from 'react-router-dom';
export type AppRouteAccess = 'authenticated' | 'guest-only' | 'public';
export interface AppRouteHandle {
  routeKey: AppRouteKey;
  access: AppRouteAccess;
}
interface BaseRouteDefinition<TKey extends string> {
  key: TKey;
  access: AppRouteAccess;
}
interface IndexRouteDefinition<TKey extends string> extends BaseRouteDefinition<TKey> {
  kind: 'index';
  absolutePath: '/';
}
interface StaticRouteDefinition<TKey extends string> extends BaseRouteDefinition<TKey> {
  kind: 'static';
  routePath: string;
  absolutePath: `/${string}`;
}
interface DynamicRouteDefinition<TKey extends string, TParams> extends BaseRouteDefinition<TKey> {
  kind: 'dynamic';
  routePath: string;
  absolutePathPattern: `/${string}`;
  buildPath(params: TParams): string;
}
interface CatchAllRouteDefinition<TKey extends string> extends BaseRouteDefinition<TKey> {
  kind: 'catch-all';
  routePath: '*';
}
type AppLeafRouteDefinition =
  | IndexRouteDefinition<string>
  | StaticRouteDefinition<string>
  | DynamicRouteDefinition<string, Record<string, string>>
  | CatchAllRouteDefinition<string>;

const defineIndexRoute = <TKey extends string>(
  definition: Omit<IndexRouteDefinition<TKey>, 'kind'>,
): IndexRouteDefinition<TKey> => {
  return { kind: 'index', ...definition };
};

const defineStaticRoute = <TKey extends string>(
  definition: Omit<StaticRouteDefinition<TKey>, 'kind'>,
): StaticRouteDefinition<TKey> => {
  return { kind: 'static', ...definition };
};

const defineDynamicRoute = <TKey extends string, TParams>(
  // 동적 라우트는 어떤 파라미터를 받는지도 함께 타입으로 보존해야 하므로 `TParams`를 받습니다.
  definition: Omit<DynamicRouteDefinition<TKey, TParams>, 'kind'>,
): DynamicRouteDefinition<TKey, TParams> => {
  // 동적 라우트라는 태그를 자동으로 붙여 줍니다.
  return { kind: 'dynamic', ...definition };
};

const defineCatchAllRoute = <TKey extends string>(
  definition: Omit<CatchAllRouteDefinition<TKey>, 'kind'>,
): CatchAllRouteDefinition<TKey> => {
  return { kind: 'catch-all', ...definition };
};

const buildProgramCatalogPath = (...pathSegments: string[]): string => {
  const normalizedPathSegments = pathSegments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (!normalizedPathSegments.length) {
    return '/programs';
  }

  return `/programs/${normalizedPathSegments.join('/')}`;
};

const appLeafRouteDefinitions = {
  home: defineIndexRoute({
    key: 'home',
    access: 'public',
    absolutePath: '/',
  }),
  login: defineStaticRoute({
    key: 'login',
    access: 'guest-only',
    routePath: 'login',
    absolutePath: '/login',
  }),
  adminLogin: defineStaticRoute({
    key: 'adminLogin',
    access: 'public',
    routePath: 'admin/login',
    absolutePath: '/admin/login',
  }),
  admin: defineStaticRoute({
    key: 'admin',
    access: 'public',
    routePath: 'admin',
    absolutePath: '/admin',
  }),
  adminNotices: defineStaticRoute({
    key: 'adminNotices',
    access: 'public',
    routePath: 'admin/notices',
    absolutePath: '/admin/notices',
  }),
  adminQna: defineStaticRoute({
    key: 'adminQna',
    access: 'public',
    routePath: 'admin/qna',
    absolutePath: '/admin/qna',
  }),
  adminResources: defineStaticRoute({
    key: 'adminResources',
    access: 'public',
    routePath: 'admin/resources',
    absolutePath: '/admin/resources',
  }),
  adminReviews: defineStaticRoute({
    key: 'adminReviews',
    access: 'public',
    routePath: 'admin/reviews',
    absolutePath: '/admin/reviews',
  }),
  adminPrograms: defineStaticRoute({
    key: 'adminPrograms',
    access: 'public',
    routePath: 'admin/programs',
    absolutePath: '/admin/programs',
  }),
  adminProgramCreate: defineStaticRoute({
    key: 'adminProgramCreate',
    access: 'public',
    routePath: 'admin/programs/new',
    absolutePath: '/admin/programs/new',
  }),
  adminProgramEdit: defineDynamicRoute({
    key: 'adminProgramEdit',
    access: 'public',
    routePath: 'admin/programs/:programId/edit',
    absolutePathPattern: '/admin/programs/:programId/edit',
    buildPath: ({ programId }: { programId: string }) => {
      return generatePath('/admin/programs/:programId/edit', { programId });
    },
  }),
  adminProgramDuplicate: defineDynamicRoute({
    key: 'adminProgramDuplicate',
    access: 'public',
    routePath: 'admin/programs/:sourceProgramId/duplicate',
    absolutePathPattern: '/admin/programs/:sourceProgramId/duplicate',
    buildPath: ({ sourceProgramId }: { sourceProgramId: string }) => {
      return generatePath('/admin/programs/:sourceProgramId/duplicate', { sourceProgramId });
    },
  }),
  adminProgramMenus: defineStaticRoute({
    key: 'adminProgramMenus',
    access: 'public',
    routePath: 'admin/program-menus',
    absolutePath: '/admin/program-menus',
  }),
  adminVideos: defineStaticRoute({
    key: 'adminVideos',
    access: 'public',
    routePath: 'admin/videos',
    absolutePath: '/admin/videos',
  }),
  adminSales: defineStaticRoute({
    key: 'adminSales',
    access: 'public',
    routePath: 'admin/sales',
    absolutePath: '/admin/sales',
  }),
  signup: defineStaticRoute({
    key: 'signup',
    access: 'guest-only',
    routePath: 'signup',
    absolutePath: '/signup',
  }),
  accountRecovery: defineStaticRoute({
    key: 'accountRecovery',
    access: 'guest-only',
    routePath: 'account/recovery',
    absolutePath: '/account/recovery',
  }),
  mypage: defineStaticRoute({
    key: 'mypage',
    access: 'authenticated',
    routePath: 'mypage',
    absolutePath: '/mypage',
  }),
  learningPlayer: defineDynamicRoute({
    key: 'learningPlayer',
    access: 'authenticated',
    routePath: 'mypage/learning/:enrollmentId',
    absolutePathPattern: '/mypage/learning/:enrollmentId',
    buildPath: ({ enrollmentId }: { enrollmentId: string }) => {
      return generatePath('/mypage/learning/:enrollmentId', { enrollmentId });
    },
  }),
  learningLesson: defineDynamicRoute({
    key: 'learningLesson',
    access: 'authenticated',
    routePath: 'mypage/learning/:enrollmentId/lesson/:lessonId',
    absolutePathPattern: '/mypage/learning/:enrollmentId/lesson/:lessonId',
    buildPath: ({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) => {
      return generatePath('/mypage/learning/:enrollmentId/lesson/:lessonId', {
        enrollmentId,
        lessonId,
      });
    },
  }),
  cart: defineStaticRoute({
    key: 'cart',
    access: 'public',
    routePath: 'cart',
    absolutePath: '/cart',
  }),
  checkout: defineStaticRoute({
    key: 'checkout',
    access: 'authenticated',
    routePath: 'payments/checkout',
    absolutePath: '/payments/checkout',
  }),
  paymentResult: defineStaticRoute({
    key: 'paymentResult',
    access: 'public',
    routePath: 'payments/result',
    absolutePath: '/payments/result',
  }),
  notices: defineStaticRoute({
    key: 'notices',
    access: 'public',
    routePath: 'notices',
    absolutePath: '/notices',
  }),
  reviews: defineStaticRoute({
    key: 'reviews',
    access: 'public',
    routePath: 'reviews',
    absolutePath: '/reviews',
  }),
  qna: defineStaticRoute({
    key: 'qna',
    access: 'public',
    routePath: 'qna',
    absolutePath: '/qna',
  }),
  resources: defineStaticRoute({
    key: 'resources',
    access: 'public',
    routePath: 'resources',
    absolutePath: '/resources',
  }),
  programs: defineStaticRoute({
    key: 'programs',
    access: 'public',
    routePath: 'programs',
    absolutePath: '/programs',
  }),
  search: defineStaticRoute({
    key: 'search',
    access: 'public',
    routePath: 'search',
    absolutePath: '/search',
  }),
  program: defineDynamicRoute({
    key: 'program',
    access: 'public',
    routePath: 'programs/:programSlug',
    absolutePathPattern: '/programs/:programSlug',
    buildPath: ({ programSlug }: { programSlug: string }) => {
      return generatePath('/programs/:programSlug', { programSlug });
    },
  }),
  programSection: defineDynamicRoute({
    key: 'programSection',
    access: 'public',
    routePath: 'programs/:programSlug/:sectionSlug',
    absolutePathPattern: '/programs/:programSlug/:sectionSlug',
    buildPath: ({ programSlug, sectionSlug }: { programSlug: string; sectionSlug: string }) => {
      return generatePath('/programs/:programSlug/:sectionSlug', { programSlug, sectionSlug });
    },
  }),
  programCatalogDeep: defineStaticRoute({
    key: 'programCatalogDeep',
    access: 'public',
    routePath: 'programs/*',
    absolutePath: '/programs/*',
  }),
  contact: defineStaticRoute({
    key: 'contact',
    access: 'public',
    routePath: 'contact',
    absolutePath: '/contact',
  }),
  notFound: defineCatchAllRoute({
    key: 'notFound',
    access: 'public',
    routePath: '*',
  }),
} as const satisfies Record<string, AppLeafRouteDefinition>;

export type AppRouteKey = keyof typeof appLeafRouteDefinitions;

const appChildRouteKeys = [
  'home',
  'login',
  'adminLogin',
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
  'signup',
  'accountRecovery',
  'mypage',
  'learningPlayer',
  'learningLesson',
  'cart',
  'checkout',
  'paymentResult',
  'notices',
  'reviews',
  'qna',
  'resources',
  'programs',
  'search',
  'program',
  'programSection',
  'programCatalogDeep',
  'contact',
  'notFound',
] as const satisfies readonly AppRouteKey[];

// `appRouteRegistry`는 이 파일의 최종 핵심 데이터입니다.
// 루트 라우트 정보와 모든 자식 라우트 정의를 한 객체에 모읍니다.
export const appRouteRegistry = {
  // `root`는 최상위 라우트 정보를 담습니다.
  root: {
    // 앱의 최상위 경로는 `/`입니다.
    path: '/',
    // 자식 라우트는 위에서 정의한 순서대로 연결합니다.
    childRouteKeys: appChildRouteKeys,
  },
  // 실제 개별 라우트 정의 모음입니다.
  routes: appLeafRouteDefinitions,
} as const;

const { routes } = appRouteRegistry;

// `routePaths`는 컴포넌트가 가장 자주 쓰는 "실제 이동 주소" 모음입니다.
// `Link`, `navigate`, 메뉴 데이터 등에서 쉽게 가져다 쓰도록 별도로 만들어 둡니다.
export const routePaths = {
  // 정적 경로는 이미 절대 경로가 정의되어 있으므로 그대로 꺼내 씁니다.
  home: routes.home.absolutePath,
  login: routes.login.absolutePath,
  adminLogin: routes.adminLogin.absolutePath,
  admin: routes.admin.absolutePath,
  adminNotices: routes.adminNotices.absolutePath,
  adminQna: routes.adminQna.absolutePath,
  adminResources: routes.adminResources.absolutePath,
  adminReviews: routes.adminReviews.absolutePath,
  adminPrograms: routes.adminPrograms.absolutePath,
  adminProgramCreate: routes.adminProgramCreate.absolutePath,
  adminProgramEdit: (programId: string) => routes.adminProgramEdit.buildPath({ programId }),
  adminProgramDuplicate: (sourceProgramId: string) =>
    routes.adminProgramDuplicate.buildPath({ sourceProgramId }),
  adminProgramMenus: routes.adminProgramMenus.absolutePath,
  adminVideos: routes.adminVideos.absolutePath,
  adminSales: routes.adminSales.absolutePath,
  signup: routes.signup.absolutePath,
  accountRecovery: routes.accountRecovery.absolutePath,
  mypage: routes.mypage.absolutePath,
  learningPlayer: (enrollmentId: string) => routes.learningPlayer.buildPath({ enrollmentId }),
  learningLesson: (enrollmentId: string, lessonId: string) =>
    routes.learningLesson.buildPath({ enrollmentId, lessonId }),
  cart: routes.cart.absolutePath,
  checkout: routes.checkout.absolutePath,
  paymentResult: routes.paymentResult.absolutePath,
  notices: routes.notices.absolutePath,
  reviews: routes.reviews.absolutePath,
  qna: routes.qna.absolutePath,
  resources: routes.resources.absolutePath,
  programs: routes.programs.absolutePath,
  search: routes.search.absolutePath,
  contact: routes.contact.absolutePath,
  programCatalog: (...pathSegments: string[]) => buildProgramCatalogPath(...pathSegments),
  program: (programSlug: string) => routes.program.buildPath({ programSlug }),
  programSection: (programSlug: string, sectionSlug: string) =>
    routes.programSection.buildPath({ programSlug, sectionSlug }),
} as const;

export const appRouteAccessByKey: Record<AppRouteKey, AppRouteAccess> = Object.fromEntries(
  appRouteRegistry.root.childRouteKeys.map((routeKey) => {
    return [routeKey, appRouteRegistry.routes[routeKey].access];
  }),
) as Record<AppRouteKey, AppRouteAccess>;

export const createAppRouteHandle = (routeKey: AppRouteKey): AppRouteHandle => {
  return {
    routeKey,
    access: appRouteRegistry.routes[routeKey].access,
  };
};
