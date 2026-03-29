import { useEffect } from 'react';

import { NavLink, Navigate, Outlet } from 'react-router-dom';

import Button from '@/components/ui/Button/Button';
import { routePaths } from '@/routes/routeRegistry';
import { isExpiredSession } from '@/stores/sessionExpiry';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useToastStore } from '@/stores/useToastStore';

import styles from './AdminConsoleLayout.module.scss';

const adminNavigationItems = [
  {
    label: '대시보드',
    to: routePaths.admin,
  },
  {
    label: '공지사항',
    to: routePaths.adminNotices,
  },
  {
    label: '팝업',
    to: routePaths.adminPopups,
  },
  {
    label: 'Q&A',
    to: routePaths.adminQna,
  },
  {
    label: '자료실',
    to: routePaths.adminResources,
  },
  {
    label: '수강관리',
    to: routePaths.adminEnrollments,
  },
  {
    label: '실습일정관리',
    to: routePaths.adminPracticum,
  },
  {
    label: '프로그램 관리',
    to: routePaths.adminPrograms,
  },
  {
    label: '프로그램 카테고리 관리',
    to: routePaths.adminProgramMenus,
  },
  {
    label: '태그 관리',
    to: routePaths.adminTags,
  },
  {
    label: '쿠폰 관리',
    to: routePaths.adminCoupons,
  },
  {
    label: '영상 업로드',
    to: routePaths.adminVideos,
  },
  {
    label: '결제 관리',
    to: routePaths.adminPayments,
  },
] as const;

const AdminConsoleLayout = () => {
  const adminDisplayName = useAdminAuthStore((state) => state.adminDisplayName);
  const expiresAt = useAdminAuthStore((state) => state.expiresAt);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const logout = useAdminAuthStore((state) => state.logout);
  const showToast = useToastStore((state) => state.showToast);
  const isSessionExpired = isAuthenticated && isExpiredSession(expiresAt);

  useEffect(() => {
    if (!isSessionExpired) {
      return;
    }

    logout();
  }, [isSessionExpired, logout]);

  if (!isAuthenticated || isSessionExpired) {
    return <Navigate replace to={routePaths.adminLogin} />;
  }

  const handleLogout = () => {
    logout();
    showToast({
      message: '관리자 세션을 종료했습니다.',
      variant: 'success',
    });
  };

  return (
    <div className={styles['layout']}>
      <aside className={styles['sidebar']}>
        <div className={styles['sidebarHeader']}>
          <h1 className={styles['title']}>관리자</h1>
          <p className={styles['adminName']}>{adminDisplayName || '관리자'}</p>
        </div>

        <nav aria-label='관리자 메뉴' className={styles['navigation']}>
          <ul className={styles['navigationList']}>
            {adminNavigationItems.map((item) => {
              return (
                <li key={item.to}>
                  <NavLink
                    className={({ isActive }) =>
                      isActive
                        ? `${styles['navigationLink']} ${styles['navigationLinkActive']}`
                        : styles['navigationLink']
                    }
                    end={item.to === routePaths.admin}
                    to={item.to}
                  >
                    <span className={styles['navigationLabel']}>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles['sidebarFooter']}>
          <Button onClick={handleLogout} variant='secondary'>
            로그아웃
          </Button>
        </div>
      </aside>

      <main className={styles['main']}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminConsoleLayout;
