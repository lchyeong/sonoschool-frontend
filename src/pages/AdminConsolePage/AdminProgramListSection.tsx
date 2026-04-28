import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { discardAdminProgramDraft } from '@/api/adminProgramDrafts';
import {
  deleteAdminProgramLive,
  publishAdminProgramLive,
  unpublishAdminProgramLive,
} from '@/api/adminProgramsLive';
import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import {
  adminProgramDraftsQueryKey,
  useAdminProgramDraftsQuery,
} from '@/query/useAdminProgramDraftsQuery';
import {
  adminProgramsLiveQueryKey,
  useAdminProgramsLiveQuery,
} from '@/query/useAdminProgramsLiveQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramDraftSummary } from '@/types/adminProgramDrafts';
import type {
  AdminProgramCatalogStatus,
  AdminProgramListItem,
  AdminProgramType,
} from '@/types/adminProgramsLive';

import styles from './AdminConsolePage.module.scss';

type ProgramVisibilityFilter = 'all' | 'hidden' | 'published';
type ProgramTypeFilter = 'all' | AdminProgramType;
const PROGRAMS_PAGE_SIZE = 12;

const programTypeLabel: Record<AdminProgramType, string> = {
  HYBRID: '하이브리드',
  OFFLINE: '오프라인',
  ONLINE: '온라인',
  PROBLEM_SOLVING: '문제풀이',
};

const catalogStatusLabel: Record<AdminProgramCatalogStatus, string> = {
  CLOSED: '판매 종료',
  FULL: '정원 마감',
  OPEN: '판매중',
  SCHEDULED: '판매 예정',
  STARTED: '개강됨',
};

