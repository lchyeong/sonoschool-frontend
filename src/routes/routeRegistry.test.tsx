import { describe, expect, it } from 'vitest';

import { adminAuthRouteTree, adminConsoleRouteTree, appRouteTree } from '@/routes/router';
import {
  appRouteAccessByKey,
  appRouteRegistry,
  routePaths,
  type AppRouteHandle,
} from '@/routes/routeRegistry';

const getRouteHandle = (routePath: string | undefined): AppRouteHandle | undefined => {
  const routeTrees = [appRouteTree, adminAuthRouteTree, adminConsoleRouteTree];

  return routeTrees
    .flatMap((routeTree) => routeTree.children ?? [])
    .find((childRoute) => childRoute.path === routePath)?.handle as AppRouteHandle | undefined;
};

describe('appRouteRegistry', () => {
  it('derives route paths from the shared registry', () => {
    expect(routePaths.home).toBe(appRouteRegistry.routes.home.absolutePath);
    expect(routePaths.login).toBe(appRouteRegistry.routes.login.absolutePath);
    expect(routePaths.adminLogin).toBe(appRouteRegistry.routes.adminLogin.absolutePath);
    expect(routePaths.admin).toBe(appRouteRegistry.routes.admin.absolutePath);
    expect(routePaths.adminNotices).toBe(appRouteRegistry.routes.adminNotices.absolutePath);
    expect(routePaths.adminQna).toBe(appRouteRegistry.routes.adminQna.absolutePath);
    expect(routePaths.adminResources).toBe(appRouteRegistry.routes.adminResources.absolutePath);
    expect(routePaths.adminReviews).toBe(appRouteRegistry.routes.adminReviews.absolutePath);
    expect(routePaths.adminPrograms).toBe(appRouteRegistry.routes.adminPrograms.absolutePath);
    expect(routePaths.adminProgramCreate).toBe(
      appRouteRegistry.routes.adminProgramCreate.absolutePath,
    );
    expect(routePaths.adminProgramEdit('program-1')).toBe('/admin/programs/program-1/edit');
    expect(routePaths.adminProgramDuplicate('program-1')).toBe(
      '/admin/programs/program-1/duplicate',
    );
    expect(routePaths.adminProgramMenus).toBe(
      appRouteRegistry.routes.adminProgramMenus.absolutePath,
    );
    expect(routePaths.adminPayments).toBe(appRouteRegistry.routes.adminPayments.absolutePath);
    expect(routePaths.signup).toBe(appRouteRegistry.routes.signup.absolutePath);
    expect(routePaths.accountRecovery).toBe(appRouteRegistry.routes.accountRecovery.absolutePath);
    expect(routePaths.learningPlayer('101')).toBe('/mypage/learning/101');
    expect(routePaths.learningLesson('101', 'lesson-2')).toBe(
      '/mypage/learning/101/lesson/lesson-2',
    );
    expect(routePaths.checkout).toBe(appRouteRegistry.routes.checkout.absolutePath);
    expect(routePaths.paymentResult).toBe(appRouteRegistry.routes.paymentResult.absolutePath);
    expect(routePaths.reviews).toBe(appRouteRegistry.routes.reviews.absolutePath);
    expect(routePaths.resources).toBe(appRouteRegistry.routes.resources.absolutePath);
    expect(routePaths.programCatalog()).toBe('/programs');
    expect(routePaths.programCatalog('general-course', 'abdomen', 'abdomen-basic-6-weeks')).toBe(
      '/programs/general-course/abdomen/abdomen-basic-6-weeks',
    );
    expect(routePaths.program('react-basic')).toBe('/programs/react-basic');
    expect(routePaths.programSection('react-basic', 'intro')).toBe('/programs/react-basic/intro');
  });

  it('keeps access metadata on generated route objects for future guards', () => {
    expect(appRouteAccessByKey.home).toBe('public');
    expect(appRouteAccessByKey.login).toBe('guest-only');
    expect(appRouteAccessByKey.adminLogin).toBe('public');
    expect(appRouteAccessByKey.admin).toBe('public');
    expect(appRouteAccessByKey.adminNotices).toBe('public');
    expect(appRouteAccessByKey.adminQna).toBe('public');
    expect(appRouteAccessByKey.adminResources).toBe('public');
    expect(appRouteAccessByKey.adminReviews).toBe('public');
    expect(appRouteAccessByKey.adminPrograms).toBe('public');
    expect(appRouteAccessByKey.adminProgramCreate).toBe('public');
    expect(appRouteAccessByKey.adminProgramEdit).toBe('public');
    expect(appRouteAccessByKey.adminProgramDuplicate).toBe('public');
    expect(appRouteAccessByKey.adminProgramMenus).toBe('public');
    expect(appRouteAccessByKey.adminPayments).toBe('public');
    expect(appRouteAccessByKey.accountRecovery).toBe('guest-only');
    expect(appRouteAccessByKey.mypage).toBe('authenticated');
    expect(appRouteAccessByKey.learningPlayer).toBe('authenticated');
    expect(appRouteAccessByKey.learningLesson).toBe('authenticated');
    expect(appRouteAccessByKey.checkout).toBe('authenticated');
    expect(appRouteAccessByKey.paymentResult).toBe('public');
    expect(getRouteHandle('mypage')).toEqual({
      routeKey: 'mypage',
      access: 'authenticated',
    });
    expect(getRouteHandle('mypage/learning/:enrollmentId')).toEqual({
      routeKey: 'learningPlayer',
      access: 'authenticated',
    });
    expect(getRouteHandle('mypage/learning/:enrollmentId/lesson/:lessonId')).toEqual({
      routeKey: 'learningLesson',
      access: 'authenticated',
    });
    expect(getRouteHandle('login')).toEqual({
      routeKey: 'login',
      access: 'guest-only',
    });
    expect(getRouteHandle('account/recovery')).toEqual({
      routeKey: 'accountRecovery',
      access: 'guest-only',
    });
    expect(getRouteHandle('admin/login')).toEqual({
      routeKey: 'adminLogin',
      access: 'public',
    });
    expect(getRouteHandle('admin')).toEqual({
      routeKey: 'admin',
      access: 'public',
    });
    expect(getRouteHandle('admin/notices')).toEqual({
      routeKey: 'adminNotices',
      access: 'public',
    });
    expect(getRouteHandle('admin/qna')).toEqual({
      routeKey: 'adminQna',
      access: 'public',
    });
    expect(getRouteHandle('admin/resources')).toEqual({
      routeKey: 'adminResources',
      access: 'public',
    });
    expect(getRouteHandle('admin/reviews')).toEqual({
      routeKey: 'adminReviews',
      access: 'public',
    });
    expect(getRouteHandle('admin/programs')).toEqual({
      routeKey: 'adminPrograms',
      access: 'public',
    });
    expect(getRouteHandle('admin/programs/new')).toEqual({
      routeKey: 'adminProgramCreate',
      access: 'public',
    });
    expect(getRouteHandle('admin/programs/:programId/edit')).toEqual({
      routeKey: 'adminProgramEdit',
      access: 'public',
    });
    expect(getRouteHandle('admin/programs/:sourceProgramId/duplicate')).toEqual({
      routeKey: 'adminProgramDuplicate',
      access: 'public',
    });
    expect(getRouteHandle('admin/program-menus')).toEqual({
      routeKey: 'adminProgramMenus',
      access: 'public',
    });
    expect(getRouteHandle('admin/payments')).toEqual({
      routeKey: 'adminPayments',
      access: 'public',
    });
    expect(getRouteHandle('payments/checkout')).toEqual({
      routeKey: 'checkout',
      access: 'authenticated',
    });
    expect(getRouteHandle('payments/result')).toEqual({
      routeKey: 'paymentResult',
      access: 'public',
    });
  });
});
