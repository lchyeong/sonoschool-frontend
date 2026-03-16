import { Link, Outlet } from 'react-router-dom';

import CommonFooter from '@/components/layout/CommonFooter/CommonFooter';
import CommonHeader from '@/components/layout/CommonHeader/CommonHeader';
import { env } from '@/config/env';
import { routePaths } from '@/routes/routeRegistry';

import styles from './RootLayout.module.scss';

const RootLayout = () => {
  return (
    <div className={styles['layout']}>
      <CommonHeader
        LinkComponent={Link}
        logo={{ imageSrc: '/SRDMS_logo_2x.png', label: env.appName, to: routePaths.home }}
        siteKey={env.siteKey}
      />

      <main className={styles['main']}>
        <Outlet />
      </main>

      <CommonFooter />
    </div>
  );
};

export default RootLayout;
