import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { deleteAdminResource } from '@/api/adminResources';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import Pagination from '@/components/ui/Pagination/Pagination';
import { adminResourcesQueryKey, useAdminResourcesQuery } from '@/query/useAdminResourcesQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';

import styles from './AdminConsolePage.module.scss';
import { formatFileSizeLabel } from './adminConsolePageShared';

const RESOURCES_PAGE_SIZE = 8;

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
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
      <section className={styles['panelWide']}>
        <div className={styles['resourceToolbar']}>
          <div className={styles['resourceSearchGroup']}>
            <p className={styles['metaText']}>총 {filteredResources.length}개</p>
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
          </div>
          <Button
            onClick={() => {
              void navigate(routePaths.adminResourceCreate);
            }}
            type='button'
          >
            새 자료 등록
          </Button>
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
              <div className={styles['qnaPagination']}>
                <Pagination
                  ariaLabel='자료실 페이지 이동'
                  currentPage={safeCurrentPage}
                  onChange={setCurrentPage}
                  totalPages={totalPages}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </section>
  );
};

export default AdminResourcesSection;
