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
    expect(routePaths.adminNoticeCreate).toBe(
      appRouteRegistry.routes.adminNoticeCreate.absolutePath,
    );
    expect(routePaths.adminNoticeEdit('7')).toBe('/admin/notices/7/edit');
    expect(routePaths.adminPopups).toBe(appRouteRegistry.routes.adminPopups.absolutePath);
    expect(routePaths.adminQna).toBe(appRouteRegistry.routes.adminQna.absolutePath);
    expect(routePaths.adminResources).toBe(appRouteRegistry.routes.adminResources.absolutePath);
    expect(routePaths.adminResourceCreate).toBe(
      appRouteRegistry.routes.adminResourceCreate.absolutePath,
    );
    expect(routePaths.adminResourceEdit('7')).toBe('/admin/resources/7/edit');
    expect(routePaths.adminEnrollments).toBe(appRouteRegistry.routes.adminEnrollments.absolutePath);
    expect(routePaths.adminPracticum).toBe(appRouteRegistry.routes.adminPracticum.absolutePath);
    expect(routePaths.adminReviews).toBe(appRouteRegistry.routes.adminReviews.absolutePath);
    expect(routePaths.adminPrograms).toBe(appRouteRegistry.routes.adminPrograms.absolutePath);
    expect(routePaths.adminProgramCreate).toBe(
      appRouteRegistry.routes.adminProgramCreate.absolutePath,
    );
    expect(routePaths.adminProgramCreateCurriculum).toBe(
      appRouteRegistry.routes.adminProgramCreateCurriculum.absolutePath,
    );
    expect(routePaths.adminProgramCreateQuizzes).toBe(
      appRouteRegistry.routes.adminProgramCreateQuizzes.absolutePath,
    );
    expect(routePaths.adminProgramCreateResources).toBe(
      appRouteRegistry.routes.adminProgramCreateResources.absolutePath,
    );
    expect(routePaths.adminProgramEdit('program-1')).toBe('/admin/programs/program-1/edit');
    expect(routePaths.adminProgramCurriculum('program-1')).toBe(
      '/admin/programs/program-1/curriculum',
    );
    expect(routePaths.adminProgramQuizzes('program-1')).toBe('/admin/programs/program-1/quizzes');
    expect(routePaths.adminProgramResources('program-1')).toBe(
      '/admin/programs/program-1/resources',
    );
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
    expect(routePaths.myEnrollmentPracticum('101')).toBe('/mypage/enrollments/101/practicum');
    expect(routePaths.checkout).toBe(appRouteRegistry.routes.checkout.absolutePath);
    expect(routePaths.paymentResult).toBe(appRouteRegistry.routes.paymentResult.absolutePath);
    expect(routePaths.noticeDetail('7')).toBe('/notices/7');
    expect(routePaths.reviews).toBe(appRouteRegistry.routes.reviews.absolutePath);
    expect(routePaths.resources).toBe(appRouteRegistry.routes.resources.absolutePath);
    expect(routePaths.resourceDetail('7')).toBe('/resources/7');
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
    expect(appRouteAccessByKey.admin).toBe('admin');
    expect(appRouteAccessByKey.adminNotices).toBe('admin');
    expect(appRouteAccessByKey.adminNoticeCreate).toBe('admin');
    expect(appRouteAccessByKey.adminNoticeEdit).toBe('admin');
    expect(appRouteAccessByKey.adminPopups).toBe('admin');
    expect(appRouteAccessByKey.adminQna).toBe('admin');
    expect(appRouteAccessByKey.adminResources).toBe('admin');
    expect(appRouteAccessByKey.adminResourceCreate).toBe('admin');
    expect(appRouteAccessByKey.adminResourceEdit).toBe('admin');
    expect(appRouteAccessByKey.adminEnrollments).toBe('admin');
    expect(appRouteAccessByKey.adminPracticum).toBe('admin');
    expect(appRouteAccessByKey.adminReviews).toBe('admin');
    expect(appRouteAccessByKey.adminPrograms).toBe('admin');
    expect(appRouteAccessByKey.adminProgramCreate).toBe('admin');
    expect(appRouteAccessByKey.adminProgramCreateCurriculum).toBe('admin');
    expect(appRouteAccessByKey.adminProgramCreateQuizzes).toBe('admin');
    expect(appRouteAccessByKey.adminProgramCreateResources).toBe('admin');
    expect(appRouteAccessByKey.adminProgramEdit).toBe('admin');
    expect(appRouteAccessByKey.adminProgramCurriculum).toBe('admin');
    expect(appRouteAccessByKey.adminProgramQuizzes).toBe('admin');
    expect(appRouteAccessByKey.adminProgramResources).toBe('admin');
    expect(appRouteAccessByKey.adminProgramDuplicate).toBe('admin');
    expect(appRouteAccessByKey.adminProgramMenus).toBe('admin');
    expect(appRouteAccessByKey.adminPayments).toBe('admin');
    expect(appRouteAccessByKey.accountRecovery).toBe('guest-only');
    expect(appRouteAccessByKey.mypage).toBe('authenticated');
    expect(appRouteAccessByKey.learningPlayer).toBe('authenticated');
    expect(appRouteAccessByKey.learningLesson).toBe('authenticated');
    expect(appRouteAccessByKey.myEnrollmentPracticum).toBe('authenticated');
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
    expect(getRouteHandle('mypage/enrollments/:enrollmentId/practicum')).toEqual({
      routeKey: 'myEnrollmentPracticum',
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
      access: 'admin',
    });
    expect(getRouteHandle('admin/notices')).toEqual({
      routeKey: 'adminNotices',
      access: 'admin',
    });
    expect(getRouteHandle('admin/notices/new')).toEqual({
      routeKey: 'adminNoticeCreate',
      access: 'admin',
    });
    expect(getRouteHandle('admin/notices/:noticeId/edit')).toEqual({
      routeKey: 'adminNoticeEdit',
      access: 'admin',
    });
    expect(getRouteHandle('admin/popups')).toEqual({
      routeKey: 'adminPopups',
      access: 'admin',
    });
    expect(getRouteHandle('admin/qna')).toEqual({
      routeKey: 'adminQna',
      access: 'admin',
    });
    expect(getRouteHandle('admin/resources')).toEqual({
      routeKey: 'adminResources',
      access: 'admin',
    });
    expect(getRouteHandle('admin/resources/new')).toEqual({
      routeKey: 'adminResourceCreate',
      access: 'admin',
    });
    expect(getRouteHandle('admin/resources/:resourceId/edit')).toEqual({
      routeKey: 'adminResourceEdit',
      access: 'admin',
    });
    expect(getRouteHandle('admin/enrollments')).toEqual({
      routeKey: 'adminEnrollments',
      access: 'admin',
    });
    expect(getRouteHandle('admin/practicum')).toEqual({
      routeKey: 'adminPracticum',
      access: 'admin',
    });
    expect(getRouteHandle('admin/reviews')).toEqual({
      routeKey: 'adminReviews',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs')).toEqual({
      routeKey: 'adminPrograms',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/new')).toEqual({
      routeKey: 'adminProgramCreate',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/new/curriculum')).toEqual({
      routeKey: 'adminProgramCreateCurriculum',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/new/quizzes')).toEqual({
      routeKey: 'adminProgramCreateQuizzes',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/new/resources')).toEqual({
      routeKey: 'adminProgramCreateResources',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/:programId/edit')).toEqual({
      routeKey: 'adminProgramEdit',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/:programId/curriculum')).toEqual({
      routeKey: 'adminProgramCurriculum',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/:programId/quizzes')).toEqual({
      routeKey: 'adminProgramQuizzes',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/:programId/resources')).toEqual({
      routeKey: 'adminProgramResources',
      access: 'admin',
    });
    expect(getRouteHandle('admin/programs/:sourceProgramId/duplicate')).toEqual({
      routeKey: 'adminProgramDuplicate',
      access: 'admin',
    });
    expect(getRouteHandle('admin/program-menus')).toEqual({
      routeKey: 'adminProgramMenus',
      access: 'admin',
    });
    expect(getRouteHandle('admin/payments')).toEqual({
      routeKey: 'adminPayments',
      access: 'admin',
    });
    expect(getRouteHandle('payments/checkout')).toEqual({
      routeKey: 'checkout',
      access: 'authenticated',
    });
    expect(getRouteHandle('payments/result')).toEqual({
      routeKey: 'paymentResult',
      access: 'public',
    });
    expect(getRouteHandle('notices/:noticeId')).toEqual({
      routeKey: 'noticeDetail',
      access: 'public',
    });
    expect(getRouteHandle('resources/:resourceId')).toEqual({
      routeKey: 'resourceDetail',
      access: 'public',
    });
  });
});
