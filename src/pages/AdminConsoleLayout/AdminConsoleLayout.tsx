import { NavLink, Navigate, Outlet } from 'react-router-dom';

import Button from '@/components/ui/Button/Button';
import { routePaths } from '@/routes/routeRegistry';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { clearStudentSession } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

import styles from './AdminConsoleLayout.module.scss';

const adminNavigationItems = [
  {
    description: '매출, 미답변 문의, 잔여 좌석 요약',
    label: '대시보드',
    to: routePaths.admin,
  },
  {
    description: '공지 등록과 운영 공지 목록',
    label: '공지사항',
    to: routePaths.adminNotices,
  },
  {
    description: '문의 답변과 상태 확인',
    label: 'Q&A',
    to: routePaths.adminQna,
  },
  {
    description: '파일 첨부 자료 게시글 관리',
    label: '자료실',
    to: routePaths.adminResources,
  },
  {
    description: '교육후기 홍보글 운영',
    label: '교육후기',
    to: routePaths.adminReviews,
  },
  {
    description: '강의 등록, 수정, 삭제, 숨김',
    label: '강의 관리',
    to: routePaths.adminPrograms,
  },
  {
    description: '헤더 교육과정 메뉴 구조 관리',
    label: '강의메뉴관리',
    to: routePaths.adminProgramMenus,
  },
  {
    description: '실제 영상 업로드와 인코딩 시작 테스트',
    label: '영상 업로드',
    to: routePaths.adminVideos,
  },
  {
    description: '판매량, 재고, 매출 확인',
    label: '매출 관리',
    to: routePaths.adminSales,
  },
] as const;

const AdminConsoleLayout = () => {
  const adminDisplayName = useAdminAuthStore((state) => state.adminDisplayName);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const logout = useAdminAuthStore((state) => state.logout);
  const showToast = useToastStore((state) => state.showToast);

  if (!isAuthenticated) {
    return <Navigate replace to={routePaths.adminLogin} />;
  }

  const handleLogout = () => {
    clearStudentSession();
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
          <p className={styles['eyebrow']}>Sono School Admin</p>
          <h1 className={styles['title']}>운영 메뉴</h1>
          <p className={styles['adminName']}>{adminDisplayName ?? '관리자'}</p>
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
                    <span className={styles['navigationDescription']}>{item.description}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <Button onClick={handleLogout} variant='secondary'>
          로그아웃
        </Button>
      </aside>

      <main className={styles['main']}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminConsoleLayout;
