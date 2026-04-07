import { useDeferredValue, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { fetchAdminUsers } from '@/api/adminUsers';
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
          <label className={styles['searchField']}>
            <span className={styles['searchLabel']}>회원 검색</span>
            <input
              aria-label='회원 관리 검색'
              className={styles['searchInput']}
              onChange={(event) => {
                setMemberKeyword(event.target.value);
              }}
              placeholder='이름, 아이디, 이메일 검색'
              type='search'
              value={memberKeyword}
            />
          </label>
          <p className={styles['metaText']}>회원(클릭시 상세보기)</p>
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
      <table className={styles['table']}>
        <thead>
          <tr>
            <th scope='col'>회원(클릭시 상세보기)</th>
            <th scope='col'>연락처</th>
            <th scope='col'>이메일</th>
            <th scope='col'>수강중</th>
            <th scope='col'>예정 실습</th>
            <th scope='col'>가입일</th>
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
              <td>{user.phoneNumber}</td>
              <td>{user.email}</td>
              <td>{String(user.activeEnrollmentCount)}건</td>
              <td>{String(user.upcomingPracticumCount)}건</td>
              <td>{formatDate(user.joinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminEnrollmentsSection;
