import { useEffect, useMemo, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { fetchGlobalResourceDownload } from '@/api/resources';
import { useGlobalResourcesQuery } from '@/query/useResourceQueries';
import { useToastStore } from '@/stores/useToastStore';

import styles from './ResourcesPage.module.scss';

const PAGE_SIZE = 6;

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
  }).format(new Date(value));
};

const formatFileSize = (value: number): string => {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)}MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)}KB`;
  }

  return `${value}B`;
};

const buildPreview = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 84) {
    return normalized;
  }

  return `${normalized.slice(0, 84)}...`;
};

const ResourcesPage = () => {
  const showToast = useToastStore((state) => state.showToast);
  const resourcesQuery = useGlobalResourcesQuery();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const resources = resourcesQuery.data ?? [];

  const filteredResources = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return resources;
    }

    return resources.filter((resource) => {
      return [resource.title, resource.description, resource.fileName].some((field) => {
        return field.toLowerCase().includes(normalizedSearchTerm);
      });
    });
  }, [resources, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const downloadMutation = useMutation({
    mutationFn: fetchGlobalResourceDownload,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료 다운로드에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (download) => {
      window.open(download.downloadUrl, '_blank', 'noopener,noreferrer');
    },
  });

  const handleDownload = async (resourceId: number) => {
    setDownloadingId(resourceId);

    try {
      await downloadMutation.mutateAsync(resourceId);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={styles['page']}>
      <div className={styles['boardHeader']}>
        <div className={styles['boardTitleBlock']}>
          <p className={styles['boardEyebrow']}>SONOSCHOOL RESOURCES</p>
          <h1 className={styles['boardTitle']}>자료실</h1>
        </div>
        <p className={styles['boardSummary']}>
          총 {String(resources.length)}건 중 검색 결과 {String(filteredResources.length)}건
        </p>
      </div>

      <section className={styles['boardShell']}>
        <div className={styles['toolbar']}>
          <form
            className={styles['searchForm']}
            onSubmit={(event) => {
              event.preventDefault();
              setSearchTerm(searchInput);
              setCurrentPage(1);
            }}
          >
            <select
              aria-label='자료 범위 필터'
              className={styles['filterSelect']}
              defaultValue='all'
            >
              <option value='all'>전체</option>
            </select>

            <input
              className={styles['searchInput']}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              placeholder='제목, 설명, 파일명을 검색해 주세요.'
              type='search'
              value={searchInput}
            />

            <button className={styles['searchButton']} type='submit'>
              검색
            </button>
          </form>
        </div>

        {resourcesQuery.isPending ? (
          <div aria-busy='true' className={styles['stateBox']}>
            자료실을 불러오는 중입니다.
          </div>
        ) : null}

        {resourcesQuery.isError ? (
          <div className={styles['stateBox']}>
            {resourcesQuery.error instanceof Error
              ? resourcesQuery.error.message
              : '자료실을 불러오지 못했습니다.'}
          </div>
        ) : null}

        {!resourcesQuery.isPending && !resourcesQuery.isError ? (
          <>
            <div className={styles['tableWrap']}>
              <table className={styles['boardTable']}>
                <colgroup>
                  <col className={styles['numberCol']} />
                  <col className={styles['typeCol']} />
                  <col />
                  <col className={styles['fileCol']} />
                  <col className={styles['dateCol']} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope='col'>번호</th>
                    <th scope='col'>구분</th>
                    <th scope='col'>제목</th>
                    <th scope='col'>파일</th>
                    <th scope='col'>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResources.length ? (
                    paginatedResources.map((resource, index) => {
                      const rowNumber =
                        filteredResources.length - ((currentPage - 1) * PAGE_SIZE + index);
                      const isDownloading = downloadingId === resource.id && downloadMutation.isPending;

                      return (
                        <tr className={styles['resourceRow']} key={resource.id}>
                          <td>{String(rowNumber)}</td>
                          <td>
                            <span className={styles['typeBadge']}>
                              {resource.scope === 'GLOBAL' ? '공개' : '과정'}
                            </span>
                          </td>
                          <td className={styles['titleCell']}>
                            <div className={styles['titleBlock']}>
                              <strong className={styles['titleText']}>{resource.title}</strong>
                              <p className={styles['previewText']}>{buildPreview(resource.description)}</p>
                            </div>
                          </td>
                          <td>
                            <button
                              className={styles['downloadButton']}
                              disabled={isDownloading}
                              onClick={() => {
                                void handleDownload(resource.id);
                              }}
                              type='button'
                            >
                              {isDownloading ? '준비 중...' : `${resource.fileName} (${formatFileSize(resource.fileSize)})`}
                            </button>
                          </td>
                          <td>{formatDate(resource.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['emptyRow']} colSpan={5}>
                        검색 조건에 맞는 자료가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles['boardFooter']}>
              <div className={styles['pagination']}>
                <button
                  className={styles['pageNavButton']}
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  type='button'
                >
                  {'<'}
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                  return (
                    <button
                      className={styles['pageButton']}
                      data-active={pageNumber === currentPage}
                      key={pageNumber}
                      onClick={() => {
                        setCurrentPage(pageNumber);
                      }}
                      type='button'
                    >
                      {String(pageNumber)}
                    </button>
                  );
                })}

                <button
                  className={styles['pageNavButton']}
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  type='button'
                >
                  {'>'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default ResourcesPage;
