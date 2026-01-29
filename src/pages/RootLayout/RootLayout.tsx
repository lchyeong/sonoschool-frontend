import { NavLink, Outlet } from 'react-router-dom';

import Button from '@/components/ui/Button/Button';
import { env } from '@/config/env';
import { routePaths } from '@/routes/routePaths';
import { useThemeStore } from '@/stores/useThemeStore';

import styles from './RootLayout.module.scss';

const RootLayout = () => {
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <div className={styles['layout']}>
      <header className={styles['header']}>
        <NavLink className={styles['brandLink']} to={routePaths.home}>
          {env.appName}
        </NavLink>

        <nav aria-label='Primary' className={styles['nav']}>
          <NavLink
            className={({ isActive }) =>
              isActive ? `${styles['navLink']} ${styles['navLinkActive']}` : styles['navLink']
            }
            end
            to={routePaths.home}
          >
            Home
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? `${styles['navLink']} ${styles['navLinkActive']}` : styles['navLink']
            }
            to={routePaths.contact}
          >
            Contact
          </NavLink>
        </nav>

        <Button onClick={toggleTheme} size='sm' type='button' variant='secondary'>
          Theme
        </Button>
      </header>

      <main className={styles['main']}>
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;
