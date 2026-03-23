import { Link, Outlet, useMatches } from 'react-router-dom';

import CommonFooter from '@/components/layout/CommonFooter/CommonFooter';
import CommonHeader from '@/components/layout/CommonHeader/CommonHeader';
import { env } from '@/config/env';
import { routePaths, type AppRouteHandle, type AppRouteKey } from '@/routes/routeRegistry';
import { classNames } from '@/utils/classNames';

import styles from './RootLayout.module.scss';

const RootLayout = () => {
  const matches = useMatches() as Array<{ handle?: AppRouteHandle }>;
  const fullBleedRouteKeys = new Set<AppRouteKey>(['learningLesson']);
  const isFullBleed = matches.some((match) => {
    return Boolean(match.handle && fullBleedRouteKeys.has(match.handle.routeKey));
  });

  return (
    <div className={styles['layout']}>
      {!isFullBleed ? (
        <CommonHeader
          LinkComponent={Link}
          logo={{ imageSrc: '/SRDMS_logo_2x.png', label: env.appName, to: routePaths.home }}
        />
      ) : null}

      <main className={classNames(styles['main'], isFullBleed && styles['mainFullBleed'])}>
        <Outlet />
      </main>

      {!isFullBleed ? <CommonFooter /> : null}
    </div>
  );
};

export default RootLayout;