const formatStudentCountLabel = (item: AdminProgramListItem): string => {
  const activeEnrollmentCount = item.activeEnrollmentCount ?? item.currentStudents;

  if (item.programType === 'OFFLINE' && item.maxStudents !== null) {
    return `${String(activeEnrollmentCount)} / ${String(item.maxStudents)}`;
  }

  return `${String(activeEnrollmentCount)}명`;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    currency: 'KRW',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const buildProgramVisibilityLabel = (item: AdminProgramListItem): string => {
  return item.published ? '공개중' : '숨김';
};

const buildProgramWarningLabel = (
  item: AdminProgramListItem,
): {
  label: string;
  reason: string | null;
} | null => {
  if (item.operationStatus === 'CLOSURE_CONFIRMED') {
    return {
      label: '폐강',
      reason: item.closedAt ? `폐강 ${formatDate(item.closedAt)}` : null,
    };
  }

  return null;
};

const visibilityOptions = [
  { value: 'all', label: '전체' },
  { value: 'published', label: '공개중' },
  { value: 'hidden', label: '숨김' },
] as const;

const typeOptions = [
  { value: 'all', label: '전체' },
  { value: 'ONLINE', label: '온라인' },
  { value: 'OFFLINE', label: '오프라인' },
  { value: 'HYBRID', label: '하이브리드' },
] as const;

const confirmProgramDelete = (): boolean => {
  return window.confirm(
    '프로그램을 삭제하면 되돌릴 수 없습니다.\n강의 구성이나 수강 이력이 있는 프로그램은 삭제가 실패할 수 있습니다.\n계속하시겠습니까?',
  );
};

const confirmDraftDelete = (draft: AdminProgramDraftSummary): boolean => {
  const title = draft.titlePreview?.trim() || `제목 없는 초안 #${String(draft.id)}`;
  return window.confirm(`'${title}' 초안을 삭제하면 복구할 수 없습니다.\n계속하시겠습니까?`);
};

const isProgramDeletable = (item: AdminProgramListItem): boolean => item.deletable !== false;

const buildDraftContinuePath = (draft: AdminProgramDraftSummary): string => {
  const search = `?draftId=${String(draft.id)}`;
  if (draft.finalProgramId !== null) {
    return `${routePaths.adminProgramEdit(String(draft.finalProgramId))}${search}`;
  }
  return `${routePaths.adminProgramCreate}${search}`;
};

const AdminProgramListSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const programsQuery = useAdminProgramsLiveQuery();
  const draftsQuery = useAdminProgramDraftsQuery();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<ProgramVisibilityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ProgramTypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const refreshPrograms = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminProgramsLiveQueryKey(),
    });
  };

  const refreshDrafts = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminProgramDraftsQueryKey(),
    });
  };

  const publishMutation = useMutation({
    mutationFn: (programId: number) => publishAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 공개 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPrograms();
      showToast({
        message: '프로그램을 공개했습니다.',
        variant: 'success',
      });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (programId: number) => unpublishAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 숨김 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPrograms();
      showToast({
        message: '프로그램을 숨김 처리했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (programId: number) => deleteAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPrograms();
      showToast({
        message: '프로그램을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: number) => discardAdminProgramDraft(draftId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '초안 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshDrafts();
      showToast({
        message: '초안을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const filteredItems = useMemo(() => {
    const items = programsQuery.data ?? [];
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    return items.filter((item) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [item.title, item.categoryName].join(' ').toLowerCase().includes(normalizedKeyword);
      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'published' && item.published) ||
        (visibilityFilter === 'hidden' && !item.published);
      const matchesType = typeFilter === 'all' || item.programType === typeFilter;

      return matchesKeyword && matchesVisibility && matchesType;
    });
  }, [programsQuery.data, searchKeyword, typeFilter, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PROGRAMS_PAGE_SIZE));
  const currentPageIndex = Math.min(currentPage, totalPages - 1);
  const paginatedItems = useMemo(() => {
    const startIndex = currentPageIndex * PROGRAMS_PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PROGRAMS_PAGE_SIZE);
  }, [currentPageIndex, filteredItems]);
  const visibleStart = filteredItems.length === 0 ? 0 : currentPageIndex * PROGRAMS_PAGE_SIZE + 1;
  const visibleEnd = Math.min(filteredItems.length, (currentPageIndex + 1) * PROGRAMS_PAGE_SIZE);
  const pageNumbers = useMemo(() => {
    const startPage = Math.max(0, currentPageIndex - 2);
    const endPage = Math.min(totalPages, startPage + 5);
    return Array.from({ length: endPage - startPage }, (_, index) => startPage + index);
  }, [currentPageIndex, totalPages]);
  const createDrafts = useMemo(
    () => (draftsQuery.data ?? []).filter((draft) => draft.finalProgramId === null),
    [draftsQuery.data],
  );

  return (
    <section className={styles['workspace']}>
      <header className={styles['pageHeader']}>
        <h1 className={styles['pageTitle']}>프로그램 관리</h1>
      </header>

      <div className={styles['listFrame']}>
        {!draftsQuery.isPending && !draftsQuery.isError && createDrafts.length > 0 ? (
          <section className={styles['listPanel']}>
            <div className={styles['listPanelHeader']}>
              <p className={styles['listPanelMeta']}>진행 중 초안</p>
            </div>

            <div className={styles['draftList']}>
              {createDrafts.map((draft: AdminProgramDraftSummary) => (
                <article className={styles['draftRow']} key={draft.id}>
                  <div className={styles['draftTitleCell']}>
                    <strong className={styles['draftTitle']}>
                      {draft.titlePreview?.trim() || `제목 없는 초안 #${String(draft.id)}`}
                    </strong>
                    <span className={styles['draftMeta']}>
                      신규 등록 초안 · 마지막 저장 {formatDate(draft.updatedAt)}
                    </span>
                  </div>
                  <div className={styles['draftActionGroup']}>
                    <Button
                      onClick={() => {
                        void navigate(buildDraftContinuePath(draft));
                      }}
                      type='button'
                      variant='secondary'
                    >
                      이어서 작성
                    </Button>
                    <Button
                      disabled={deleteDraftMutation.isPending}
                      onClick={() => {
                        if (!confirmDraftDelete(draft)) {
                          return;
                        }
                        deleteDraftMutation.mutate(draft.id);
                      }}
                      type='button'
                      variant='danger'
                    >
                      삭제
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className={`${styles['toolbar']} ${styles['programToolbar']}`}>
          <div className={styles['toolbarFilters']}>
            <div className={styles['toolbarFilterRow']}>
              <div className={styles['toolbarSearchField']}>
                <UnifiedSearchBar
                  className={styles['adminSearchBarWide']}
                  inputAriaLabel='프로그램 검색'
                  onChange={(nextValue) => {
                    setCurrentPage(0);
                    setSearchKeyword(nextValue);
                  }}
                  onSubmit={() => undefined}
                  placeholder='프로그램명, 카테고리로 검색'
                  value={searchKeyword}
                />
              </div>

              <div className={styles['toolbarDropdownRow']}>
                <AdminDropdownField
                  compact
                  label='공개 상태'
                  onChange={(nextValue) => {
                    setCurrentPage(0);
                    setVisibilityFilter(nextValue as ProgramVisibilityFilter);
                  }}
                  options={visibilityOptions}
                  value={visibilityFilter}
                />
                <AdminDropdownField
                  compact
                  label='프로그램 형태'
                  onChange={(nextValue) => {
                    setCurrentPage(0);
                    setTypeFilter(nextValue as ProgramTypeFilter);
                  }}
                  options={typeOptions}
                  value={typeFilter}
                />
              </div>
            </div>
          </div>

          <div className={styles['toolbarAction']}>
            <Button
              onClick={() => {
                void navigate(routePaths.adminProgramCreate);
              }}
              type='button'
            >
              새 프로그램 등록
            </Button>
          </div>
        </div>

        {programsQuery.isPending ? (
          <section aria-busy='true' className={styles['stateSection']}>
            <h2 className={styles['stateTitle']}>프로그램 목록을 불러오는 중입니다.</h2>
            <p className={styles['stateDescription']}>
              프로그램 관리 API 응답을 확인하고 있습니다.
            </p>
          </section>
        ) : null}

        {programsQuery.isError ? (
          <section className={styles['stateSection']}>
            <h2 className={styles['stateTitle']}>프로그램 목록을 불러오지 못했습니다.</h2>
            <p className={styles['stateDescription']}>
              {programsQuery.error instanceof Error
                ? programsQuery.error.message
                : '프로그램 목록 조회에 실패했습니다.'}
            </p>
          </section>
        ) : null}

        {!programsQuery.isPending && !programsQuery.isError ? (
          <div className={styles['listPanel']}>
            <div className={styles['listPanelHeader']}>
              <p className={styles['listPanelMeta']}>
                {`총 ${String(filteredItems.length)}개 중 ${String(visibleStart)}-${String(visibleEnd)}개`}
              </p>
            </div>

            <div className={styles['tableWrap']}>
              <table className={`${styles['table']} ${styles['programTable']}`}>
                <thead>
                  <tr>
                    <th scope='col'>프로그램명</th>
                    <th scope='col'>카테고리</th>
                    <th scope='col'>형태</th>
                    <th scope='col'>가격</th>
                    <th scope='col'>수강생</th>
                    <th scope='col'>판매 상태</th>
                    <th scope='col'>공개 상태</th>
                    <th scope='col'>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => {
                    const deleteBlockedReason = item.deleteBlockedReason ?? undefined;
                    const deletable = isProgramDeletable(item);
                    const warning = buildProgramWarningLabel(item);

                    return (
                      <tr
                        className={warning ? styles['programRowWarning'] : undefined}
                        key={item.id}
                      >
                        <td>
                          <div className={styles['cellStack']}>
                            {warning ? (
                              <div className={styles['metaRow']}>
                                <span
                                  className={styles['badgeDanger']}
                                  title={warning.reason ?? undefined}
                                >
                                  {warning.label}
                                </span>
                              </div>
                            ) : null}
                            <strong className={styles['cellPrimary']}>{item.title}</strong>
                            {warning?.reason ? (
                              <span className={styles['cellSecondary']}>{warning.reason}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>{item.categoryName}</td>
                        <td>{programTypeLabel[item.programType]}</td>
                        <td>
                          <div className={styles['cellStack']}>
                            <span className={styles['cellPrimary']}>
                              {formatCurrency(item.salePrice ?? item.price)}
                            </span>
                            {item.salePrice !== null ? (
                              <span className={styles['cellSecondary']}>
                                정가 {formatCurrency(item.price)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className={styles['cellStack']}>
                            <span className={`${styles['cellPrimary']} ${styles['cellNumeric']}`}>
                              {formatStudentCountLabel(item)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles['cellStack']}>
                            <div className={styles['metaRow']}>
                              <span className={styles['badgeAccent']}>
                                {catalogStatusLabel[item.catalogStatus]}
                              </span>
                            </div>
                            <span
                              className={`${styles['cellSecondary']} ${styles['programStatusPeriod']}`}
                            >
                              <span className={styles['cellNumeric']}>
                                {formatDate(item.saleStartAt)}
                              </span>
                              <span aria-hidden='true'>~</span>
                              <span className={styles['cellNumeric']}>
                                {formatDate(item.saleEndAt)}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={item.published ? styles['badgeSuccess'] : styles['badge']}
                          >
                            {buildProgramVisibilityLabel(item)}
                          </span>
                        </td>
                        <td>
                          <div className={styles['tableActionGroup']}>
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                void navigate(routePaths.adminProgramEdit(String(item.id)));
                              }}
                              type='button'
                            >
                              수정
                            </button>
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                void navigate(routePaths.adminProgramDuplicate(String(item.id)));
                              }}
                              type='button'
                            >
                              복제
                            </button>
                            {item.published ? (
                              <button
                                className={styles['tableActionButton']}
                                onClick={() => {
                                  hideMutation.mutate(item.id);
                                }}
                                type='button'
                              >
                                숨김
                              </button>
                            ) : (
                              <button
                                className={styles['tableActionButton']}
                                onClick={() => {
                                  publishMutation.mutate(item.id);
                                }}
                                type='button'
                              >
                                공개
                              </button>
                            )}
                            <button
                              className={styles['tableActionButtonDanger']}
                              disabled={!deletable}
                              onClick={() => {
                                if (!confirmProgramDelete()) {
                                  return;
                                }
                                deleteMutation.mutate(item.id);
                              }}
                              title={deleteBlockedReason}
                              type='button'
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles['paginationBar']}>
              <div className={styles['paginationNumbers']}>
                <button
                  aria-label='이전 페이지'
                  className={styles['paginationArrowButton']}
                  disabled={currentPageIndex === 0}
                  onClick={() => {
                    setCurrentPage(Math.max(0, currentPageIndex - 1));
                  }}
                  type='button'
                >
                  <img
                    alt=''
                    aria-hidden='true'
                    className={`${styles['paginationArrow']} ${styles['paginationArrowPrev']}`}
                    src={rightArrowIconSrc}
                  />
                </button>

                {pageNumbers.map((pageNumber) => (
                  <button
                    aria-current={pageNumber === currentPageIndex ? 'page' : undefined}
                    className={
                      pageNumber === currentPageIndex
                        ? styles['paginationButtonActive']
                        : styles['paginationButton']
                    }
                    key={`program-page-${String(pageNumber)}`}
                    onClick={() => {
                      setCurrentPage(pageNumber);
                    }}
                    type='button'
                  >
                    {String(pageNumber + 1)}
                  </button>
                ))}

                <button
                  aria-label='다음 페이지'
                  className={styles['paginationArrowButton']}
                  disabled={currentPageIndex >= totalPages - 1}
                  onClick={() => {
                    setCurrentPage(Math.min(totalPages - 1, currentPageIndex + 1));
                  }}
                  type='button'
                >
                  <img
                    alt=''
                    aria-hidden='true'
                    className={styles['paginationArrow']}
                    src={rightArrowIconSrc}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!programsQuery.isPending && !programsQuery.isError && filteredItems.length === 0 ? (
        <p className={styles['helperText']}>선택한 조건에 맞는 강의가 없습니다.</p>
      ) : null}
    </section>
  );
};

export default AdminProgramListSection;
