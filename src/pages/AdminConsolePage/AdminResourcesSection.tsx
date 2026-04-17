import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { deleteAdminResource } from '@/api/adminResources';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import { adminResourcesQueryKey, useAdminResourcesQuery } from '@/query/useAdminResourcesQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';

import styles from './AdminConsolePage.module.scss';
import { formatFileSizeLabel } from './adminConsolePageShared';

const RESOURCES_PAGE_SIZE = 8;

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const AdminResourcesSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const resourcesQuery = useAdminResourcesQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());

  const globalResources = useMemo(() => {
    return (resourcesQuery.data ?? []).filter((resource) => resource.scope === 'GLOBAL');
  }, [resourcesQuery.data]);

  const filteredResources = useMemo(() => {
    if (!deferredSearchTerm) {
      return globalResources;
    }

    return globalResources.filter((resource) => {
      return [resource.title, resource.fileName].some((value) =>
        value.toLowerCase().includes(deferredSearchTerm),
      );
    });
  }, [deferredSearchTerm, globalResources]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / RESOURCES_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedResources = filteredResources.slice(
    (safeCurrentPage - 1) * RESOURCES_PAGE_SIZE,
    safeCurrentPage * RESOURCES_PAGE_SIZE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const refreshResources = async () => {
    await queryClient.invalidateQueries({ queryKey: adminResourcesQueryKey() });
  };

  const deleteMutation = useMutation({
    mutationFn: (resourceId: number) => deleteAdminResource(resourceId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshResources();
      showToast({
        message: '자료를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  return (
    <section className={styles['workspace']}>
      <section className={styles['summaryGrid']}>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>전체 자료실 자료</p>
          <strong className={styles['summaryValue']}>{String(globalResources.length)}개</strong>
          <p className={styles['summaryDescription']}>이 화면에서는 전체 공개 자료만 관리합니다.</p>
        </article>
        <article className={styles['summaryCard']} data-tone='accent'>
          <p className={styles['summaryLabel']}>검색 결과</p>
          <strong className={styles['summaryValue']}>{String(filteredResources.length)}개</strong>
          <p className={styles['summaryDescription']}>자료명과 파일명 기준으로 빠르게 찾습니다.</p>
        </article>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>프로그램 내부 자료</p>
          <strong className={styles['summaryValue']}>별도 관리</strong>
          <p className={styles['summaryDescription']}>
            프로그램 자료는 프로그램 등록/수정 화면에서만 관리합니다.
          </p>
        </article>
      </section>

      <section className={styles['panelWide']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h2 className={styles['panelTitle']}>전체 공개 자료 목록</h2>
            <p className={styles['metaText']}>자료 수정은 별도 페이지에서 처리합니다.</p>
          </div>

          <div className={styles['editorToolbarActions']}>
            <UnifiedSearchBar
              className={styles['adminSearchBar']}
              inputAriaLabel='자료 검색'
              onChange={(nextValue) => {
                setSearchTerm(nextValue);
                setCurrentPage(1);
              }}
              onSubmit={() => undefined}
              placeholder='자료명, 파일명 검색'
              value={searchTerm}
            />
            <Button
              onClick={() => {
                void navigate(routePaths.adminResourceCreate);
              }}
              type='button'
            >
              새 자료 등록
            </Button>
          </div>
        </div>

        {resourcesQuery.isPending ? (
          <p className={styles['helperText']}>자료 목록을 불러오는 중입니다.</p>
        ) : null}
        {resourcesQuery.isError ? (
          <p className={styles['helperText']}>
            {resourcesQuery.error instanceof Error
              ? resourcesQuery.error.message
              : '자료 목록을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!resourcesQuery.isPending && !resourcesQuery.isError ? (
          <>
            <div className={styles['tableWrap']}>
              <table className={`${styles['table']} ${styles['resourceTable']}`}>
                <thead>
                  <tr>
                    <th scope='col'>자료명</th>
                    <th scope='col'>파일</th>
                    <th scope='col'>정렬</th>
                    <th scope='col'>등록일</th>
                    <th scope='col'>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedResources.length > 0 ? (
                    pagedResources.map((resource) => {
                      return (
                        <tr key={resource.id}>
                          <td>{resource.title}</td>
                          <td>
                            <div className={styles['stackListCompact']}>
                              <span>{resource.fileName}</span>
                              <span className={styles['metaText']}>
                                {formatFileSizeLabel(resource.fileSize)}
                              </span>
                            </div>
                          </td>
                          <td>{resource.sortOrder}</td>
                          <td>{formatDateTime(resource.createdAt)}</td>
                          <td>
                            <div className={styles['tableActionGroup']}>
                              <button
                                className={styles['tableActionButton']}
                                onClick={() => {
                                  void navigate(routePaths.adminResourceEdit(String(resource.id)));
                                }}
                                type='button'
                              >
                                수정
                              </button>
                              <button
                                className={styles['tableActionButtonDanger']}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      '자료를 삭제하면 되돌릴 수 없습니다. 계속하시겠습니까?',
                                    )
                                  ) {
                                    return;
                                  }

                                  deleteMutation.mutate(resource.id);
                                }}
                                type='button'
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['helperText']} colSpan={5}>
                        검색 조건에 맞는 자료가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredResources.length > RESOURCES_PAGE_SIZE ? (
              <div className={styles['paginationBar']}>
                <button
                  className={styles['paginationButton']}
                  disabled={safeCurrentPage === 1}
                  onClick={() => {
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  type='button'
                >
                  이전
                </button>

                <div className={styles['paginationNumbers']}>
                  {pageNumbers.map((pageNumber) => (
                    <button
                      className={
                        pageNumber === safeCurrentPage
                          ? styles['paginationButtonActive']
                          : styles['paginationButton']
                      }
                      key={pageNumber}
                      onClick={() => {
                        setCurrentPage(pageNumber);
                      }}
                      type='button'
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  className={styles['paginationButton']}
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  type='button'
                >
                  다음
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </section>
  );
};

export default AdminResourcesSection;
