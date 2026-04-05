import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAdminEnrollment,
  expireAdminEnrollments,
  fetchAdminEnrollments,
} from '@/api/adminEnrollments';
import { fetchAdminUsers } from '@/api/adminUsers';
import Button from '@/components/ui/Button/Button';
import { useAdminProgramsLiveQuery } from '@/query/useAdminProgramsLiveQuery';
import { useAdminUserSearchQuery } from '@/query/useAdminUserSearchQuery';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminEnrollmentListItem,
  AdminEnrollmentMaintenanceResult,
  AdminEnrollmentResult,
} from '@/types/adminEnrollments';
import type { AdminProgramListItem } from '@/types/adminProgramsLive';
import type { AdminUserManagementItem, AdminUserSearchItem } from '@/types/adminUsers';

import styles from './AdminConsolePage.module.scss';

type EnrollmentAdminTab = 'enrollments' | 'members';

const tabItems: Array<{ id: EnrollmentAdminTab; label: string }> = [
  { id: 'enrollments', label: '수강 관리' },
  { id: 'members', label: '회원 관리' },
];

const enrollmentStatusLabel: Record<string, string> = {
  ACTIVE: '수강중',
  CANCELLED: '취소',
  EXPIRED: '만료',
};

const programTypeLabel: Record<string, string> = {
  HYBRID: '하이브리드',
  OFFLINE: '오프라인',
  ONLINE: '온라인',
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const normalizeKeyword = (value: string): string => value.trim().toLowerCase();

const renderProgramStatusBadge = (program: AdminProgramListItem) => {
  return program.published ? (
    <span className={styles['badgeSuccess']}>공개중</span>
  ) : (
    <span className={styles['badge']}>비공개</span>
  );
};

const AdminEnrollmentsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const programsQuery = useAdminProgramsLiveQuery();

  const [activeTab, setActiveTab] = useState<EnrollmentAdminTab>('enrollments');
  const [userKeyword, setUserKeyword] = useState('');
  const [programKeyword, setProgramKeyword] = useState('');
  const [memberKeyword, setMemberKeyword] = useState('');
  const [enrollmentKeyword, setEnrollmentKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchItem | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [lastEnrollmentResult, setLastEnrollmentResult] = useState<AdminEnrollmentResult | null>(
    null,
  );
  const [lastMaintenanceResult, setLastMaintenanceResult] =
    useState<AdminEnrollmentMaintenanceResult | null>(null);

  const deferredUserKeyword = useDeferredValue(userKeyword);
  const deferredProgramKeyword = useDeferredValue(programKeyword);
  const deferredMemberKeyword = useDeferredValue(memberKeyword);
  const deferredEnrollmentKeyword = useDeferredValue(enrollmentKeyword);

  const normalizedUserKeyword = deferredUserKeyword.trim();
  const normalizedProgramKeyword = normalizeKeyword(deferredProgramKeyword);
  const normalizedMemberKeyword = deferredMemberKeyword.trim();
  const normalizedEnrollmentKeyword = deferredEnrollmentKeyword.trim();

  const usersQuery = useAdminUserSearchQuery(normalizedUserKeyword);
  const searchedUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const programs = useMemo(() => programsQuery.data ?? [], [programsQuery.data]);

  const membersQuery = useQuery({
    gcTime: 60 * 1000,
    queryFn: () => fetchAdminUsers(normalizedMemberKeyword || undefined),
    queryKey: ['adminUsers', normalizedMemberKeyword],
    staleTime: 15 * 1000,
  });

  const enrollmentsQuery = useQuery({
    gcTime: 60 * 1000,
    queryFn: () => fetchAdminEnrollments(normalizedEnrollmentKeyword || undefined),
    queryKey: ['adminEnrollments', normalizedEnrollmentKeyword],
    staleTime: 15 * 1000,
  });

  const filteredPrograms = useMemo(() => {
    if (!normalizedProgramKeyword) {
      return programs.slice(0, 8);
    }

    return programs
      .filter((program) => {
        return [
          program.title,
          program.categoryName,
          program.catalogStatus,
          program.published ? 'published' : 'hidden',
        ].some((value) => value.toLowerCase().includes(normalizedProgramKeyword));
      })
      .slice(0, 8);
  }, [normalizedProgramKeyword, programs]);

  const selectedProgram = useMemo(() => {
    if (selectedProgramId === null) {
      return null;
    }

    return programs.find((program) => program.id === selectedProgramId) ?? null;
  }, [programs, selectedProgramId]);

  const enrollMutation = useMutation({
    mutationFn: ({ programId, userId }: { programId: number; userId: number; userName: string }) =>
      createAdminEnrollment(programId, userId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '수강 배정에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (result, variables) => {
      setLastEnrollmentResult(result);
      setSelectedProgramId(null);
      setProgramKeyword('');
      void queryClient.invalidateQueries({ queryKey: ['adminEnrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showToast({
        message: `${variables.userName}님에게 ${result.programTitle} 수강을 배정했습니다.`,
        variant: 'success',
      });
    },
  });

  const expireMutation = useMutation({
    mutationFn: () => expireAdminEnrollments(),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '수강 만료 정리 실행에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (result) => {
      setLastMaintenanceResult(result);
      void queryClient.invalidateQueries({ queryKey: ['adminEnrollments'] });
      showToast({
        message: `만료 대상 ${String(result.processedCount)}건을 처리했습니다.`,
        variant: 'success',
      });
    },
  });

  const handleCreateEnrollment = () => {
    if (!selectedUser) {
      showToast({
        message: '먼저 회원을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    if (!selectedProgram) {
      showToast({
        message: '먼저 프로그램을 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    enrollMutation.mutate({
      programId: selectedProgram.id,
      userId: selectedUser.id,
      userName: selectedUser.displayName,
    });
  };

  const renderMembersTable = (items: AdminUserManagementItem[]) => {
    return (
      <div className={styles['tableWrap']}>
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope='col'>회원</th>
              <th scope='col'>연락처</th>
              <th scope='col'>이메일</th>
              <th scope='col'>활성 수강</th>
              <th scope='col'>예정 실습</th>
              <th scope='col'>가입일</th>
              <th scope='col'>상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className={styles['cellStack']}>
                    <strong className={styles['cellPrimary']}>{user.displayName}</strong>
                    <span className={styles['cellSecondary']}>아이디 {user.loginId}</span>
                  </div>
                </td>
                <td>{user.phoneNumber}</td>
                <td>{user.email}</td>
                <td>{String(user.activeEnrollmentCount)}건</td>
                <td>{String(user.upcomingPracticumCount)}건</td>
                <td>{formatDate(user.joinedAt)}</td>
                <td>
                  {user.active ? (
                    <span className={styles['badgeSuccess']}>활성</span>
                  ) : (
                    <span className={styles['badgeDanger']}>비활성</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEnrollmentTable = (items: AdminEnrollmentListItem[]) => {
    return (
      <div className={styles['tableWrap']}>
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope='col'>회원</th>
              <th scope='col'>프로그램</th>
              <th scope='col'>형태</th>
              <th scope='col'>진도</th>
              <th scope='col'>문제</th>
              <th scope='col'>실습</th>
              <th scope='col'>수강 기간</th>
              <th scope='col'>상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.enrollmentId}>
                <td>
                  <div className={styles['cellStack']}>
                    <strong className={styles['cellPrimary']}>{item.userName}</strong>
                    <span className={styles['cellSecondary']}>
                      {item.loginId} · {item.phoneNumber}
                    </span>
                  </div>
                </td>
                <td>
                  <div className={styles['cellStack']}>
                    <strong className={styles['cellPrimary']}>{item.programTitle}</strong>
                    <span className={styles['cellSecondary']}>ID {String(item.programId)}</span>
                  </div>
                </td>
                <td>{programTypeLabel[item.programType] ?? item.programType}</td>
                <td>
                  {String(item.completionRate)}% · {String(item.completedLectureCount)}/
                  {String(item.totalLectureCount)}강
                </td>
                <td>
                  {String(item.attemptedQuizCount)}/{String(item.totalQuizCount)} 완료
                </td>
                <td>
                  {item.hasPracticumReservation ? (
                    <span className={styles['badgeAccent']}>예약 있음</span>
                  ) : (
                    <span className={styles['badge']}>없음</span>
                  )}
                </td>
                <td>
                  <div className={styles['cellStack']}>
                    <span className={styles['cellSecondary']}>
                      {formatDateTime(item.enrolledAt)}
                    </span>
                    <span className={styles['cellSecondary']}>
                      만료 {formatDateTime(item.expireAt)}
                    </span>
                  </div>
                </td>
                <td>{enrollmentStatusLabel[item.status] ?? item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className={styles['workspace']}>
      <div className={styles['stackList']}>
        <div className={styles['workspaceTabs']}>
          {tabItems.map((tab) => {
            const className =
              tab.id === activeTab ? styles['workspaceTabActive'] : styles['workspaceTab'];

            return (
              <button
                className={className}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                type='button'
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'members' ? (
          <section className={styles['panelWide']}>
            <div className={styles['panelToolbar']}>
              <div>
                <h2 className={styles['panelTitle']}>회원 관리</h2>
                <p className={styles['metaText']}>
                  활성 수강 수와 예정된 하이브리드 실습 예약을 함께 확인합니다.
                </p>
              </div>
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
        ) : null}

        {activeTab === 'enrollments' ? (
          <>
            <div className={styles['contentGrid']}>
              <section className={styles['panel']}>
                <div className={styles['panelToolbar']}>
                  <div>
                    <h2 className={styles['panelTitle']}>회원 찾기</h2>
                    <p className={styles['metaText']}>이름, 아이디, 이메일로 검색</p>
                  </div>
                  <label className={styles['searchField']}>
                    <span className={styles['searchLabel']}>회원 검색</span>
                    <input
                      aria-label='회원 검색'
                      className={styles['searchInput']}
                      onChange={(event) => {
                        setUserKeyword(event.target.value);
                      }}
                      placeholder='최소 2글자 이상 입력'
                      type='search'
                      value={userKeyword}
                    />
                  </label>
                </div>

                {normalizedUserKeyword.length < 2 ? (
                  <p className={styles['helperText']}>회원 검색어를 2글자 이상 입력해 주세요.</p>
                ) : null}
                {usersQuery.isPending ? (
                  <p className={styles['helperText']}>회원 목록을 불러오는 중입니다.</p>
                ) : null}
                {usersQuery.isError ? (
                  <p className={styles['helperText']}>
                    {usersQuery.error instanceof Error
                      ? usersQuery.error.message
                      : '회원 목록을 불러오지 못했습니다.'}
                  </p>
                ) : null}

                {normalizedUserKeyword.length >= 2 &&
                !usersQuery.isPending &&
                !usersQuery.isError ? (
                  <div className={styles['searchResultList']}>
                    {searchedUsers.length ? (
                      searchedUsers.map((user) => {
                        const isSelected = selectedUser?.id === user.id;

                        return (
                          <button
                            className={styles['searchResultCard']}
                            data-selected={isSelected}
                            key={user.id}
                            onClick={() => {
                              setSelectedUser(user);
                            }}
                            type='button'
                          >
                            <div className={styles['searchResultHeader']}>
                              <strong className={styles['cellPrimary']}>{user.displayName}</strong>
                              {user.active ? (
                                <span className={styles['badgeSuccess']}>활성 회원</span>
                              ) : (
                                <span className={styles['badgeDanger']}>비활성 회원</span>
                              )}
                            </div>
                            <div className={styles['cellStack']}>
                              <span className={styles['cellSecondary']}>아이디 {user.loginId}</span>
                              <span className={styles['cellSecondary']}>{user.email}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className={styles['helperText']}>검색 조건에 맞는 회원이 없습니다.</p>
                    )}
                  </div>
                ) : null}
              </section>

              <section className={styles['panel']}>
                <div className={styles['panelToolbar']}>
                  <div>
                    <h2 className={styles['panelTitle']}>프로그램 찾기</h2>
                    <p className={styles['metaText']}>프로그램명 또는 카테고리로 검색</p>
                  </div>
                  <label className={styles['searchField']}>
                    <span className={styles['searchLabel']}>프로그램 검색</span>
                    <input
                      aria-label='프로그램 검색'
                      className={styles['searchInput']}
                      onChange={(event) => {
                        setProgramKeyword(event.target.value);
                      }}
                      placeholder='프로그램명, 카테고리 검색'
                      type='search'
                      value={programKeyword}
                    />
                  </label>
                </div>

                {programsQuery.isPending ? (
                  <p className={styles['helperText']}>프로그램 목록을 불러오는 중입니다.</p>
                ) : null}
                {programsQuery.isError ? (
                  <p className={styles['helperText']}>
                    {programsQuery.error instanceof Error
                      ? programsQuery.error.message
                      : '프로그램 목록을 불러오지 못했습니다.'}
                  </p>
                ) : null}

                {!programsQuery.isPending && !programsQuery.isError ? (
                  <div className={styles['searchResultList']}>
                    {filteredPrograms.length ? (
                      filteredPrograms.map((program) => {
                        const isSelected = selectedProgramId === program.id;

                        return (
                          <button
                            className={styles['searchResultCard']}
                            data-selected={isSelected}
                            key={program.id}
                            onClick={() => {
                              setSelectedProgramId(program.id);
                            }}
                            type='button'
                          >
                            <div className={styles['searchResultHeader']}>
                              <strong className={styles['cellPrimary']}>{program.title}</strong>
                              {renderProgramStatusBadge(program)}
                            </div>
                            <div className={styles['cellStack']}>
                              <span className={styles['cellSecondary']}>
                                {program.categoryName}
                              </span>
                              <span className={styles['cellSecondary']}>
                                ID {String(program.id)}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className={styles['helperText']}>검색 조건에 맞는 프로그램이 없습니다.</p>
                    )}
                  </div>
                ) : null}
              </section>
            </div>

            <section className={styles['panelWide']}>
              <div className={styles['panelHeader']}>
                <h2 className={styles['panelTitle']}>수동 수강 배정</h2>
                <p className={styles['metaText']}>
                  선택한 회원과 프로그램을 확인한 뒤 바로 수강권을 배정합니다.
                </p>
              </div>

              <div className={styles['contentGrid']}>
                <article className={styles['stackItem']}>
                  <div className={styles['metaRow']}>
                    <span className={styles['badgeAccent']}>선택 회원</span>
                  </div>
                  {selectedUser ? (
                    <div className={styles['cellStack']}>
                      <strong className={styles['itemTitle']}>{selectedUser.displayName}</strong>
                      <span className={styles['cellSecondary']}>아이디 {selectedUser.loginId}</span>
                      <span className={styles['cellSecondary']}>{selectedUser.email}</span>
                    </div>
                  ) : (
                    <p className={styles['helperText']}>아직 선택한 회원이 없습니다.</p>
                  )}
                </article>

                <article className={styles['stackItem']}>
                  <div className={styles['metaRow']}>
                    <span className={styles['badgeAccent']}>선택 프로그램</span>
                  </div>
                  {selectedProgram ? (
                    <div className={styles['cellStack']}>
                      <strong className={styles['itemTitle']}>{selectedProgram.title}</strong>
                      <span className={styles['cellSecondary']}>
                        {selectedProgram.categoryName}
                      </span>
                      <span className={styles['cellSecondary']}>
                        ID {String(selectedProgram.id)}
                      </span>
                    </div>
                  ) : (
                    <p className={styles['helperText']}>아직 선택한 프로그램이 없습니다.</p>
                  )}
                </article>
              </div>

              <div className={styles['actionRow']}>
                <Button
                  disabled={enrollMutation.isPending}
                  onClick={handleCreateEnrollment}
                  type='button'
                >
                  {enrollMutation.isPending ? '배정 중...' : '수강 배정'}
                </Button>
              </div>

              {lastEnrollmentResult ? (
                <div className={styles['metaNotice']}>
                  <p className={styles['metaNoticeLabel']}>최근 배정 완료</p>
                  <p className={styles['metaNoticeText']}>
                    {lastEnrollmentResult.programTitle} ·{' '}
                    {formatDateTime(lastEnrollmentResult.enrolledAt)}
                    {lastEnrollmentResult.expireAt
                      ? ` · 만료 ${formatDateTime(lastEnrollmentResult.expireAt)}`
                      : ''}
                  </p>
                </div>
              ) : null}
            </section>

            <section className={styles['panelWide']}>
              <div className={styles['panelToolbar']}>
                <div>
                  <h2 className={styles['panelTitle']}>현재 수강 목록</h2>
                  <p className={styles['metaText']}>
                    회원별 진도, 문제 응시, 실습 예약 여부를 함께 확인합니다.
                  </p>
                </div>
                <label className={styles['searchField']}>
                  <span className={styles['searchLabel']}>수강 검색</span>
                  <input
                    aria-label='수강 검색'
                    className={styles['searchInput']}
                    onChange={(event) => {
                      setEnrollmentKeyword(event.target.value);
                    }}
                    placeholder='회원명, 아이디, 프로그램명 검색'
                    type='search'
                    value={enrollmentKeyword}
                  />
                </label>
              </div>

              {enrollmentsQuery.isPending ? (
                <p className={styles['helperText']}>수강 목록을 불러오는 중입니다.</p>
              ) : null}
              {enrollmentsQuery.isError ? (
                <p className={styles['helperText']}>
                  {enrollmentsQuery.error instanceof Error
                    ? enrollmentsQuery.error.message
                    : '수강 목록을 불러오지 못했습니다.'}
                </p>
              ) : null}
              {enrollmentsQuery.data ? renderEnrollmentTable(enrollmentsQuery.data) : null}
            </section>

            <section className={styles['panelWide']}>
              <div className={styles['panelToolbar']}>
                <div>
                  <h2 className={styles['panelTitle']}>수강 만료 정리</h2>
                  <p className={styles['metaText']}>
                    만료 대상 수강권을 즉시 다시 정리해야 할 때만 사용합니다.
                  </p>
                </div>
                <Button
                  disabled={expireMutation.isPending}
                  onClick={() => {
                    expireMutation.mutate();
                  }}
                  type='button'
                  variant='secondary'
                >
                  {expireMutation.isPending ? '실행 중...' : '만료 정리 실행'}
                </Button>
              </div>

              {lastMaintenanceResult ? (
                <div className={styles['metaNotice']}>
                  <p className={styles['metaNoticeLabel']}>최근 실행 결과</p>
                  <p className={styles['metaNoticeText']}>
                    {formatDateTime(lastMaintenanceResult.processedAt)} ·{' '}
                    {String(lastMaintenanceResult.processedCount)}건 처리
                  </p>
                </div>
              ) : (
                <p className={styles['helperText']}>아직 수동 실행 이력이 없습니다.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default AdminEnrollmentsSection;
