import { useId, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { useGlobalResourcesQuery } from '@/query/useResourceQueries';
import { routePaths } from '@/routes/routeRegistry';

import styles from './ResourcesPage.module.scss';

const PAGE_SIZE = 10;
const MAX_VISIBLE_PAGE_COUNT = 5;

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(year)}. ${month}. ${day}`;
};

const getVisiblePageNumbers = (currentPage: number, totalPages: number): number[] => {
  const visibleCount = Math.min(MAX_VISIBLE_PAGE_COUNT, totalPages);
  const halfWindow = Math.floor(visibleCount / 2);
  const startPage = Math.min(
    Math.max(1, currentPage - halfWindow),
    Math.max(1, totalPages - visibleCount + 1),
  );

  return Array.from({ length: visibleCount }, (_, index) => startPage + index);
};

const ResourcesPage = () => {
  const searchInputId = useId();
  const resourcesQuery = useGlobalResourcesQuery();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const resources = useMemo(() => {
    return (resourcesQuery.data ?? []).filter((resource) => resource.visibility !== 'HIDDEN');
  }, [resourcesQuery.data]);

  const filteredResources = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return resources;
    }

    return resources.filter((resource) => {
      const searchableFields = [
        resource.title,
        resource.description,
        ...resource.attachments.map((attachment) => attachment.fileName),
      ];

      return searchableFields.some((field) => {
        if (typeof field !== 'string') {
          return false;
        }

        return field.toLowerCase().includes(normalizedSearchTerm);
      });
    });
  }, [resources, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const visiblePageNumbers = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className={styles['page']}>
      <header className={styles['boardHeader']}>
        <h1 className={styles['boardTitle']}>자료실</h1>
        <p className={styles['boardSummary']}>
          총 <strong>{String(resources.length)}</strong>건의 자료
        </p>

        <form
          className={styles['searchForm']}
          onSubmit={(event) => {
            event.preventDefault();
            setSearchTerm(searchInput);
            setPage(1);
          }}
        >
          <label className={styles['srOnly']} htmlFor={searchInputId}>
            자료실 검색
          </label>
          <input
            autoComplete='off'
            className={styles['searchInput']}
            id={searchInputId}
            name='q'
            onChange={(event) => {
              setSearchInput(event.currentTarget.value);
            }}
            placeholder='제목 또는 내용을 검색해 주세요.'
            type='search'
            value={searchInput}
          />
          <button aria-label='검색' className={styles['searchButton']} type='submit'>
            <svg
              aria-hidden='true'
              className={styles['searchIcon']}
              fill='none'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
              />
              <path
                d='M21.0004 21.0004L16.6504 16.6504'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
              />
            </svg>
          </button>
        </form>
      </header>

      <main className={styles['boardShell']}>
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
                  <col />
                  <col className={styles['attachmentCol']} />
                  <col className={styles['dateCol']} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope='col'>번호</th>
                    <th scope='col'>제목</th>
                    <th scope='col'>첨부</th>
                    <th scope='col'>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResources.length ? (
                    paginatedResources.map((resource, index) => {
                      const rowNumber =
                        filteredResources.length - ((currentPage - 1) * PAGE_SIZE + index);

                      return (
                        <tr className={styles['resourceRow']} key={resource.id}>
                          <td>{String(rowNumber)}</td>
                          <td className={styles['titleCell']}>
                            <Link
                              aria-label={resource.title}
                              className={styles['titleLink']}
                              to={routePaths.resourceDetail(resource.publicSlug)}
                            >
                              <span className={styles['titleText']}>{resource.title}</span>
                            </Link>
                          </td>
                          <td>
                            <span className={styles['attachmentCount']}>
                              첨부 <strong>{String(resource.attachments.length)}</strong>
                            </span>
                          </td>
                          <td>{formatDate(resource.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['emptyRow']} colSpan={4}>
                        검색 조건에 맞는 자료가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <nav aria-label='자료실 페이지 이동' className={styles['pagination']}>
              <button
                aria-label='이전 페이지'
                className={styles['pageNavButton']}
                disabled={currentPage === 1}
                onClick={() => {
                  setPage((value) => Math.max(1, value - 1));
                }}
                type='button'
              >
                <svg
                  aria-hidden='true'
                  className={styles['pageNavIcon']}
                  fill='none'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M15 18L9 12L15 6'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='3'
                  />
                </svg>
              </button>

              {visiblePageNumbers.map((pageNumber) => {
                return (
                  <button
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    className={styles['pageButton']}
                    data-active={pageNumber === currentPage}
                    key={pageNumber}
                    onClick={() => {
                      setPage(pageNumber);
                    }}
                    type='button'
                  >
                    {String(pageNumber)}
                  </button>
                );
              })}

              <button
                aria-label='다음 페이지'
                className={styles['pageNavButton']}
                disabled={currentPage === totalPages}
                onClick={() => {
                  setPage((value) => Math.min(totalPages, value + 1));
                }}
                type='button'
              >
                <svg
                  aria-hidden='true'
                  className={styles['pageNavIcon']}
                  fill='none'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M9 18L15 12L9 6'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='3'
                  />
                </svg>
              </button>
            </nav>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default ResourcesPage;
