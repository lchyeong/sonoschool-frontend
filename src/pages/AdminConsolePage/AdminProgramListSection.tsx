import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  deleteAdminProgramLive,
  hideAdminProgramLive,
  publishAdminProgramLive,
} from '@/api/adminProgramsLive';
import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { adminProgramsLiveQueryKey, useAdminProgramsLiveQuery } from '@/query/useAdminProgramsLiveQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
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
};

const catalogStatusLabel: Record<AdminProgramCatalogStatus, string> = {
  CLOSED: '판매 종료',
  FULL: '정원 마감',
  OPEN: '판매중',
  SCHEDULED: '판매 예정',
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
    '강의를 삭제하면 되돌릴 수 없습니다.\n커리큘럼이나 수강 이력이 있는 강의는 삭제가 실패할 수 있습니다.\n계속하시겠습니까?',
  );
};

const isProgramDeletable = (item: AdminProgramListItem): boolean => item.deletable !== false;

const AdminProgramListSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const programsQuery = useAdminProgramsLiveQuery();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<ProgramVisibilityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ProgramTypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const refreshPrograms = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminProgramsLiveQueryKey(),
    });
  };

  const publishMutation = useMutation({
    mutationFn: (programId: number) => publishAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 공개 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPrograms();
      showToast({
        message: '강의를 공개했습니다.',
        variant: 'success',
      });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (programId: number) => hideAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 숨김 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPrograms();
      showToast({
        message: '강의를 숨김 처리했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (programId: number) => deleteAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPrograms();
      showToast({
        message: '강의를 삭제했습니다.',
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
        [item.title, item.categoryName, item.instructorName ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword);
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

  return (
    <section className={styles['workspace']}>
      <header className={styles['pageHeader']}>
        <h1 className={styles['pageTitle']}>강의 관리</h1>
      </header>

      <div className={styles['listFrame']}>
        <div className={styles['toolbar']}>
          <div className={styles['toolbarFilters']}>
            <div className={styles['toolbarFilterRow']}>
              <div className={styles['toolbarSearchField']}>
                <TextField
                  label='강의 검색'
                  name='programSearch'
                  onChange={(event) => {
                    setCurrentPage(0);
                    setSearchKeyword(event.target.value);
                  }}
                  placeholder='강의명, 카테고리, 강사명으로 검색'
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
                  label='강의 형태'
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
              새 강의 등록
            </Button>
          </div>
        </div>

        {programsQuery.isPending ? (
          <section aria-busy='true' className={styles['stateSection']}>
            <h2 className={styles['stateTitle']}>강의 목록을 불러오는 중입니다.</h2>
            <p className={styles['stateDescription']}>강의 관리 API 응답을 확인하고 있습니다.</p>
          </section>
        ) : null}

        {programsQuery.isError ? (
          <section className={styles['stateSection']}>
            <h2 className={styles['stateTitle']}>강의 목록을 불러오지 못했습니다.</h2>
            <p className={styles['stateDescription']}>
              {programsQuery.error instanceof Error
                ? programsQuery.error.message
                : '강의 목록 조회에 실패했습니다.'}
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
              <table className={styles['table']}>
                <thead>
                  <tr>
                    <th scope='col'>강의명</th>
                    <th scope='col'>카테고리</th>
                    <th scope='col'>형태</th>
                    <th scope='col'>가격</th>
                    <th scope='col'>정원</th>
                    <th scope='col'>판매 상태</th>
                    <th scope='col'>공개 상태</th>
                    <th scope='col'>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => {
                    const deleteBlockedReason = item.deleteBlockedReason ?? undefined;
                    const deletable = isProgramDeletable(item);

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong className={styles['cellPrimary']}>{item.title}</strong>
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
                          {item.maxStudents === null
                            ? '제한 없음'
                            : `${String(item.currentStudents)} / ${String(item.maxStudents)}`}
                        </td>
                        <td>
                          <div className={styles['cellStack']}>
                            <span className={styles['cellPrimary']}>
                              {catalogStatusLabel[item.catalogStatus]}
                            </span>
                            <span
                              className={`${styles['cellSecondary']} ${styles['cellSecondaryInline']}`}
                            >
                              {formatDate(item.saleStartAt)} ~ {formatDate(item.saleEndAt)}
                            </span>
                          </div>
                        </td>
                        <td>{buildProgramVisibilityLabel(item)}</td>
                        <td>
                          <div className={styles['tableActionGroup']}>
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                void navigate(routePaths.adminProgramEdit(String(item.id)));
                              }}
                              type='button'
                            >
                              편집
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
