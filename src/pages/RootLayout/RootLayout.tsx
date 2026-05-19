import { useLayoutEffect } from 'react';

import { Link, Outlet, useLocation, useMatches } from 'react-router-dom';

import CommonFooter from '@/components/layout/CommonFooter/CommonFooter';
import CommonHeader from '@/components/layout/CommonHeader/CommonHeader';
import QuickMenu from '@/components/layout/QuickMenu/QuickMenu';
import GlobalNoticePopup from '@/components/notice/GlobalNoticePopup/GlobalNoticePopup';
import { env } from '@/config/env';
import { routePaths, type AppRouteHandle, type AppRouteKey } from '@/routes/routeRegistry';
import { classNames } from '@/utils/classNames';

import styles from './RootLayout.module.scss';

const ScrollToTopOnPathChange = () => {
  const location = useLocation();

  useLayoutEffect(() => {
    try {
      window.scrollTo({
        behavior: 'auto',
        left: 0,
        top: 0,
      });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return null;
};

const RootLayout = () => {
  const matches = useMatches() as Array<{ handle?: AppRouteHandle }>;
  const fullBleedRouteKeys = new Set<AppRouteKey>([
    'home',
    'learningLesson',
    'mypage',
    'notices',
    'noticeDetail',
    'programs',
    'program',
    'programSection',
    'programCatalogDeep',
    'qna',
    'resources',
  ]);
  const headerlessRouteKeys = new Set<AppRouteKey>(['learningLesson']);
  const isFullBleed = matches.some((match) => {
    return Boolean(match.handle && fullBleedRouteKeys.has(match.handle.routeKey));
  });
  const isHeaderless = matches.some((match) => {
    return Boolean(match.handle && headerlessRouteKeys.has(match.handle.routeKey));
  });
  const isHomeRoute = matches.some((match) => {
    return Boolean(match.handle && match.handle.routeKey === 'home');
  });

  return (
    <div className={styles['layout']}>
      <ScrollToTopOnPathChange />

      {!isHeaderless ? (
        <CommonHeader
          LinkComponent={Link}
          logo={{ imageSrc: '/SRDMS_logo_2x.png', label: env.appName, to: routePaths.home }}
        />
      ) : null}

      <main className={classNames(styles['main'], isFullBleed && styles['mainFullBleed'])}>
        <Outlet />
      </main>

      {!isHeaderless ? <CommonFooter /> : null}
      {isHomeRoute ? <GlobalNoticePopup /> : null}
      {isHomeRoute ? <QuickMenu /> : null}
    </div>
  );
};

export default RootLayout;
