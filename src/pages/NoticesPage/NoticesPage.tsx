import { useId, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { useGlobalNoticesQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';
import { extractTextFromHtml } from '@/utils/htmlContent';

import styles from './NoticesPage.module.scss';

const PAGE_SIZE = 8;
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

const NoticesPage = () => {
  const searchInputId = useId();
  const noticesQuery = useGlobalNoticesQuery();
  const notices = useMemo(() => noticesQuery.data ?? [], [noticesQuery.data]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const filteredNotices = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return notices.filter((notice) => {
      if (!normalizedSearchTerm) {
        return true;
      }

      return [notice.title, extractTextFromHtml(notice.content), notice.programTitle ?? ''].some(
        (field) => {
          return field.toLowerCase().includes(normalizedSearchTerm);
        },
      );
    });
  }, [notices, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedNotices = filteredNotices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const visiblePageNumbers = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className={styles['page']}>
      <header className={styles['boardHeader']}>
        <h1 className={styles['boardTitle']}>공지사항</h1>
        <p className={styles['boardSummary']}>
          총 <strong>{String(notices.length)}</strong>건의 공지사항
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
            공지사항 검색
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
        <div className={styles['tableWrap']}>
          {noticesQuery.isPending ? (
            <div aria-busy='true' className={styles['stateBox']}>
              공지사항을 불러오는 중입니다.
            </div>
          ) : null}

          {noticesQuery.isError ? (
            <div className={styles['stateBox']}>
              {noticesQuery.error instanceof Error
                ? noticesQuery.error.message
                : '공지사항을 불러오지 못했습니다.'}
            </div>
          ) : null}

          {!noticesQuery.isPending && !noticesQuery.isError ? (
            <table className={styles['boardTable']}>
              <colgroup>
                <col className={styles['numberCol']} />
                <col />
                <col className={styles['dateCol']} />
              </colgroup>
              <thead>
                <tr>
                  <th scope='col'>번호</th>
                  <th scope='col'>제목</th>
                  <th scope='col'>등록일</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotices.length ? (
                  paginatedNotices.map((notice, index) => {
                    const rowNumber =
                      filteredNotices.length - ((currentPage - 1) * PAGE_SIZE + index);

                    return (
                      <tr className={styles['noticeRow']} key={notice.id}>
                        <td>{String(rowNumber)}</td>
                        <td className={styles['titleCell']}>
                          <Link
                            className={styles['titleLink']}
                            to={routePaths.noticeDetail(notice.publicSlug)}
                          >
                            {notice.pinned ? (
                              <span className={styles['statusBadge']} data-tone='pinned'>
                                필독
                              </span>
                            ) : null}
                            <span className={styles['titleText']}>{notice.title}</span>
                          </Link>
                        </td>
                        <td>{formatDate(notice.createdAt)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className={styles['emptyRow']} colSpan={3}>
                      검색 조건에 맞는 공지사항이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : null}
        </div>

        {!noticesQuery.isPending && !noticesQuery.isError ? (
          <nav aria-label='공지사항 페이지 이동' className={styles['pagination']}>
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
        ) : null}
      </main>
    </div>
  );
};

export default NoticesPage;
