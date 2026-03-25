import { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { useGlobalNoticesQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';

import styles from './NoticesPage.module.scss';

type NoticeFilter = 'all' | 'pinned' | 'popup' | 'general';

const PAGE_SIZE = 8;

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
  }).format(new Date(value));
};

const buildSummary = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 88) {
    return normalized;
  }

  return `${normalized.slice(0, 88)}...`;
};

const NoticesPage = () => {
  const noticesQuery = useGlobalNoticesQuery();
  const notices = noticesQuery.data ?? [];
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<NoticeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredNotices = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return notices.filter((notice) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'pinned' ? notice.pinned : filter === 'popup' ? notice.popup : !notice.pinned && !notice.popup);

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      return [notice.title, notice.content, notice.programTitle ?? ''].some((field) => {
        return field.toLowerCase().includes(normalizedSearchTerm);
      });
    });
  }, [filter, notices, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));
  const paginatedNotices = filteredNotices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className={styles['page']}>
      <div className={styles['boardHeader']}>
        <div className={styles['boardTitleBlock']}>
          <p className={styles['boardEyebrow']}>SONOSCHOOL NOTICE</p>
          <h1 className={styles['boardTitle']}>공지사항</h1>
        </div>
        <p className={styles['boardSummary']}>
          총 {String(notices.length)}건 중 검색 결과 {String(filteredNotices.length)}건
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
              aria-label='공지 상태 필터'
              className={styles['filterSelect']}
              onChange={(event) => {
                setFilter(event.target.value as NoticeFilter);
                setCurrentPage(1);
              }}
              value={filter}
            >
              <option value='all'>전체</option>
              <option value='pinned'>필독</option>
              <option value='popup'>팝업</option>
              <option value='general'>일반</option>
            </select>

            <input
              className={styles['searchInput']}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              placeholder='제목과 내용을 검색해 주세요.'
              type='search'
              value={searchInput}
            />

            <button className={styles['searchButton']} type='submit'>
              검색
            </button>
          </form>
        </div>

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
          <>
            <div className={styles['tableWrap']}>
              <table className={styles['boardTable']}>
                <colgroup>
                  <col className={styles['numberCol']} />
                  <col className={styles['statusCol']} />
                  <col />
                  <col className={styles['dateCol']} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope='col'>번호</th>
                    <th scope='col'>상태</th>
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
                          <td>
                            <div className={styles['statusGroup']}>
                              {notice.pinned ? (
                                <span className={styles['statusBadge']} data-tone='pinned'>
                                  필독
                                </span>
                              ) : null}
                              {notice.popup ? (
                                <span className={styles['statusBadge']} data-tone='popup'>
                                  팝업
                                </span>
                              ) : null}
                              {!notice.pinned && !notice.popup ? (
                                <span className={styles['statusBadge']} data-tone='general'>
                                  일반
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className={styles['titleCell']}>
                            <Link
                              className={styles['titleLink']}
                              to={routePaths.noticeDetail(String(notice.id))}
                            >
                              <span className={styles['titleText']}>{notice.title}</span>
                              <span className={styles['previewText']}>{buildSummary(notice.content)}</span>
                            </Link>
                          </td>
                          <td>{formatDate(notice.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['emptyRow']} colSpan={4}>
                        검색 조건에 맞는 공지사항이 없습니다.
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

export default NoticesPage;
