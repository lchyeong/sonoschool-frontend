import { useDeferredValue, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { fetchAdminUsers } from '@/api/adminUsers';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import { routePaths } from '@/routes/routeRegistry';
import type { AdminUserManagementItem } from '@/types/adminUsers';

import styles from './AdminConsolePage.module.scss';

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const AdminEnrollmentsSection = () => {
  const [memberKeyword, setMemberKeyword] = useState('');
  const deferredMemberKeyword = useDeferredValue(memberKeyword);
  const normalizedMemberKeyword = deferredMemberKeyword.trim();

  const membersQuery = useQuery({
    gcTime: 60 * 1000,
    queryFn: () => fetchAdminUsers(normalizedMemberKeyword || undefined),
    queryKey: ['adminUsers', normalizedMemberKeyword],
    staleTime: 15 * 1000,
  });

  return (
    <section className={styles['workspace']}>
      <section className={styles['panelWide']}>
        <div className={styles['panelToolbar']}>
          <UnifiedSearchBar
            className={styles['adminSearchBar']}
            inputAriaLabel='회원 관리 검색'
            onChange={(nextValue) => {
              setMemberKeyword(nextValue);
            }}
            onSubmit={() => undefined}
            placeholder='이름, 아이디, 이메일 검색'
            value={memberKeyword}
          />
        </div>

        {membersQuery.isPending ? (
          <p className={styles['helperText']}>회원 목록을 불러오는 중입니다.</p>
        ) : null}
        {membersQuery.isError ? (
          <p className={styles['helperText']}>
            {membersQuery.error instanceof Error
              ? membersQuery.error.message
              : '회원 목록을 불러오지 못했습니다.'}
          </p>
        ) : null}
        {membersQuery.data ? renderMembersTable(membersQuery.data) : null}
      </section>
    </section>
  );
};

const renderMembersTable = (items: AdminUserManagementItem[]) => {
  return (
    <div className={styles['tableWrap']}>
      <table className={`${styles['table']} ${styles['userTable']}`}>
        <thead>
          <tr>
            <th scope='col'>회원</th>
            <th scope='col'>연락처</th>
            <th scope='col'>수강/실습</th>
            <th scope='col'>가입일</th>
            <th scope='col'>관리</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>
                <div className={styles['cellStack']}>
                  <Link
                    className={styles['cellPrimary']}
                    to={routePaths.adminUserDetail(String(user.id))}
                  >
                    {user.displayName}
                  </Link>
                  <span className={styles['cellSecondary']}>아이디 {user.loginId}</span>
                </div>
              </td>
              <td>
                <div className={styles['cellStack']}>
                  <span className={styles['cellPrimary']}>{user.phoneNumber}</span>
                  <span className={styles['cellSecondary']}>{user.email}</span>
                </div>
              </td>
              <td>
                <div className={styles['cellStack']}>
                  <span className={styles['cellPrimary']}>
                    수강중 {String(user.activeEnrollmentCount)}건
                  </span>
                  <span className={styles['cellSecondary']}>
                    예정 실습 {String(user.upcomingPracticumCount)}건
                  </span>
                </div>
              </td>
              <td>{formatDate(user.joinedAt)}</td>
              <td>
                <Link
                  className={styles['tableActionButton']}
                  to={routePaths.adminUserDetail(String(user.id))}
                >
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminEnrollmentsSection;
