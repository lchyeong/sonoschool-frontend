import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { discardAdminProgramDraft } from '@/api/adminProgramDrafts';
import {
  deleteAdminProgramLive,
  featureAdminProgramOnHome,
  publishAdminProgramLive,
  unfeatureAdminProgramOnHome,
  unpublishAdminProgramLive,
} from '@/api/adminProgramsLive';
import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import checkIconSrc from '@/assets/icons/lucide_check.svg';
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
import { homeHeroSlidesQueryKey } from '@/query/useHomeHeroSlidesQuery';
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
  HYBRID: '실습예약 프로그램',
  OFFLINE: '오프라인',
  ONLINE: '온라인',
  PROBLEM_SOLVING: '문제풀이',
};

const catalogStatusLabel: Record<AdminProgramCatalogStatus, string> = {
  CLOSED: '판매 종료',
  ENDED: '과정 종료',
  FULL: '정원 마감',
  OPEN: '판매중',
  STARTED: '개강됨',
};

const formatStudentCountLabel = (item: AdminProgramListItem): string => {
  const confirmedEnrollmentCount = item.currentStudents;

  if (item.programType === 'OFFLINE' && item.maxStudents !== null) {
    return `${String(confirmedEnrollmentCount)} / ${String(item.maxStudents)}`;
  }

  return `${String(confirmedEnrollmentCount)}명`;
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

const formatSalePeriod = (startAt: string | null, endAt: string | null): string | null => {
  if (startAt && endAt) {
    return `${formatDate(startAt)} ~ ${formatDate(endAt)}`;
  }

  if (startAt) {
    return `${formatDate(startAt)}부터`;
  }

  if (endAt) {
    return `${formatDate(endAt)}까지`;
  }

  return null;
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
  { value: 'HYBRID', label: '실습예약 프로그램' },
] as const;

const confirmProgramDelete = (): boolean => {
  return window.confirm(
    '프로그램을 삭제하면 되돌릴 수 없습니다.\n커리큘럼, 결제/수강 등록 이력, 리뷰 또는 공지사항이 연결된 프로그램은 삭제가 실패할 수 있습니다.\n계속하시겠습니까?',
  );
};

const confirmEndedProgramEdit = (): boolean => {
  return window.confirm(
    "종료된 프로그램의 수강 기간을 연장하면 기존 만료 수강권이 다시 활성화될 수 있습니다.\n새 기수 모집은 '새 기수로 복제'를 이용해 주세요.\n기존 프로그램을 수정하시겠습니까?",
  );
};

const confirmDraftDelete = (draft: AdminProgramDraftSummary): boolean => {
  const title = draft.titlePreview?.trim() || `제목 없는 초안 #${String(draft.id)}`;
  return window.confirm(`'${title}' 초안을 삭제하면 복구할 수 없습니다.\n계속하시겠습니까?`);
};

const isProgramDeletable = (item: AdminProgramListItem): boolean => item.deletable !== false;

const buildProgramDeleteBlockedMessage = (item: AdminProgramListItem): string => {
  return item.deleteBlockedReason?.trim() || '현재 상태에서는 프로그램을 삭제할 수 없습니다.';
};

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
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminProgramsLiveQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: homeHeroSlidesQueryKey(),
      }),
    ]);
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

  const homeFeatureMutation = useMutation({
    mutationFn: ({ featured, programId }: { featured: boolean; programId: number }) =>
      featured ? featureAdminProgramOnHome(programId) : unfeatureAdminProgramOnHome(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '메인 슬라이드 노출 변경에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await refreshPrograms();
      showToast({
        message: variables.featured
          ? '메인 슬라이드에 노출합니다.'
          : '메인 슬라이드 노출을 해제했습니다.',
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
  const activeDrafts = draftsQuery.data ?? [];

  return (
    <section className={styles['workspace']}>
      <header className={styles['pageHeader']}>
        <h1 className={styles['pageTitle']}>프로그램 관리</h1>
      </header>

      <div className={styles['listFrame']}>
        {!draftsQuery.isPending && !draftsQuery.isError && activeDrafts.length > 0 ? (
          <section className={styles['listPanel']}>
            <div className={styles['listPanelHeader']}>
              <p className={styles['listPanelMeta']}>진행 중 초안</p>
            </div>

            <div className={styles['draftList']}>
              {activeDrafts.map((draft: AdminProgramDraftSummary) => (
                <article className={styles['draftRow']} key={draft.id}>
                  <div className={styles['draftTitleCell']}>
                    <div className={styles['draftTitleRow']}>
                      <span
                        className={styles['draftTypeBadge']}
                        data-type={draft.finalProgramId === null ? 'create' : 'edit'}
                      >
                        {draft.finalProgramId === null ? '신규' : '수정'}
                      </span>
                      <strong className={styles['draftTitle']}>
                        {draft.titlePreview?.trim() || `제목 없는 초안 #${String(draft.id)}`}
                      </strong>
                    </div>
                    <span className={styles['draftMeta']}>
                      {draft.finalProgramId === null
                        ? '신규 등록 초안'
                        : `프로그램 #${String(draft.finalProgramId)} 수정 초안`}{' '}
                      · 마지막 저장 {formatDate(draft.updatedAt)}
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
                    <th scope='col'>확정 수강생</th>
                    <th scope='col'>판매 상태</th>
                    <th className={styles['programFeatureHeader']} scope='col'>
                      메인 슬라이드
                    </th>
                    <th scope='col'>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => {
                    const deleteBlockedReason = item.deleteBlockedReason ?? undefined;
                    const deletable = isProgramDeletable(item);
                    const salePeriodLabel = formatSalePeriod(item.saleStartAt, item.saleEndAt);
                    const warning = buildProgramWarningLabel(item);

                    return (
                      <tr
                        className={warning ? styles['programRowWarning'] : undefined}
                        key={item.id}
                      >
                        <td>
                          <div className={styles['cellStack']}>
                            <div className={styles['metaRow']}>
                              <span
                                className={
                                  item.published ? styles['badgeSuccess'] : styles['badge']
                                }
                              >
                                {buildProgramVisibilityLabel(item)}
                              </span>
                              {warning ? (
                                <span
                                  className={styles['badgeDanger']}
                                  title={warning.reason ?? undefined}
                                >
                                  {warning.label}
                                </span>
                              ) : null}
                            </div>
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
                            {salePeriodLabel ? (
                              <span
                                className={`${styles['cellSecondary']} ${styles['programStatusPeriod']}`}
                              >
                                {salePeriodLabel}
                              </span>
                            ) : null}
                            {item.catalogStatus === 'ENDED' ? (
                              <span className={styles['cellSecondary']}>
                                새 모집은 ‘새 기수로 복제’를 이용해 주세요.
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <label
                            className={`${styles['checkboxRow']} ${styles['noticeCheckboxRow']} ${styles['programFeatureCheckbox']}`}
                          >
                            <input
                              aria-label={`메인 슬라이드 노출 ${item.featured ? '선택됨' : '미선택'}`}
                              checked={item.featured}
                              disabled={!item.published || homeFeatureMutation.isPending}
                              onChange={(event) => {
                                homeFeatureMutation.mutate({
                                  featured: event.currentTarget.checked,
                                  programId: item.id,
                                });
                              }}
                              type='checkbox'
                            />
                            <span className={styles['noticeCheckboxBox']} aria-hidden='true'>
                              {item.featured ? <img alt='' src={checkIconSrc} /> : null}
                            </span>
                            <span>노출</span>
                          </label>
                        </td>
                        <td>
                          <div className={styles['tableActionGroup']}>
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                if (item.catalogStatus === 'ENDED' && !confirmEndedProgramEdit()) {
                                  return;
                                }
                                void navigate(routePaths.adminProgramEdit(String(item.id)));
                              }}
                              title={
                                item.catalogStatus === 'ENDED'
                                  ? '기존 기수의 기간을 연장하면 만료 수강생이 다시 활성화됩니다.'
                                  : undefined
                              }
                              type='button'
                            >
                              수정
                            </button>
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                void navigate(routePaths.adminProgramDuplicate(String(item.id)));
                              }}
                              title={
                                item.catalogStatus === 'ENDED'
                                  ? '새 기수 모집은 기존 프로그램을 복제해 시작하세요.'
                                  : '기존 프로그램을 복제합니다.'
                              }
                              type='button'
                            >
                              {item.catalogStatus === 'ENDED' ? '새 기수로 복제' : '복제'}
                            </button>
                            {item.published ? (
                              <button
                                className={styles['tableActionButton']}
                                onClick={() => {
                                  hideMutation.mutate(item.id);
                                }}
                                title='클릭하면 숨김 처리합니다.'
                                type='button'
                              >
                                공개
                              </button>
                            ) : (
                              <button
                                className={styles['tableActionButton']}
                                onClick={() => {
                                  publishMutation.mutate(item.id);
                                }}
                                title='클릭하면 공개 처리합니다.'
                                type='button'
                              >
                                숨김
                              </button>
                            )}
                            <button
                              className={styles['tableActionButtonDanger']}
                              aria-disabled={!deletable}
                              onClick={() => {
                                if (!deletable) {
                                  showToast({
                                    message: buildProgramDeleteBlockedMessage(item),
                                    variant: 'error',
                                  });
                                  return;
                                }
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
